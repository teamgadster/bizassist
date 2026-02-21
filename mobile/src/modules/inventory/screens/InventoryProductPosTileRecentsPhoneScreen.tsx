// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/products/pos-tile-recents.phone.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme, Modal, Portal } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import * as MediaLibrary from "expo-media-library";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";

import { useAppBusy } from "@/hooks/useAppBusy";
import {
	inventoryScopeRoot,
	mapInventoryRouteToScope,
	type InventoryRouteScope,
} from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import {
	DRAFT_ID_KEY,
	POS_TILE_CROP_ROUTE,
	POS_TILE_PHOTO_LIBRARY_ROUTE,
	POS_TILE_ROUTE,
	RETURN_TO_KEY,
	ROOT_RETURN_TO_KEY,
	LOCAL_URI_KEY,
	TILE_LABEL_KEY,
	normalizeReturnTo,
	type PosTileInboundParams,
} from "@/modules/inventory/posTile.contract";

type MediaAsset = MediaLibrary.Asset;

const RECENTS_HARD_CAP = 60; // masterplan: “Recent Photos” grid uses hard cap of 60 newest images.

function safeString(v: unknown): string {
	return typeof v === "string" ? v : String(v ?? "");
}

export default function PosTileRecentsPhone({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const { withBusy } = useAppBusy();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const rootRoute = useMemo(() => inventoryScopeRoot(routeScope), [routeScope]);
	const scopedPosTileRoute = useMemo(() => toScopedRoute(POS_TILE_ROUTE), [toScopedRoute]);
	const scopedPhotoLibraryRoute = useMemo(() => toScopedRoute(POS_TILE_PHOTO_LIBRARY_ROUTE), [toScopedRoute]);
	const scopedCropRoute = useMemo(() => toScopedRoute(POS_TILE_CROP_ROUTE), [toScopedRoute]);

	const params = useLocalSearchParams<PosTileInboundParams>();
	const mode = safeString(params.mode).trim();
	const productId = safeString(params.productId).trim();
	const isItemPhotoMode = mode === "itemPhoto";
	const draftId = safeString(params[DRAFT_ID_KEY]).trim();
	const returnTo = normalizeReturnTo(params[RETURN_TO_KEY]) ?? scopedPosTileRoute;
	const rootReturnTo = normalizeReturnTo(params[ROOT_RETURN_TO_KEY]);
	const tileLabelParam = safeString(params[TILE_LABEL_KEY]);

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

	const [permission, requestPermission] = MediaLibrary.usePermissions();
	const hasPermission = !!permission?.granted;

	const assetsQuery = useQuery({
		queryKey: ["posTile", "photoLibrary", "recents", { first: RECENTS_HARD_CAP }],
		enabled: hasPermission,
		staleTime: 30_000,
		queryFn: async () => {
			return MediaLibrary.getAssetsAsync({
				first: RECENTS_HARD_CAP,
				mediaType: [MediaLibrary.MediaType.photo],
				sortBy: [MediaLibrary.SortBy.creationTime],
			});
		},
	});

	const assets = useMemo(() => (assetsQuery.data?.assets ?? []) as MediaAsset[], [assetsQuery.data?.assets]);

	const [selectedId, setSelectedId] = useState<string>("");
	const selectedAsset = useMemo(() => assets.find((a) => a.id === selectedId) ?? null, [assets, selectedId]);

	// If selection disappears due to refresh, clear it.
	useEffect(() => {
		if (!selectedId) return;
		const exists = assets.some((a) => a.id === selectedId);
		if (!exists) setSelectedId("");
	}, [assets, selectedId]);

	const [selectModalOpen, setSelectModalOpen] = useState(false);
	const [selectModalMessage, setSelectModalMessage] = useState("Please select a photo to continue.");

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		if (isItemPhotoMode) {
			if (!productId) {
				router.replace(rootRoute as any);
				return;
			}
			router.replace({
				pathname: returnTo as any,
				params: {
					id: productId,
					[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
				},
			} as any);
			return;
		}
		router.replace({
			pathname: returnTo as any,
			params: {
				[DRAFT_ID_KEY]: draftId,
				[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
				[TILE_LABEL_KEY]: tileLabelParam,
			},
		} as any);
	}, [
		draftId,
		isItemPhotoMode,
		isUiDisabled,
		lockNav,
		productId,
		returnTo,
		rootRoute,
		rootReturnTo,
		router,
		tileLabelParam,
	]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const headerOptions = useInventoryHeader("process", {
		title: "Recent Photos",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});

	const onRequestPermission = useCallback(async () => {
		if (isUiDisabled) return;
		await requestPermission();
	}, [isUiDisabled, requestPermission]);

	const onNext = useCallback(() => {
		if (isUiDisabled) return;
		if (isItemPhotoMode && !productId) {
			setSelectModalMessage("Unable to attach this photo. Please reopen the item.");
			setSelectModalOpen(true);
			return;
		}
		if (!selectedAsset?.uri) {
			setSelectModalMessage("Please select a photo to continue.");
			setSelectModalOpen(true);
			return;
		}
		if (!lockNav()) return;

		void withBusy("Preparing photo...", async () => {
			let resolvedUri = selectedAsset.uri;
			try {
				const info = await MediaLibrary.getAssetInfoAsync(selectedAsset);
				const localUri = typeof info?.localUri === "string" ? info.localUri.trim() : "";
				if (localUri) resolvedUri = localUri;
			} catch {
				// fall back to asset uri
			}

			if (!resolvedUri || resolvedUri.startsWith("ph://")) {
				setSelectModalMessage("Unable to load this photo. Please choose another.");
				setSelectModalOpen(true);
				return;
			}

			router.replace({
				pathname: scopedCropRoute as any,
				params: isItemPhotoMode
					? {
							mode: "itemPhoto",
							productId,
							[LOCAL_URI_KEY]: resolvedUri,
							[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
							[RETURN_TO_KEY]: returnTo,
						}
						: {
								[DRAFT_ID_KEY]: draftId,
								[LOCAL_URI_KEY]: resolvedUri,
								[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
								[RETURN_TO_KEY]: scopedPosTileRoute,
								[TILE_LABEL_KEY]: tileLabelParam,
							},
				});
			});
		}, [
			draftId,
		isItemPhotoMode,
		isUiDisabled,
		lockNav,
		productId,
			returnTo,
			rootReturnTo,
			router,
			scopedCropRoute,
			scopedPosTileRoute,
			selectedAsset,
			tileLabelParam,
			withBusy,
		]);

	// masterplan: Recents routes into BizAssist Photo Library screen (not OS picker).
	const onOpenPhotoLibrary = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		router.replace({
			pathname: scopedPhotoLibraryRoute as any,
			params: isItemPhotoMode
				? {
						mode: "itemPhoto",
						productId,
						[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
						[RETURN_TO_KEY]: returnTo,
					}
					: {
							[DRAFT_ID_KEY]: draftId,
							[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
							[RETURN_TO_KEY]: scopedPosTileRoute,
							[TILE_LABEL_KEY]: tileLabelParam,
						},
		} as any);
	}, [
		draftId,
		isItemPhotoMode,
		isUiDisabled,
		lockNav,
		productId,
		returnTo,
		rootReturnTo,
		router,
		scopedPhotoLibraryRoute,
		scopedPosTileRoute,
		tileLabelParam,
	]);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	// Masterplan parity: keep Recents "live" after camera captures / library mutations.
	useEffect(() => {
		if (!hasPermission) return;

		let isActive = true;

		const subscription = MediaLibrary.addListener(() => {
			if (!isActive) return;
			assetsQuery.refetch();
		});

		const appStateSub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				assetsQuery.refetch();
			}
		});

		return () => {
			isActive = false;
			subscription.remove();
			appStateSub.remove();
		};
	}, [assetsQuery, hasPermission]);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
					headerRight: () => null,
				}}
			/>

			<BAIScreen padded={false} safeTop={false} tabbed style={styles.root}>
				<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
					<BAISurface style={[styles.card, { borderColor }]} padded>
						<View style={styles.topActions}>
							<BAIButton
								intent='primary'
								variant='outline'
								shape='pill'
								size='sm'
								widthPreset='standard'
								onPress={onOpenPhotoLibrary}
								disabled={isUiDisabled}
								style={{ flex: 1 }}
							>
								Photo Library
							</BAIButton>
							<BAIButton
								intent='primary'
								variant='solid'
								shape='pill'
								size='sm'
								widthPreset='standard'
								onPress={onNext}
								disabled={isUiDisabled || !selectedAsset}
								style={{ flex: 1 }}
							>
								Next
							</BAIButton>
						</View>

						{!hasPermission ? (
							<View style={styles.center}>
								<BAIText variant='title'>Allow Photo Access</BAIText>
								<BAIText variant='body' muted style={{ marginTop: 6, textAlign: "center" }}>
									We need access to your photo library to choose a POS tile photo.
								</BAIText>
								<BAIButton
									intent='primary'
									variant='solid'
									shape='pill'
									onPress={onRequestPermission}
									style={{ marginTop: 12 }}
								>
									Grant Access
								</BAIButton>
							</View>
						) : assetsQuery.isLoading ? (
							<View style={styles.center}>
								<BAIActivityIndicator />
							</View>
						) : assetsQuery.isError ? (
							<View style={styles.center}>
								<BAIText variant='title'>Unable to Load Photos</BAIText>
								<BAIRetryButton onPress={() => assetsQuery.refetch()} style={{ marginTop: 12 }} />
							</View>
						) : assets.length === 0 ? (
							<View style={styles.center}>
								<BAIText variant='title'>No Photos Found</BAIText>
								<BAIText variant='body' muted style={{ marginTop: 6, textAlign: "center" }}>
									Add photos to your device, then try again.
								</BAIText>
							</View>
						) : (
							<FlatList
								data={assets}
								keyExtractor={(item) => item.id}
								numColumns={3}
								style={styles.gridList}
								contentContainerStyle={styles.grid}
								columnWrapperStyle={styles.gridRow}
								showsVerticalScrollIndicator={false}
								renderItem={({ item }) => {
									const selected = item.id === selectedId;
									return (
										<Pressable
											onPress={() => setSelectedId(item.id)}
											style={[styles.tile, { borderColor: selected ? theme.colors.primary : borderColor }]}
										>
											<Image source={{ uri: item.uri }} style={styles.tileImage} contentFit='cover' />
											{selected ? (
												<View style={styles.selectedBadge}>
													<MaterialCommunityIcons name='check' size={16} color='#FFFFFF' />
												</View>
											) : null}
										</Pressable>
									);
								}}
							/>
						)}
					</BAISurface>
				</View>
			</BAIScreen>

			<Portal>
				<Modal
					visible={selectModalOpen}
					onDismiss={() => setSelectModalOpen(false)}
					dismissable={false}
					contentContainerStyle={styles.modalHost}
				>
					<BAISurface style={[styles.modalCard, { borderColor }]} padded>
						<BAIText variant='title'>Select Photo</BAIText>
						<BAIText variant='body' muted style={{ marginTop: 8 }}>
							{selectModalMessage}
						</BAIText>
						<BAIButton
							intent='primary'
							variant='solid'
							shape='pill'
							onPress={() => setSelectModalOpen(false)}
							style={{ marginTop: 14 }}
						>
							Close
						</BAIButton>
					</BAISurface>
				</Modal>
			</Portal>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: { flex: 1, paddingHorizontal: 12 },
	card: { borderWidth: 1, borderRadius: 24, flex: 1 },
	topActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 10,
		marginBottom: 12,
	},
	center: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
	gridList: {
		flex: 1,
		minHeight: 0,
	},
	grid: { paddingTop: 6, paddingBottom: 4 },
	gridRow: { gap: 10, marginBottom: 10 },
	tile: {
		width: "31%",
		aspectRatio: 1,
		borderWidth: 2,
		borderRadius: 14,
		overflow: "hidden",
	},
	tileImage: { width: "100%", height: "100%" },
	selectedBadge: {
		position: "absolute",
		right: 6,
		top: 6,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#111827",
		alignItems: "center",
		justifyContent: "center",
	},
	modalHost: { paddingHorizontal: 16 },
	modalCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: 18 },
});
