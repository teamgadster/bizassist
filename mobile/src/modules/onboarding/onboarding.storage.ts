// path: src/modules/onboarding/onboarding.storage.ts

import { MMKVKeys, storage } from "@/lib/storage/mmkv";

/**
 * Mark onboarding as completed so we don't show it again
 * unless storage is cleared or the app is reinstalled.
 */
export function markOnboardingCompleted(): void {
	storage.set(MMKVKeys.onboardingCompleted, true);
}

/**
 * Check if onboarding has already been completed on this device.
 */
export function hasCompletedOnboarding(): boolean {
	return storage.getBoolean(MMKVKeys.onboardingCompleted) === true;
}

/**
 * Optional helper if you ever want to force-show onboarding again.
 */
export function resetOnboardingFlag(): void {
	if (storage.contains(MMKVKeys.onboardingCompleted)) {
		storage.remove(MMKVKeys.onboardingCompleted);
	}
}
