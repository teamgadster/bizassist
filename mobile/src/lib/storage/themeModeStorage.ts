// path: src/lib/storage/themeModeStorage.ts

import { tokenStorage } from "@/lib/storage/mmkv";

export type DisplayMode = "system" | "light" | "dark";

const KEY = "ui.displayMode";

export function getDisplayMode(): DisplayMode {
	const v = tokenStorage.getString(KEY);
	if (v === "light" || v === "dark" || v === "system") return v;
	return "system";
}

export function setDisplayMode(mode: DisplayMode): void {
	tokenStorage.set(KEY, mode);
}

export function clearDisplayMode(): void {
	// ✅ MMKV uses `remove`, NOT `delete`
	tokenStorage.remove(KEY);
}
