// path: src/providers/AppBusyProvider.tsx
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";

import LoadingOverlay from "@/components/system/LoadingOverlay";

export type BusyState = {
	isBusy: boolean;
	message?: string;
	submessage?: string;
};

/**
 * Token-based ownership prevents operation #1 from clearing the overlay
 * for operation #2 (double-taps, parallel requests, etc.).
 */
type AppBusyContextValue = {
	busy: BusyState;
	setBusy: (state: BusyState) => void;
	beginBusy: (message: string, submessage?: string) => string; // returns token
	endBusy: (token: string) => void;
	withBusy: <T>(message: string, fn: () => Promise<T>, opts?: { submessage?: string }) => Promise<T>;
};

const AppBusyContext = createContext<AppBusyContextValue | null>(null);

function createToken(): string {
	return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function AppBusyProvider({ children }: { children: ReactNode }) {
	const [busy, setBusyState] = useState<BusyState>({ isBusy: false });
	const ownerTokenRef = useRef<string | null>(null);

	const setBusy = useCallback((state: BusyState) => {
		if (state.isBusy) {
			const token = createToken();
			ownerTokenRef.current = token;
			setBusyState({ isBusy: true, message: state.message, submessage: state.submessage });
			return;
		}

		// Clear regardless of token (manual escape hatch). Prefer endBusy(token) in new code.
		ownerTokenRef.current = null;
		setBusyState({ isBusy: false });
	}, []);

	const beginBusy = useCallback((message: string, submessage?: string) => {
		const token = createToken();
		ownerTokenRef.current = token;
		setBusyState({ isBusy: true, message, submessage });
		return token;
	}, []);

	const endBusy = useCallback((token: string) => {
		// Only the current owner can clear the overlay.
		if (ownerTokenRef.current !== token) return;

		ownerTokenRef.current = null;
		setBusyState({ isBusy: false });
	}, []);

	const withBusy = useCallback(
		async <T,>(message: string, fn: () => Promise<T>, opts?: { submessage?: string }): Promise<T> => {
			const token = beginBusy(message, opts?.submessage);
			try {
				return await fn();
			} finally {
				endBusy(token);
			}
		},
		[beginBusy, endBusy],
	);

	// Hard block Android back while busy (prevents accidental nav/gesture escapes).
	useEffect(() => {
		if (!busy.isBusy) return;

		const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
		return () => sub.remove();
	}, [busy.isBusy]);

	// Dev-only stuck-state warning (does not auto-clear in production).
	useEffect(() => {
		if (!__DEV__) return;
		if (!busy.isBusy) return;

		const token = ownerTokenRef.current;
		const t = setTimeout(() => {
			console.warn(
				`[AppBusy] Busy state active for > 90s. message="${busy.message ?? ""}" token="${token ?? ""}". ` +
					`This usually indicates a leaked busy-state (missing finally/endBusy).`,
			);
		}, 90_000);

		return () => clearTimeout(t);
	}, [busy.isBusy, busy.message]);

	const value: AppBusyContextValue = useMemo(
		() => ({
			busy,
			setBusy,
			beginBusy,
			endBusy,
			withBusy,
		}),
		[busy, setBusy, beginBusy, endBusy, withBusy],
	);

	return (
		<AppBusyContext.Provider value={value}>
			{children}
			<LoadingOverlay visible={busy.isBusy} message={busy.message} submessage={busy.submessage} />
		</AppBusyContext.Provider>
	);
}

export function useAppBusy(): AppBusyContextValue {
	const ctx = useContext(AppBusyContext);
	if (!ctx) throw new Error("useAppBusy must be used within AppBusyProvider");
	return ctx;
}
