// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/products/pos-tile-photo-library.phone.tsx
//
// Photo Library picker for POS Tile (Create Item flow)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme, Modal, Portal } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIInlineHeaderScaffold } from "@/components/ui/BAIInlineHeaderScaffold";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIPressableRow } from "@/components/ui/BAIPressableRow";

import { useAppBusy } from "@/hooks/useAppBusy";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import {
	DRAFT_ID_KEY,
	POS_TILE_CROP_ROUTE,
	POS_TILE_RECENTS_ROUTE,
	POS_TILE_ROUTE,
	POS_TILE_PHOTO_LIBRARY_ROUTE,
	RETURN_TO_KEY,
	ROOT_RETURN_TO_KEY,
	LOCAL_URI_KEY,
	TILE_LABEL_KEY,
	normalizeReturnTo,
	type PosTileInboundParams,
} from "@/modules/inventory/posTile.contract";

type MediaAsset = MediaLibrary.Asset;

const LIBRARY_PAGE_SIZE = 100; // masterplan: OS Photo Library uses windowed pagination with 100 thumbnails per page.

function safeString(v: unknown): string {
	return typeof v === "string" ? v : String(v ?? "");
}

export default function PosTilePhotoLibraryPhone({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const { withBusy } = useAppBusy();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const scopedPosTileRoute = useMemo(() => toScopedRoute(POS_TILE_ROUTE), [toScopedRoute]);
	const scopedPhotoLibraryRoute = useMemo(() => toScopedRoute(POS_TILE_PHOTO_LIBRARY_ROUTE), [toScopedRoute]);
	const scopedRecentsRoute = useMemo(() => toScopedRoute(POS_TILE_RECENTS_ROUTE), [toScopedRoute]);
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

	// Initial page (window) via React Query; subsequent pages loaded via explicit “after” cursor calls.
	const assetsQuery = useQuery({
		queryKey: ["posTile", "photoLibrary", "paged", { first: LIBRARY_PAGE_SIZE }],
		enabled: hasPermission,
		staleTime: 30_000,
		queryFn: async () => {
			return MediaLibrary.getAssetsAsync({
				first: LIBRARY_PAGE_SIZE,
				mediaType: [MediaLibrary.MediaType.photo],
				sortBy: [MediaLibrary.SortBy.creationTime],
			});
		},
	});

	const [assets, setAssets] = useState<MediaAsset[]>([]);
	const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Reset/seed pagination state when the first page changes.
	useEffect(() => {
		if (!hasPermission) {
			setAssets([]);
			setEndCursor(undefined);
			setHasNextPage(false);
			return;
		}
		if (!assetsQuery.data) return;

		const pageAssets = (assetsQuery.data.assets ?? []) as MediaAsset[];
		setAssets(pageAssets);
		setEndCursor(assetsQuery.data.endCursor);
		setHasNextPage(!!assetsQuery.data.hasNextPage);
	}, [assetsQuery.data, hasPermission]);

	const loadMore = useCallback(async () => {
		if (!hasPermission) return;
		if (isUiDisabled) return;
		if (isLoadingMore) return;
		if (!hasNextPage) return;
		if (!endCursor) return;

		setIsLoadingMore(true);
		try {
			const next = await MediaLibrary.getAssetsAsync({
				first: LIBRARY_PAGE_SIZE,
				after: endCursor,
				mediaType: [MediaLibrary.MediaType.photo],
				sortBy: [MediaLibrary.SortBy.creationTime],
			});

			const nextAssets = (next.assets ?? []) as MediaAsset[];
			setAssets((prev) => {
				if (nextAssets.length === 0) return prev;
				// Avoid accidental duplicates on some Android devices when cursor boundary shifts.
				const seen = new Set(prev.map((a) => a.id));
				const deduped = nextAssets.filter((a) => !seen.has(a.id));
				return deduped.length ? [...prev, ...deduped] : prev;
			});
			setEndCursor(next.endCursor);
			setHasNextPage(!!next.hasNextPage);
		} finally {
			setIsLoadingMore(false);
		}
	}, [endCursor, hasNextPage, hasPermission, isLoadingMore, isUiDisabled]);

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

	const onBack = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		if ((router as any).canGoBack?.()) {
			router.back();
			return;
		}

		if (isItemPhotoMode) {
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
	}, [draftId, isItemPhotoMode, isUiDisabled, lockNav, productId, returnTo, rootReturnTo, router, tileLabelParam]);

	const onRequestPermission = useCallback(async () => {
		if (isUiDisabled) return;
		await requestPermission();
	}, [isUiDisabled, requestPermission]);

	const onNext = useCallback(() => {
		if (isUiDisabled) return;
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
		isUiDisabled,
		isItemPhotoMode,
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

	const onTakePhoto = useCallback(async () => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		try {
			const perm = await ImagePicker.requestCameraPermissionsAsync();
			if (!perm.granted) {
				setSelectModalMessage("Camera permission is required. You can select a photo from the library instead.");
				setSelectModalOpen(true);
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
				pathname: scopedCropRoute as any,
				params: isItemPhotoMode
					? {
							mode: "itemPhoto",
							productId,
							[LOCAL_URI_KEY]: asset.uri,
							[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
							[RETURN_TO_KEY]: returnTo,
						}
					: {
							[DRAFT_ID_KEY]: draftId,
							[LOCAL_URI_KEY]: asset.uri,
							[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
							[RETURN_TO_KEY]: scopedPosTileRoute,
							[TILE_LABEL_KEY]: tileLabelParam,
						},
			});
		} catch {
			setSelectModalMessage("Camera is not available on this device. Use library photos instead.");
			setSelectModalOpen(true);
		}
	}, [
		draftId,
		isUiDisabled,
		isItemPhotoMode,
		lockNav,
		productId,
		returnTo,
		rootReturnTo,
		router,
		scopedCropRoute,
		scopedPosTileRoute,
		tileLabelParam,
	]);

	const onPickFromGallery = useCallback(async () => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		try {
			const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!perm.granted) {
				setSelectModalMessage("Photo library permission is required.");
				setSelectModalOpen(true);
				return;
			}

			const res = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"] as any,
				allowsEditing: false,
				quality: 1,
			});

			if (res.canceled) return;

			const asset = res.assets?.[0];
			if (!asset?.uri) return;

			router.replace({
				pathname: scopedCropRoute as any,
				params: isItemPhotoMode
					? {
							mode: "itemPhoto",
							productId,
							[LOCAL_URI_KEY]: asset.uri,
							[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
							[RETURN_TO_KEY]: returnTo,
						}
					: {
							[DRAFT_ID_KEY]: draftId,
							[LOCAL_URI_KEY]: asset.uri,
							[ROOT_RETURN_TO_KEY]: rootReturnTo ?? "",
							[RETURN_TO_KEY]: scopedPosTileRoute,
							[TILE_LABEL_KEY]: tileLabelParam,
						},
			});
		} catch {
			setSelectModalMessage("Unable to open the photo library right now. Please try again.");
			setSelectModalOpen(true);
		}
	}, [
		draftId,
		isUiDisabled,
		isItemPhotoMode,
		lockNav,
		productId,
		returnTo,
		rootReturnTo,
		router,
		scopedCropRoute,
		scopedPosTileRoute,
		tileLabelParam,
	]);

	const onOpenRecents = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		router.push({
			pathname: scopedRecentsRoute as any,
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
						[RETURN_TO_KEY]: scopedPhotoLibraryRoute,
						[TILE_LABEL_KEY]: tileLabelParam,
					},
		});
	}, [
		draftId,
		isUiDisabled,
		isItemPhotoMode,
		lockNav,
		productId,
		returnTo,
		rootReturnTo,
		router,
		scopedPhotoLibraryRoute,
		scopedRecentsRoute,
		tileLabelParam,
	]);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

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
		<BAIInlineHeaderScaffold
			title={isItemPhotoMode ? "Choose Photo" : "Photo Library"}
			variant='back'
			onLeftPress={onBack}
			disabled={isUiDisabled}
		>
			<BAIScreen
				padded={false}
				safeTop={false}
				tabbed
				style={[styles.root, { backgroundColor: theme.colors.background }]}
			>
				<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
					<BAISurface style={[styles.card, { borderColor }]} padded>
						<View style={styles.topActions}>
							<BAIButton
								intent='neutral'
								variant='outline'
								shape='pill'
								size='sm'
								widthPreset='standard'
								onPress={onBack}
								disabled={isUiDisabled}
								style={{ flex: 1 }}
							>
								Cancel
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

						<View style={styles.secondaryActions}>
							<BAIButton
								intent='primary'
								variant='outline'
								shape='pill'
								size='sm'
								widthPreset='standard'
								iconLeft='camera'
								onPress={onTakePhoto}
								disabled={isUiDisabled}
								style={{ flex: 1 }}
								contentStyle={{ gap: 2 }}
							>
								Take a Photo
							</BAIButton>
							<BAIButton
								intent='primary'
								variant='outline'
								shape='pill'
								size='sm'
								widthPreset='standard'
								iconLeft='image'
								onPress={onPickFromGallery}
								disabled={isUiDisabled}
								style={{ flex: 1 }}
								contentStyle={{ gap: 2 }}
							>
								Device Library
							</BAIButton>
						</View>

						{!hasPermission ? (
							<View style={styles.center}>
								<BAIText variant='title'>Allow Photo Access</BAIText>
								<BAIText variant='body' muted style={{ marginTop: 6, textAlign: "center" }}>
									Allow Access to Choose a POS Tile Photo From Your Library.
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
								<BAIButton
									intent='primary'
									variant='outline'
									shape='pill'
									onPress={onPickFromGallery}
									style={{ marginTop: 10 }}
									disabled={isUiDisabled}
								>
									Choose Library
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
									Add Photos to Your Device and Try Again.
								</BAIText>
							</View>
						) : (
							<>
								<FlatList
									data={assets}
									keyExtractor={(item) => item.id}
									numColumns={3}
									style={styles.gridList}
									contentContainerStyle={styles.grid}
									columnWrapperStyle={styles.gridRow}
									showsVerticalScrollIndicator={false}
									onEndReachedThreshold={0.6}
									onEndReached={loadMore}
									ListFooterComponent={
										isLoadingMore ? (
											<View style={{ paddingVertical: 10 }}>
												<BAIActivityIndicator />
											</View>
										) : null
									}
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

								<View style={{ height: 14 }} />
								<BAIText variant='subtitle'>Libraries</BAIText>
								<View style={{ height: 8 }} />
								<BAIPressableRow label='Recent' value='Photos' onPress={onOpenRecents} disabled={isUiDisabled} />
							</>
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
		</BAIInlineHeaderScaffold>
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
	secondaryActions: {
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
