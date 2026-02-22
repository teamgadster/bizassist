// BizAssist_mobile
// path: src/modules/inventory/services/screens/InventoryServiceDetailScreen.tsx

import { FontAwesome6 } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAITimeAgo } from "@/components/system/BAITimeAgo";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton, BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIInlineHeaderScaffold } from "@/components/ui/BAIInlineHeaderScaffold";
import { BAIIconButton } from "@/components/ui/BAIIconButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { DEFAULT_SERVICE_TOTAL_DURATION_MINUTES } from "@/modules/inventory/drafts/serviceCreateDraft";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import { mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { inventoryKeys } from "@/modules/inventory/inventory.queries";
import type { InventoryProductDetail } from "@/modules/inventory/inventory.types";
import { formatDurationLabel } from "@/modules/inventory/services/serviceDuration";
import { useNavLock } from "@/shared/hooks/useNavLock";
import { formatMoney } from "@/shared/money/money.format";

function isMeaningfulDetailText(v: unknown): v is string {
	if (typeof v !== "string") return false;
	const trimmed = v.trim();
	if (!trimmed) return false;
	return trimmed !== "-" && trimmed !== "—" && trimmed !== "–";
}

function formatReadableTime(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const date = new Date(trimmed);
	if (!Number.isFinite(date.getTime())) return trimmed;
	const datePart = date.toLocaleDateString();
	const timePart = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	return `${datePart}, ${timePart}`;
}

function formatUnitLabel(p: any): string | null {
	const unitName =
		typeof p?.unit?.name === "string" ? p.unit.name.trim() : typeof p?.unitName === "string" ? p.unitName.trim() : "";
	const unitAbbr =
		typeof p?.unit?.abbreviation === "string"
			? p.unit.abbreviation.trim()
			: typeof p?.unitAbbreviation === "string"
				? p.unitAbbreviation.trim()
				: "";

	if (!unitName && !unitAbbr) return "Time";
	if (!unitAbbr) return unitName;
	return unitName ? `${unitName} (${unitAbbr})` : unitAbbr;
}

function normalizeNonNegativeMinutes(value: unknown): number | null {
	const raw = Number(value);
	if (!Number.isFinite(raw)) return null;
	const n = Math.trunc(raw);
	return n >= 0 ? n : null;
}

function normalizePositiveMinutes(value: unknown): number | null {
	const n = normalizeNonNegativeMinutes(value);
	if (n == null || n <= 0) return null;
	return n;
}

function DetailRow({ label, value, isLast = false }: { label: string; value: React.ReactNode; isLast?: boolean }) {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const labelColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;
	const valueColor = theme.colors.onSurface;

	return (
		<View
			style={[
				styles.detailRow,
				!isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
			]}
		>
			<BAIText variant='caption' style={[styles.detailLabel, { color: labelColor }]}>
				{label}
			</BAIText>

			{typeof value === "string" ? (
				<BAIText variant='body' numberOfLines={2} style={[styles.detailValue, { color: valueColor }]}>
					{value}
				</BAIText>
			) : (
				<View style={styles.detailValueRow}>{value}</View>
			)}
		</View>
	);
}

function MetaRow({
	label,
	value,
	divider,
	dividerColor,
}: {
	label: string;
	value: React.ReactNode;
	divider?: boolean;
	dividerColor?: string;
}) {
	return (
		<View
			style={[
				styles.metaRow,
				divider ? [styles.metaRowDivider, dividerColor ? { borderBottomColor: dividerColor } : null] : null,
			]}
		>
			<BAIText variant='caption' muted style={styles.metaLabel}>
				{label}
			</BAIText>

			<View style={styles.metaValueCol}>
				{typeof value === "string" ? (
					<BAIText variant='body' numberOfLines={1} ellipsizeMode='tail' style={styles.metaValueText}>
						{value}
					</BAIText>
				) : (
					value
				)}
			</View>
		</View>
	);
}

export default function InventoryServiceDetailScreen({
	routeScope = "inventory",
}: {
	routeScope?: InventoryRouteScope;
}) {
	const router = useRouter();
	const theme = useTheme();
	const tabBarHeight = useBottomTabBarHeight();
	const { canNavigate, safePush } = useNavLock({ lockMs: 650 });
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const { currencyCode } = useActiveBusinessMeta();

	const params = useLocalSearchParams<{ id: string }>();
	const productId = useMemo(() => String(params.id ?? "").trim(), [params.id]);

	const detailQuery = useQuery<InventoryProductDetail>({
		queryKey: inventoryKeys.productDetail(productId),
		queryFn: () => inventoryApi.getProductDetail(productId),
		enabled: !!productId,
		staleTime: 30_000,
	});

	const product = detailQuery.data ?? null;
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const isArchived = product?.isActive === false;

	const onBackToServices = useCallback(() => {
		if (!canNavigate) return;
		router.replace(toScopedRoute("/(app)/(tabs)/inventory?type=SERVICES") as any);
	}, [canNavigate, router, toScopedRoute]);

	const title = (product as any)?.name?.trim() ? (product as any).name : "Service";
	const typeLabel = "Service";

	const categoryName = useMemo(() => {
		const c = (product as any)?.category;
		const rawName = typeof c?.name === "string" ? c.name.trim() : "";
		return rawName || "None";
	}, [product]);

	const categoryColor = useMemo(() => {
		const c = (product as any)?.category;
		const raw = typeof c?.color === "string" ? c.color.trim() : "";
		if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) return "";
		return raw;
	}, [product]);

	const categoryDotStyle = useMemo(() => {
		const fill = categoryColor ? categoryColor : "transparent";
		const stroke = categoryColor ? categoryColor : borderColor;
		return { backgroundColor: fill, borderColor: stroke };
	}, [borderColor, categoryColor]);

	const durationBreakdown = useMemo(() => {
		const total = normalizePositiveMinutes((product as any)?.durationTotalMinutes);
		const initial = normalizePositiveMinutes((product as any)?.durationInitialMinutes);
		const processing = normalizePositiveMinutes((product as any)?.durationProcessingMinutes);
		const final = normalizePositiveMinutes((product as any)?.durationFinalMinutes);
		const processingEnabled = Boolean((product as any)?.processingEnabled);

		const computedTotalFromSegments =
			initial != null && processing != null && final != null ? initial + processing + final : null;
		const effectiveTotal = processingEnabled
			? (computedTotalFromSegments ?? total ?? DEFAULT_SERVICE_TOTAL_DURATION_MINUTES)
			: (total ?? DEFAULT_SERVICE_TOTAL_DURATION_MINUTES);
		const durationValue = formatDurationLabel(effectiveTotal);

		return {
			durationValue,
			initial,
			processing,
			final,
			processingEnabled,
		};
	}, [product]);

	const priceText = useMemo(() => {
		const value = (product as any)?.price;
		if (value == null) return "—";
		return formatMoney({ amount: value, currencyCode });
	}, [currencyCode, product]);

	const imageUri = useMemo(() => {
		const raw = typeof (product as any)?.primaryImageUrl === "string" ? (product as any).primaryImageUrl.trim() : "";
		return raw;
	}, [product]);

	const tileColor = useMemo(() => {
		const raw = typeof (product as any)?.posTileColor === "string" ? (product as any).posTileColor.trim() : "";
		return raw;
	}, [product]);

	const hasImage = Boolean(imageUri);
	const hasColor = Boolean(tileColor);
	const shouldShowEmpty = !hasImage && !hasColor;

	const [isImageLoading, setIsImageLoading] = useState(false);
	const [imageLoadFailed, setImageLoadFailed] = useState(false);

	useEffect(() => {
		if (imageUri) {
			setIsImageLoading(true);
			setImageLoadFailed(false);
		} else {
			setIsImageLoading(false);
			setImageLoadFailed(false);
		}
	}, [imageUri]);

	const onEditService = useCallback(() => {
		if (!productId) return;
		safePush(router, toScopedRoute(`/(app)/(tabs)/inventory/services/${encodeURIComponent(productId)}/edit`));
	}, [productId, router, safePush, toScopedRoute]);
	const onImagePress = useCallback(() => {
		if (!productId) return;
		safePush(router, toScopedRoute(`/(app)/(tabs)/inventory/services/${encodeURIComponent(productId)}/photo`));
	}, [productId, router, safePush, toScopedRoute]);

	const onArchiveService = useCallback(() => {
		if (!productId) return;
		safePush(router, toScopedRoute(`/(app)/(tabs)/inventory/services/${encodeURIComponent(productId)}/archive`));
	}, [productId, router, safePush, toScopedRoute]);

	const onRestoreService = useCallback(() => {
		if (!productId) return;
		safePush(router, toScopedRoute(`/(app)/(tabs)/inventory/services/${encodeURIComponent(productId)}/restore`));
	}, [productId, router, safePush, toScopedRoute]);

	const details = useMemo(() => {
		if (!product) return [];
		const p: any = product;
		const rows: { label: string; value: React.ReactNode }[] = [];

		if (isMeaningfulDetailText(p.name)) rows.push({ label: "Name", value: p.name.trim() });
		if (typeof p.isActive === "boolean") rows.push({ label: "Status", value: p.isActive ? "Active" : "Archived" });
		if (isMeaningfulDetailText(p.description)) rows.push({ label: "Description", value: p.description.trim() });

		const unitLabel = formatUnitLabel(p);
		if (unitLabel && isMeaningfulDetailText(unitLabel)) rows.push({ label: "Unit Type", value: unitLabel });

		rows.push({ label: "Duration", value: durationBreakdown.durationValue });
		rows.push({ label: "Processing Time", value: durationBreakdown.processingEnabled ? "Enabled" : "Disabled" });

		if (durationBreakdown.processingEnabled) {
			if (durationBreakdown.initial != null)
				rows.push({ label: "Initial", value: formatDurationLabel(durationBreakdown.initial) });
			if (durationBreakdown.processing != null)
				rows.push({ label: "Processing", value: formatDurationLabel(durationBreakdown.processing) });
			if (durationBreakdown.final != null)
				rows.push({ label: "Final", value: formatDurationLabel(durationBreakdown.final) });
		}

		const createdAtLabel = formatReadableTime(p.createdAt);
		if (createdAtLabel && isMeaningfulDetailText(createdAtLabel)) {
			rows.push({
				label: "Created",
				value: (
					<View style={styles.timestampRow}>
						<BAIText variant='body' numberOfLines={1} style={[styles.detailValue, styles.timestampValue]}>
							{createdAtLabel}
						</BAIText>
						<BAIText variant='body' muted style={styles.inlineSep}>
							|
						</BAIText>
						<View style={styles.timestampAgo}>
							<BAITimeAgo value={p.createdAt} variant='body' muted />
						</View>
					</View>
				),
			});
		}

		const updatedAtLabel = formatReadableTime(p.updatedAt);
		if (updatedAtLabel && isMeaningfulDetailText(updatedAtLabel)) {
			rows.push({
				label: "Last Updated",
				value: (
					<View style={styles.timestampRow}>
						<BAIText variant='body' numberOfLines={1} style={[styles.detailValue, styles.timestampValue]}>
							{updatedAtLabel}
						</BAIText>
						<BAIText variant='body' muted style={styles.inlineSep}>
							|
						</BAIText>
						<View style={styles.timestampAgo}>
							<BAITimeAgo value={p.updatedAt} variant='body' muted />
						</View>
					</View>
				),
			});
		}

		return rows;
	}, [durationBreakdown, product]);

	const metaRows = useMemo(
		() => [
			{ label: "Type", value: typeLabel },
			{ label: "Duration", value: durationBreakdown.durationValue },
			{
				label: "Category",
				value: (
					<View style={styles.metaInline}>
						{categoryName !== "None" ? <View style={[styles.categoryDot, categoryDotStyle]} /> : null}
						<BAIText variant='body' numberOfLines={1} ellipsizeMode='tail' style={styles.metaValueText}>
							{categoryName}
						</BAIText>
					</View>
				),
			},
			{ label: "Price", value: priceText },
		],
		[categoryDotStyle, categoryName, durationBreakdown.durationValue, priceText, typeLabel],
	);

	const isLoading = detailQuery.isLoading;
	const isError = detailQuery.isError;
	const errorMessage = isError
		? String(
				(detailQuery.error as any)?.response?.data?.message ??
					(detailQuery.error as any)?.message ??
					"Failed to load service.",
			)
		: "";

	return (
		<BAIInlineHeaderScaffold
			title='Service Details Overview'
			variant='back'
			onLeftPress={onBackToServices}
			disabled={!canNavigate}
		>
			<BAIScreen
				padded={false}
				tabbed
				scroll
				safeTop={false}
				safeBottom={false}
				style={styles.root}
				contentContainerStyle={[styles.screen, { paddingBottom: tabBarHeight + 12 }]}
				scrollProps={{ showsVerticalScrollIndicator: false }}
			>
				<BAISurface style={styles.card} padded>
					{isLoading ? (
						<View style={styles.center}>
							<BAIActivityIndicator />
						</View>
					) : isError || !product ? (
						<View style={styles.center}>
							<BAIText variant='title' numberOfLines={1} ellipsizeMode='tail' style={styles.title}>
								{title}
							</BAIText>

							<BAIText variant='body' muted style={{ marginTop: 8, textAlign: "center" }}>
								{errorMessage || "Could not load service."}
							</BAIText>

							<View style={styles.actions}>
								<BAIRetryButton mode='contained' onPress={() => detailQuery.refetch()} disabled={!productId}>
									Retry
								</BAIRetryButton>
							</View>
						</View>
					) : (
						<>
							<View style={styles.imageHeaderRow}>
								<View style={styles.imageSection}>
									<View
										style={[
											styles.imagePreview,
											{
												borderColor,
												backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
											},
										]}
									>
										{hasImage ? (
											<View style={styles.imageFill}>
												<Image
													source={{ uri: imageUri }}
													style={styles.imagePreviewImage}
													resizeMode='cover'
													onLoadStart={() => {
														setIsImageLoading(true);
														setImageLoadFailed(false);
													}}
													onLoadEnd={() => setIsImageLoading(false)}
													onError={() => {
														setIsImageLoading(false);
														setImageLoadFailed(true);
													}}
												/>

												{isImageLoading ? (
													<View style={styles.imageLoadingOverlay} pointerEvents='none'>
														<BAIActivityIndicator />
													</View>
												) : null}

												{imageLoadFailed ? (
													<View style={styles.imageLoadingOverlay} pointerEvents='none'>
														<FontAwesome6
															name='image'
															size={48}
															color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
														/>
														<View style={{ height: 6 }} />
														<BAIText variant='caption' muted>
															Failed to load photo
														</BAIText>
													</View>
												) : null}
											</View>
										) : hasColor ? (
											<View style={[styles.imagePreviewImage, { backgroundColor: tileColor }]} />
										) : shouldShowEmpty ? (
											<View style={styles.imagePreviewEmpty}>
												<FontAwesome6
													name='image'
													size={64}
													color={theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
												/>
												<BAIText variant='caption' muted>
													No Photo
												</BAIText>
											</View>
										) : null}

										{!isArchived ? (
											<BAIIconButton
												variant='outlined'
												icon='camera'
												size='lg'
												iconSize={32}
												onPress={onImagePress}
												disabled={!canNavigate || isLoading}
												accessibilityLabel='Set Photo'
												style={[
													styles.imageIconButton,
													{ backgroundColor: theme.dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.50)" },
												]}
											/>
										) : null}
									</View>
								</View>
							</View>

							<View style={styles.header}>
								<View style={styles.headerLeft}>
									<BAIText variant='title' numberOfLines={1} ellipsizeMode='tail' style={styles.title}>
										{title}
									</BAIText>
									<BAIText variant='caption' muted numberOfLines={1} style={styles.headerSub}>
										Status: {isArchived ? "Archived" : "Active"}
									</BAIText>
								</View>
							</View>

							<View
								style={[
									styles.metaPanel,
									{ borderColor, backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface },
								]}
							>
								{metaRows.map((row, index) => (
									<MetaRow
										key={`${row.label}-${index}`}
										label={row.label}
										value={row.value}
										divider={index < metaRows.length - 1}
										dividerColor={borderColor}
									/>
								))}
							</View>

							{!isArchived ? (
								<View style={styles.itemFooterActions}>
									<BAICTAButton
										variant='outline'
										intent='primary'
										onPress={onEditService}
										disabled={!productId || !canNavigate}
										style={styles.footerActionButton}
									>
										Edit Service
									</BAICTAButton>
								</View>
							) : null}
						</>
					)}
				</BAISurface>

				{details.length > 0 ? (
					<BAISurface style={styles.card} padded={false}>
						<View style={[styles.sectionHeader, { borderBottomColor: borderColor }]}>
							<BAIText variant='subtitle'>Details</BAIText>
						</View>

						<View style={styles.sectionBodyTight}>
							<View style={styles.detailsGridTight}>
								{details.map((r, index) => (
									<DetailRow
										key={`${r.label}:${String(index)}`}
										label={r.label}
										value={r.value}
										isLast={index === details.length - 1}
									/>
								))}
							</View>
						</View>
					</BAISurface>
				) : null}

				<BAISurface style={styles.card} padded>
					<View style={styles.itemFooterActions}>
						{isArchived ? (
							<>
								<BAICTAPillButton
									variant='outline'
									intent='neutral'
									onPress={onBackToServices}
									disabled={!canNavigate}
									style={styles.footerActionButton}
								>
									Cancel
								</BAICTAPillButton>
								<BAICTAPillButton
									variant='solid'
									intent='primary'
									onPress={onRestoreService}
									disabled={!productId || !canNavigate}
									style={styles.footerActionButton}
								>
									Restore
								</BAICTAPillButton>
							</>
						) : (
							<>
								<BAIButton
									variant='outline'
									intent='danger'
									shape='pill'
									widthPreset='standard'
									onPress={onArchiveService}
									disabled={!productId || !canNavigate}
									style={styles.footerActionButton}
								>
									Archive
								</BAIButton>
								<BAICTAPillButton
									variant='outline'
									intent='neutral'
									onPress={onBackToServices}
									disabled={!canNavigate}
									style={styles.footerActionButton}
								>
									Cancel
								</BAICTAPillButton>
							</>
						)}
					</View>
				</BAISurface>
			</BAIScreen>
		</BAIInlineHeaderScaffold>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 0 },
	card: { overflow: "hidden" },
	center: { padding: 16, alignItems: "center", justifyContent: "center" },

	imageHeaderRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "center",
		gap: 14,
		marginBottom: 16,
	},
	imageSection: {
		alignItems: "center",
		gap: 10,
	},
	imageIconButton: {
		position: "absolute",
		right: 8,
		bottom: 8,
		zIndex: 2,
	},
	itemFooterActions: {
		marginTop: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	footerActionButton: {
		flex: 1,
	},
	imagePreview: {
		width: 180,
		aspectRatio: 1,
		borderRadius: 18,
		borderWidth: 1,
		overflow: "hidden",
		position: "relative",
	},
	imageFill: {
		width: "100%",
		height: "100%",
	},
	imagePreviewImage: {
		width: "100%",
		height: "100%",
	},
	imageLoadingOverlay: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	imagePreviewEmpty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
	headerLeft: { flex: 1, minWidth: 0, gap: 6 },
	headerSub: { opacity: 0.9 },

	metaPanel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, overflow: "hidden", marginTop: 12 },
	metaRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
	metaRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
	metaLabel: { width: 88 },
	metaValueCol: { flex: 1, minWidth: 0 },
	metaValueText: { flexShrink: 1 },
	metaInline: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 },

	categoryDot: { width: 12, height: 12, borderRadius: 9, borderWidth: 1 },
	title: { flexShrink: 1 },

	actions: { marginTop: 12, flexDirection: "row", gap: 10 },

	sectionHeader: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderBottomWidth: StyleSheet.hairlineWidth,
	},

	sectionBodyTight: { paddingHorizontal: 12, paddingVertical: 10 },
	detailsGridTight: { gap: 0 },

	detailRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
	detailLabel: { textTransform: "none", letterSpacing: 0, minWidth: 110, maxWidth: 130, flexShrink: 0 },
	detailValue: { flex: 1, lineHeight: 18 },
	detailValueRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, flex: 1 },

	inlineSep: { marginHorizontal: 4 },
	timestampRow: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap", gap: 4, flex: 1 },
	timestampValue: { flex: 0, flexShrink: 1 },
	timestampAgo: { flexShrink: 0 },
});
