import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { Portal, Snackbar, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastIntent = "success" | "error" | "info";

type ShowToastOptions = {
	intent?: ToastIntent;
	duration?: number;
};

type ToastState = {
	visible: boolean;
	message: string;
	intent: ToastIntent;
	duration: number;
};

type AppToastContextValue = {
	showToast: (message: string, options?: ShowToastOptions) => void;
	showSuccess: (message: string, duration?: number) => void;
	showError: (message: string, duration?: number) => void;
	showInfo: (message: string, duration?: number) => void;
};

const DEFAULT_DURATION = 2200;

const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const [state, setState] = useState<ToastState>({
		visible: false,
		message: "",
		intent: "info",
		duration: DEFAULT_DURATION,
	});

	const showToast = useCallback((message: string, options?: ShowToastOptions) => {
		const safeMessage = String(message ?? "").trim();
		if (!safeMessage) return;

		setState({
			visible: true,
			message: safeMessage,
			intent: options?.intent ?? "info",
			duration: options?.duration ?? DEFAULT_DURATION,
		});
	}, []);

	const hideToast = useCallback(() => {
		setState((prev) => ({ ...prev, visible: false }));
	}, []);

	const contextValue = useMemo<AppToastContextValue>(
		() => ({
			showToast,
			showSuccess: (message, duration) => showToast(message, { intent: "success", duration }),
			showError: (message, duration) => showToast(message, { intent: "error", duration }),
			showInfo: (message, duration) => showToast(message, { intent: "info", duration }),
		}),
		[showToast],
	);

	const containerColor = theme.colors.inverseSurface;
	const textColor = theme.colors.inverseOnSurface;

	return (
		<AppToastContext.Provider value={contextValue}>
			{children}
			<Portal>
				<Snackbar
					visible={state.visible}
					onDismiss={hideToast}
					duration={state.duration}
					wrapperStyle={{
						position: "absolute",
						top: insets.top + 8,
					}}
					style={{
						backgroundColor: containerColor,
						borderRadius: 12,
						marginHorizontal: 16,
					}}
					theme={{ colors: { inverseOnSurface: textColor } }}
				>
					{state.message}
				</Snackbar>
			</Portal>
		</AppToastContext.Provider>
	);
}

export function useAppToast(): AppToastContextValue {
	const ctx = useContext(AppToastContext);
	if (!ctx) throw new Error("useAppToast must be used within AppToastProvider");
	return ctx;
}
