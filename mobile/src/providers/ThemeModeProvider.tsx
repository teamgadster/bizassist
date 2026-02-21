// path: src/providers/ThemeModeProvider.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { DisplayMode } from "@/lib/storage/themeModeStorage";
import { getDisplayMode, setDisplayMode as persistDisplayMode } from "@/lib/storage/themeModeStorage";

type ThemeModeContextValue = {
	mode: DisplayMode;
	setMode: (mode: DisplayMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setModeState] = useState<DisplayMode>(() => getDisplayMode());

	const setMode = useCallback((next: DisplayMode) => {
		setModeState(next);
		persistDisplayMode(next);
	}, []);

	const value = useMemo<ThemeModeContextValue>(() => ({ mode, setMode }), [mode, setMode]);

	return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeContextValue {
	const ctx = useContext(ThemeModeContext);
	if (!ctx) throw new Error("useThemeMode must be used within ThemeModeProvider");
	return ctx;
}
