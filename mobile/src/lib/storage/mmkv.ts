// path: src/lib/storage/mmkv.ts
import Constants from "expo-constants";
import type { MMKV } from "react-native-mmkv";

const isExpoGo = Constants.appOwnership === "expo";

type MMKVLike = {
	set: (key: string, value: string | number | boolean) => void;
	getString: (key: string) => string | undefined;
	getNumber: (key: string) => number | undefined;
	getBoolean: (key: string) => boolean | undefined;
	remove: (key: string) => void;
	clearAll: () => void;
	contains: (key: string) => boolean;
};

function createMemoryStore(): MMKVLike {
	const store = new Map<string, string | number | boolean>();

	return {
		set: (key, value) => {
			store.set(key, value);
		},
		getString: (key) => {
			const v = store.get(key);
			return typeof v === "string" ? v : undefined;
		},
		getNumber: (key) => {
			const v = store.get(key);
			return typeof v === "number" ? v : undefined;
		},
		getBoolean: (key) => {
			const v = store.get(key);
			return typeof v === "boolean" ? v : undefined;
		},
		remove: (key) => {
			store.delete(key);
		},
		clearAll: () => {
			store.clear();
		},
		contains: (key) => store.has(key),
	};
}

function createRealMMKV(config: { id: string; encryptionKey?: string }): MMKVLike {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { createMMKV } = require("react-native-mmkv") as {
		createMMKV: (cfg: { id: string; encryptionKey?: string }) => MMKV;
	};

	const instance = createMMKV(config);

	return {
		set: (key, value) => instance.set(key, value),
		getString: (key) => instance.getString(key) ?? undefined,
		getNumber: (key) => instance.getNumber(key) ?? undefined,
		getBoolean: (key) => instance.getBoolean(key) ?? undefined,
		remove: (key) => instance.remove(key),
		clearAll: () => {
			instance.clearAll();
		},
		contains: (key) => instance.contains(key),
	};
}

export const storage: MMKVLike = isExpoGo ? createMemoryStore() : createRealMMKV({ id: "bizassist-storage" });

export const tokenStorage: MMKVLike = isExpoGo
	? createMemoryStore()
	: createRealMMKV({
			id: "bizassist-token-storage",
			encryptionKey: "bizassist_secure_v1",
		});

export function createUserStorage(userId: string): MMKVLike {
	return isExpoGo
		? createMemoryStore()
		: createRealMMKV({
				id: `bizassist-user-${userId}`,
			});
}

export const MMKVKeys = {
	onboardingCompleted: "onboarding.completed",

	authAccessToken: "auth.accessToken",
	authRefreshToken: "auth.refreshToken",

	activeBusinessId: "active.businessId",

	/**
	 * Canonical Display Mode storage (masterplan):
	 * settings.displayMode = "system" | "light" | "dark"
	 */
	displayMode: "settings.displayMode",

	/**
	 * Legacy keys kept for backward-compatible reads/migrations.
	 * Do not write new values to these.
	 */
	legacyAppearanceDisplayMode: "appearance.displayMode",
	legacyUiTheme: "ui.theme",

	// Onboarding: country/currency/timezone draft
	businessSettingsDraft: "onboarding.businessSettingsDraft",
} as const;

export const mmkv = {
	getString: (key: string): string | undefined => storage.getString(key),
	getNumber: (key: string): number | undefined => storage.getNumber(key),
	getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),

	set: (key: string, value: string | number | boolean): void => {
		storage.set(key, value);
	},

	setToken: (key: string, value: string): void => {
		tokenStorage.set(key, value);
	},
	getToken: (key: string): string | undefined => tokenStorage.getString(key),
	removeToken: (key: string): void => {
		tokenStorage.remove(key);
	},

	remove: (key: string): void => {
		storage.remove(key);
	},
	clearAll: (): void => {
		storage.clearAll();
	},
	clearTokens: (): void => {
		tokenStorage.clearAll();
	},

	contains: (key: string): boolean => storage.contains(key),
};
