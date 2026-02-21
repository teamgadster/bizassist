// path: src/providers/BAIAppProviders.tsx
// NOTE: Refactor objectives
// - Keep the useDisplayMode hook canonical
// - Apply high-contrast StatusBar globally (light bg -> dark-content, dark bg -> light-content)
// - Keep provider order stable: DisplayMode -> SafeArea -> Paper -> QueryClient -> AppBusy
// - Make persistence resilient and non-blocking
// - Enforce orientation governance: Phone = portrait-only, Tablet = portrait + landscape

import { QueryClientProvider } from "@tanstack/react-query";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import { queryClient } from "@/lib/queryClient";
import { storage } from "@/lib/storage/mmkv";
import { AppBusyProvider } from "@/providers/AppBusyProvider";
import { AppToastProvider } from "@/providers/AppToastProvider";
import { baiDarkTheme, baiLightTheme } from "@/theme/baiTheme";

// Display mode preference (persisted).
export type DisplayMode = "light" | "dark" | "system";

type DisplayModeContextValue = {
	displayMode: DisplayMode;
	setDisplayMode: (mode: DisplayMode) => void;
	colorScheme: "light" | "dark"; // resolved scheme actually applied
};

const DISPLAY_MODE_KEY = "appearance.displayMode";

const DisplayModeContext = createContext<DisplayModeContextValue | undefined>(undefined);

function isDisplayMode(x: unknown): x is DisplayMode {
	return x === "light" || x === "dark" || x === "system";
}

function getInitialDisplayMode(): DisplayMode {
	try {
		const saved = storage.getString(DISPLAY_MODE_KEY);
		if (isDisplayMode(saved)) return saved;
		// Backward-compat: prior builds used "google" as a variant of system.
		if (saved === "google") return "system";
	} catch {
		// Non-fatal: fall back to system
	}
	return "system";
}

type Props = {
	children: ReactNode;
};

export function BAIAppProviders({ children }: Props) {
	const systemScheme = useNativeColorScheme(); // "light" | "dark" | null
	const { isTablet } = useResponsiveLayout();

	const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => getInitialDisplayMode());

	const setDisplayMode = useCallback((mode: DisplayMode) => {
		setDisplayModeState(mode);

		// Persist best-effort; never block UI.
		try {
			storage.set(DISPLAY_MODE_KEY, mode);
		} catch {
			// Non-fatal
		}
	}, []);

	const resolvedScheme: "light" | "dark" = useMemo(() => {
		// Apply user preference. "system" follows the OS.
		if (displayMode === "light") return "light";
		if (displayMode === "dark") return "dark";
		return systemScheme === "dark" ? "dark" : "light";
	}, [displayMode, systemScheme]);

	const theme = useMemo(() => {
		return resolvedScheme === "dark" ? baiDarkTheme : baiLightTheme;
	}, [resolvedScheme]);

	// Global high-contrast status bar rule:
	// light background -> dark-content, dark background -> light-content
	const statusBarStyle = useMemo(() => {
		return theme.dark ? "light" : "dark";
	}, [theme.dark]);

	const contextValue = useMemo<DisplayModeContextValue>(
		() => ({
			displayMode,
			setDisplayMode,
			colorScheme: resolvedScheme,
		}),
		[displayMode, setDisplayMode, resolvedScheme],
	);

	// Orientation governance:
	// - Phone: portrait-only
	// - Tablet: allow portrait + landscape
	useEffect(() => {
		(async () => {
			try {
				if (isTablet) {
					await ScreenOrientation.unlockAsync();
				} else {
					await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
				}
			} catch {
				// Non-fatal: never crash the app for orientation enforcement.
			}
		})();
	}, [isTablet]);

	return (
		<DisplayModeContext.Provider value={contextValue}>
			<SafeAreaProvider>
				<PaperProvider theme={theme}>
					<StatusBar style={statusBarStyle} />
					<QueryClientProvider client={queryClient}>
						<AppToastProvider>
							<AppBusyProvider>{children}</AppBusyProvider>
						</AppToastProvider>
					</QueryClientProvider>
				</PaperProvider>
			</SafeAreaProvider>
		</DisplayModeContext.Provider>
	);
}

export function useDisplayMode(): DisplayModeContextValue {
	const ctx = useContext(DisplayModeContext);
	if (!ctx) throw new Error("useDisplayMode must be used within BAIAppProviders");
	return ctx;
}
