// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/products/pos-tile.phone.tsx
//
// POS Tile Editor (Create Item flow)
// Governance:
// - Process screen (Exit cancels intent).
// - Changes are staged locally until Save.
// - Deterministic return via rootReturnTo param.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Keyboard, Pressable, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIGroupTabs, type BAIGroupTab } from "@/components/ui/BAIGroupTabs";
import { BAITextInput } from "@/components/ui/BAITextInput";

import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import {
	inventoryScopeRoot,
	mapInventoryRouteToScope,
	type InventoryRouteScope,
} from "@/modules/inventory/navigation.scope";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { posTileLabelRegex } from "@/shared/validation/patterns";
import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import { PosTileColorSelector } from "@/modules/inventory/components/PosTileColorSelector";
import {
	DRAFT_ID_KEY,
	LOCAL_URI_KEY,
	POS_TILE_CROP_ROUTE,
	POS_TILE_PHOTO_LIBRARY_ROUTE,
	POS_TILE_ROUTE,
	ROOT_RETURN_TO_KEY,
	RETURN_TO_KEY,
	TILE_LABEL_KEY,
	normalizeReturnTo,
	type PosTileInboundParams,
} from "@/modules/inventory/posTile.contract";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

type PosTileTab = "IMAGE" | "COLOR";
const TABS: BAIGroupTab<PosTileTab>[] = [
	{ label: "Photo", value: "IMAGE" },
	{ label: "Color", value: "COLOR" },
];

function safeString(v: unknown): string {
	return typeof v === "string" ? v : String(v ?? "");
}

type ActionRowProps = {
	icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
	label: string;
	onPress: () => void;
	disabled?: boolean;
	danger?: boolean;
};

function ActionRow({ icon, label, onPress, disabled = false, danger = false }: ActionRowProps) {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const fg = danger ? theme.colors.error : theme.colors.onSurface;
	const muted = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				styles.actionRow,
				{ borderColor },
				pressed && !disabled && { opacity: 0.85 },
				disabled && { opacity: 0.45 },
			]}
		>
			<View style={styles.actionRowLeft}>
				<MaterialCommunityIcons name={icon} size={22} color={disabled ? muted : fg} />
				<BAIText variant='body' style={{ color: disabled ? muted : fg, fontWeight: "600" }}>
					{label}
				</BAIText>
			</View>
		</Pressable>
	);
}

export default function PosTilePhoneScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const rootRoute = useMemo(() => inventoryScopeRoot(routeScope), [routeScope]);
	const posTileRoute = useMemo(() => toScopedRoute(POS_TILE_ROUTE), [toScopedRoute]);

	const params = useLocalSearchParams<PosTileInboundParams>();
	const draftId = safeString(params[DRAFT_ID_KEY]).trim();
	const rootReturnTo =
		normalizeReturnTo(params[ROOT_RETURN_TO_KEY]) ?? normalizeReturnTo(params[RETURN_TO_KEY]) ?? null;
	const inboundTileLabel = safeString(params[TILE_LABEL_KEY]);

	const { draft, patch } = useProductCreateDraft(draftId);

	// --- nav lock (mandatory)
	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);
	const lockNav = useCallback((ms = 650) => {
		if (navLockRef.current) return false;
		navLockRef.current = true;
		setIsNavLocked(true);
		setTimeout(() => {
			navLockRef.current = false;
			setIsNavLocked(false);
		}, ms);
		return true;
	}, []);

	const isUiDisabled = isNavLocked;

	const [tileLabel, setTileLabel] = useState(() => inboundTileLabel || draft.posTileLabel || "");
	const [tileMode, setTileMode] = useState<PosTileTab>("IMAGE");
	const [tileColor, setTileColor] = useState<string | null>(draft.posTileColor ?? null);
	const [tileImageUri, setTileImageUri] = useState(() => (draft.imageLocalUri ?? "").trim());
	const [mediaError, setMediaError] = useState<string | null>(null);
	const tileLabelPlaceholder = useMemo(() => `Optional, Up to ${FIELD_LIMITS.posTileLabel} Characters`, []);

	const incomingLocalUri = useMemo(() => safeString(params[LOCAL_URI_KEY]).trim(), [params]);
	const incomingTileLabelParam = (params as any)?.[TILE_LABEL_KEY];
	const hasIncomingTileLabelKey = incomingTileLabelParam !== undefined;
	const incomingTileLabel = useMemo(() => safeString(incomingTileLabelParam), [incomingTileLabelParam]);

	useEffect(() => {
		if (!incomingLocalUri) return;
		setTileImageUri(incomingLocalUri);
		setTileMode("IMAGE");
		(router as any).setParams?.({ [LOCAL_URI_KEY]: undefined });
	}, [incomingLocalUri, router]);

	useEffect(() => {
		if (!hasIncomingTileLabelKey) return;
		const incomingTrimmed = incomingTileLabel.trim();
		const draftLabel = safeString(draft.posTileLabel);

		// Empty incoming params should not erase an existing saved/draft label.
		if (incomingTrimmed.length > 0 || !draftLabel.trim()) {
			setTileLabel(incomingTileLabel);
			patch({ posTileLabel: incomingTileLabel });
		} else {
			setTileLabel(draftLabel);
		}
		(router as any).setParams?.({ [TILE_LABEL_KEY]: undefined });
	}, [draft.posTileLabel, hasIncomingTileLabelKey, incomingTileLabel, patch, router]);

	useEffect(() => {
		if (hasIncomingTileLabelKey) return;
		const draftLabel = safeString(draft.posTileLabel);
		if (!tileLabel.trim() && draftLabel.trim()) {
			setTileLabel(draftLabel);
		}
	}, [draft.posTileLabel, hasIncomingTileLabelKey, tileLabel]);

	const tabBarHeight = useBottomTabBarHeight();
	const screenBottomPad = tabBarHeight + 12;

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		if (rootReturnTo) {
			router.replace({ pathname: rootReturnTo as any, params: { [DRAFT_ID_KEY]: draftId } } as any);
			return;
		}
		router.replace(rootRoute as any);
	}, [draftId, isUiDisabled, lockNav, rootReturnTo, rootRoute, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const headerOptions = useInventoryHeader("process", {
		title: "Edit POS Tile",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: "/(app)/(tabs)/inventory",
	});

	const onSave = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		const trimmedLabel = tileLabel.trim();
		if (trimmedLabel && !posTileLabelRegex.test(trimmedLabel)) {
			return;
		}

		patch({
			posTileLabel: trimmedLabel,
			posTileLabelTouched: true,
			imageLocalUri: tileImageUri,
			posTileMode: tileMode,
			posTileColor: tileColor ?? null,
		});

		if (rootReturnTo) {
			router.replace({ pathname: rootReturnTo as any, params: { [DRAFT_ID_KEY]: draftId } } as any);
			return;
		}
		router.replace(rootRoute as any);
	}, [
		draftId,
		isUiDisabled,
		lockNav,
		patch,
		rootReturnTo,
		rootRoute,
		router,
		tileColor,
		tileImageUri,
		tileLabel,
		tileMode,
	]);

	const onChooseFromLibrary = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		setMediaError(null);

		router.push({
			pathname: toScopedRoute(POS_TILE_PHOTO_LIBRARY_ROUTE) as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
				[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
				[RETURN_TO_KEY]: posTileRoute,
				[TILE_LABEL_KEY]: tileLabel,
			},
		});
	}, [draftId, isUiDisabled, lockNav, posTileRoute, rootReturnTo, router, tileLabel, toScopedRoute]);

	const onTakePhoto = useCallback(async () => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		setMediaError(null);

		try {
			const perm = await ImagePicker.requestCameraPermissionsAsync();
			if (!perm.granted) {
				setMediaError("Camera permission is required. You can use Photo Library instead.");
				return;
			}

			const res = await ImagePicker.launchCameraAsync({
				mediaTypes: ["images"] as any,
				allowsEditing: false,
				quality: 1,
			});

			if (res.canceled) return;

			const asset = res.assets?.[0];
			if (!asset?.uri) return;

			router.replace({
				pathname: toScopedRoute(POS_TILE_CROP_ROUTE) as any,
				params: {
					[DRAFT_ID_KEY]: draftId,
					[LOCAL_URI_KEY]: asset.uri,
					[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
					[RETURN_TO_KEY]: posTileRoute,
					[TILE_LABEL_KEY]: tileLabel,
				},
			});
		} catch {
			setMediaError("Camera is not available on this device. Use Photo Library instead.");
		}
	}, [draftId, isUiDisabled, lockNav, posTileRoute, rootReturnTo, router, tileLabel, toScopedRoute]);

	const onRemoveImage = useCallback(() => {
		if (isUiDisabled) return;
		setTileImageUri("");
	}, [isUiDisabled]);

	const hasImage = !!tileImageUri;
	const isTileLabelValid = useMemo(() => {
		const trimmed = tileLabel.trim();
		if (!trimmed) return true;
		return posTileLabelRegex.test(trimmed);
	}, [tileLabel]);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>

			<BAIScreen padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
					<View style={[styles.screen, { backgroundColor: theme.colors.background, paddingBottom: screenBottomPad }]}>
						<BAISurface
							style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
							padded
						>
							<BAITextInput
								label='Tile Label'
								value={tileLabel}
								onChangeText={(t) => {
									const cleaned = t.replace(/[^A-Za-z0-9 ]/g, "");
									setTileLabel(cleaned);
									patch({ posTileLabel: cleaned, posTileLabelTouched: true });
								}}
								maxLength={FIELD_LIMITS.posTileLabel}
								placeholder={tileLabelPlaceholder}
								disabled={isUiDisabled}
							/>
							{!isTileLabelValid ? (
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									Letters and Numbers Only.
								</BAIText>
							) : null}

							<View style={{ height: 10 }} />

							<BAIGroupTabs tabs={TABS} value={tileMode} onChange={setTileMode} disabled={isUiDisabled} />

							<View style={{ height: 16 }} />

							{tileMode === "IMAGE" ? (
								<View style={styles.actions}>
									<ActionRow
										icon='image-multiple'
										label='Photo Library'
										onPress={onChooseFromLibrary}
										disabled={isUiDisabled}
									/>
									<ActionRow icon='camera' label='Take Photo' onPress={onTakePhoto} disabled={isUiDisabled} />
									<ActionRow
										icon='trash-can-outline'
										label='Remove Photo'
										onPress={onRemoveImage}
										disabled={isUiDisabled || !hasImage}
										danger
									/>
									{hasImage ? (
										<View style={styles.previewContainer}>
											<View style={styles.previewWrap}>
												<Image source={{ uri: tileImageUri }} style={styles.previewImage} resizeMode='cover' />
											</View>
										</View>
									) : null}
								</View>
							) : (
								<PosTileColorSelector value={tileColor} onChange={setTileColor} disabled={isUiDisabled} />
							)}
							{mediaError ? (
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									{mediaError}
								</BAIText>
							) : null}

							<View
								style={[styles.separator, { backgroundColor: theme.colors.outlineVariant ?? theme.colors.outline }]}
							/>

							<View style={[styles.actionBar, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}>
								<BAIButton
									intent='neutral'
									variant='outline'
									widthPreset='standard'
									onPress={guardedOnExit}
									disabled={isUiDisabled}
									style={{ flex: 1 }}
								>
									Cancel
								</BAIButton>

								<BAIButton
									intent='primary'
									variant='solid'
									widthPreset='standard'
									onPress={onSave}
									disabled={isUiDisabled || !isTileLabelValid}
									style={{ flex: 1 }}
								>
									Save
								</BAIButton>
							</View>
						</BAISurface>
					</View>
				</TouchableWithoutFeedback>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: { flex: 1, paddingHorizontal: 12 },
	card: { borderWidth: 1, borderRadius: 24 },
	actions: { gap: 12, marginBottom: 20 },
	separator: {
		height: StyleSheet.hairlineWidth,
		marginBottom: 10,
	},
	actionBar: {
		paddingVertical: 10,
		paddingHorizontal: 0,
		flexDirection: "row",
		gap: 10,
	},
	actionRow: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 18,
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	actionRowLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	previewContainer: {
		alignItems: "center",
		marginTop: 12,
	},
	previewWrap: {
		borderRadius: 18,
		overflow: "hidden",
		width: "62%",
		aspectRatio: 1,
		alignSelf: "center",
	},
	previewImage: {
		width: "100%",
		height: "100%",
	},
});
