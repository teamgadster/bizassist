import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type PermissionFlowState = "granted" | "denied" | "blocked";

type PermissionLike = {
	granted?: boolean;
	canAskAgain?: boolean;
};

function toPermissionFlowState(permission: PermissionLike): PermissionFlowState {
	if (permission.granted) return "granted";
	if (permission.canAskAgain === false) return "blocked";
	return "denied";
}

export async function requestCameraAccess(): Promise<PermissionFlowState> {
	const permission = await ImagePicker.requestCameraPermissionsAsync();
	return toPermissionFlowState(permission);
}

export async function requestCameraAccessWith(
	requestPermission: (...args: any[]) => Promise<PermissionLike>,
): Promise<PermissionFlowState> {
	const permission = await requestPermission();
	return toPermissionFlowState(permission);
}

export async function requestPhotoLibraryAccess(): Promise<PermissionFlowState> {
	const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
	return toPermissionFlowState(permission);
}

export async function requestMediaLibraryAccess(
	requestPermission: (...args: any[]) => Promise<PermissionLike>,
): Promise<PermissionFlowState> {
	const permission = await requestPermission();
	return toPermissionFlowState(permission);
}

export async function openAppSettings(): Promise<boolean> {
	try {
		await Linking.openSettings();
		return true;
	} catch {
		return false;
	}
}
