// path: app/(app)/(tabs)/inventory/scan.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, AppState, type AppStateStatus } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton } from "@/components/ui/BAICTAButton";
import {
	openAppSettings,
	requestCameraAccessWith,
	type PermissionFlowState,
} from "@/modules/inventory/inventory.permissions";

/**
 * Canonical: Inventory search consumes query param "q"
 * (works for both phone + tablet screens via useLocalSearchParams)
 */
const RETURN_TO = "/inventory" as const;
const SCANNED_BARCODE_KEY = "scannedBarcode" as const;

function normalizeScanValue(raw: string): string {
	return raw.trim().replace(/\s+/g, " ");
}

export default function InventoryScanScreen() {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<{ returnTo?: string; draftId?: string }>();
	const returnTo = useMemo(() => {
		const raw = typeof params.returnTo === "string" ? params.returnTo.trim() : "";
		return raw.startsWith("/") ? raw : null;
	}, [params.returnTo]);
	const returnDraftId = useMemo(() => {
		const raw = typeof params.draftId === "string" ? params.draftId.trim() : "";
		return raw || null;
	}, [params.draftId]);

	const [permission, requestPermission] = useCameraPermissions();
	const [permissionHint, setPermissionHint] = useState<string>("");

	const lockRef = useRef(false);
	const [lockedUI, setLockedUI] = useState(false);

	const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setLocked = useCallback((v: boolean) => {
		lockRef.current = v;
		setLockedUI(v);
	}, []);

	const unlockSafetyTimer = useCallback(() => {
		if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
		unlockTimerRef.current = setTimeout(() => {
			setLocked(false);
		}, 1500);
	}, [setLocked]);

	useEffect(() => {
		if (!permission) return;
		if (!permission.granted && permission.canAskAgain !== false) requestPermission().catch(() => {});
	}, [permission, requestPermission]);

	const onRequestCameraPermission = useCallback(async () => {
		const state: PermissionFlowState = await requestCameraAccessWith(requestPermission);
		if (state === "granted") {
			setPermissionHint("");
			return;
		}

		if (state === "blocked") {
			setPermissionHint("Camera access is blocked. Open Settings to allow camera access for BizAssist.");
			return;
		}

		setPermissionHint("Camera permission is required to scan barcodes.");
	}, [requestPermission]);

	const onOpenSettings = useCallback(async () => {
		const opened = await openAppSettings();
		if (opened) return;
		setPermissionHint("Unable to open Settings right now. Please open Settings and allow camera access for BizAssist.");
	}, []);

	useEffect(() => {
		const onAppStateChange = (state: AppStateStatus) => {
			if (state === "active") setLocked(false);
		};
		const sub = AppState.addEventListener("change", onAppStateChange);
		return () => sub.remove();
	}, [setLocked]);

	useEffect(() => {
		return () => {
			if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
		};
	}, []);

	const onCancel = useCallback(() => {
		setLocked(false);
		if (returnTo) {
			router.replace({
				pathname: returnTo as any,
				params: returnDraftId ? { draftId: returnDraftId } : undefined,
			} as any);
			return;
		}
		router.replace(RETURN_TO as any);
	}, [returnDraftId, returnTo, router, setLocked]);

	const onScanned = useCallback(
		({ data }: { data: string }) => {
			if (!data) return;

			const value = normalizeScanValue(data);
			if (!value) return;

			if (lockRef.current) return;
			setLocked(true);
			unlockSafetyTimer();

			if (returnTo) {
				router.replace({
					pathname: returnTo as any,
					params: {
						...(returnDraftId ? { draftId: returnDraftId } : {}),
						[SCANNED_BARCODE_KEY]: value,
					},
				} as any);
				return;
			}

			router.replace({
				pathname: RETURN_TO,
				params: { q: value },
			});
		},
		[returnDraftId, returnTo, router, setLocked, unlockSafetyTimer],
	);

	if (!permission) {
		return (
			<BAIScreen padded={false} contentContainerStyle={styles.center}>
				<BAISurface style={styles.card}>
					<BAIText variant='subtitle'>Preparing camera…</BAIText>
					<BAIText variant='body' muted>
						One moment.
					</BAIText>

					<View style={styles.actions}>
						<BAIButton mode='outlined' onPress={onCancel} shape='pill' widthPreset='standard' intent='neutral'>
							Cancel
						</BAIButton>
					</View>
				</BAISurface>
			</BAIScreen>
		);
	}

	if (!permission.granted) {
		const isPermissionBlocked = permission.canAskAgain === false;
		const permissionMessage =
			permissionHint ||
			(isPermissionBlocked
				? "Camera access is blocked. Open Settings to allow camera access for scanning."
				: "Enable camera access to scan barcodes.");

		return (
			<BAIScreen padded={false} safeTop={false} safeBottom={false} contentContainerStyle={styles.center}>
				<BAISurface style={styles.card}>
					<BAIText variant='subtitle'>Camera permission required</BAIText>
					<BAIText variant='body' muted>
						{permissionMessage}
					</BAIText>

					<View style={styles.actions}>
						<BAICTAButton onPress={onRequestCameraPermission}>Allow Camera</BAICTAButton>
						{isPermissionBlocked ? (
							<BAIButton mode='outlined' onPress={onOpenSettings} shape='pill' widthPreset='standard' intent='primary'>
								Open Settings
							</BAIButton>
						) : null}
						<BAIButton mode='outlined' onPress={onCancel} shape='pill' widthPreset='standard' intent='neutral'>
							Cancel
						</BAIButton>
					</View>
				</BAISurface>
			</BAIScreen>
		);
	}

	return (
		<BAIScreen padded={false} safeTop={false} safeBottom={false} style={styles.root}>
			<View style={[styles.full, { backgroundColor: theme.colors.background }]}>
				<View style={styles.preview}>
					<CameraView
						style={StyleSheet.absoluteFill}
						facing='back'
						barcodeScannerSettings={{
							barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
						}}
						onBarcodeScanned={lockedUI ? undefined : onScanned}
					/>

					<View style={styles.overlayContainer} pointerEvents='box-none'>
						{/* Top bar */}
						<View style={styles.topBar} pointerEvents='box-none'>
							<BAISurface style={styles.topBarCard}>
								<BAIText variant='subtitle'>{lockedUI ? "Captured" : "Scan barcode"}</BAIText>
								<BAIText variant='caption' muted>
									{lockedUI ? "Returning to Inventory…" : "Align the barcode within the frame."}
								</BAIText>
							</BAISurface>

							<BAIButton
								mode='outlined'
								onPress={onCancel}
								disabled={lockedUI}
								shape='pill'
								widthPreset='standard'
								intent='neutral'
							>
								Close
							</BAIButton>
						</View>

						{/* Centered scan window (no dim overlay) */}
						<View style={styles.scanStage} pointerEvents='none'>
							<View style={styles.scanWindow}>
								<View style={styles.cornerTL} />
								<View style={styles.cornerTR} />
								<View style={styles.cornerBL} />
								<View style={styles.cornerBR} />
							</View>
						</View>
					</View>
				</View>
			</View>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	overlayContainer: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 12,
		flexDirection: "column",
	},
	// Top bar
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	topBarCard: {
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexShrink: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
	},
	// Scan stage
	scanStage: {
		flex: 1,
		justifyContent: "flex-start",
		alignItems: "center",
		paddingTop: 120,
	},
	scanWindow: {
		width: 280,
		height: 280,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.25)",
		backgroundColor: "rgba(255,255,255,0.06)",
		overflow: "hidden",
	},
	// Corners (professional frame)
	cornerTL: {
		position: "absolute",
		left: 14,
		top: 14,
		width: 28,
		height: 28,
		borderLeftWidth: 3,
		borderTopWidth: 3,
		borderColor: "rgba(255,255,255,0.9)",
		borderTopLeftRadius: 8,
	},
	cornerTR: {
		position: "absolute",
		right: 14,
		top: 14,
		width: 28,
		height: 28,
		borderRightWidth: 3,
		borderTopWidth: 3,
		borderColor: "rgba(255,255,255,0.9)",
		borderTopRightRadius: 8,
	},
	cornerBL: {
		position: "absolute",
		left: 14,
		bottom: 14,
		width: 28,
		height: 28,
		borderLeftWidth: 3,
		borderBottomWidth: 3,
		borderColor: "rgba(255,255,255,0.9)",
		borderBottomLeftRadius: 8,
	},
	cornerBR: {
		position: "absolute",
		right: 14,
		bottom: 14,
		width: 28,
		height: 28,
		borderRightWidth: 3,
		borderBottomWidth: 3,
		borderColor: "rgba(255,255,255,0.9)",
		borderBottomRightRadius: 8,
	},
	// Bottom sheet
	bottomSheet: {
		marginTop: "auto",
	},
	bottomCard: {
		padding: 12,
		gap: 10,
	},
	bottomActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	root: { flex: 1 },
	full: { flex: 1 },
	preview: { flex: 1 },
	center: { flexGrow: 1, padding: 16, alignItems: "center", justifyContent: "center" },
	card: { width: "100%", maxWidth: 520, padding: 14, gap: 10 },
	actions: { gap: 10, marginTop: 6 },
});
