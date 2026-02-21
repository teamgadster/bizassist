// src/lib/device/orientationGovernance.ts
import * as ScreenOrientation from "expo-screen-orientation";
import { Platform } from "react-native";

/**
 * Orientation governance
 * - Phone: portrait only
 * - Tablet: allow rotation
 *
 * Platform notes:
 * - iOS iPhone is already constrained in Info.plist.
 * - We primarily enforce this on Android to guarantee behavior parity.
 */
export async function applyOrientationGovernance(isTablet: boolean) {
	if (Platform.OS !== "android") return;

	if (isTablet) {
		await ScreenOrientation.unlockAsync();
		return;
	}

	await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}
