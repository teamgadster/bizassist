// BizAssist_mobile
// path: src/modules/inventory/services/screens/InventoryServiceRestoreScreen.tsx
//
// Navigation governance:
// - Screen class: PROCESS.
// - Header-left uses Exit (X) for cancel intent.
// - Exit is deterministic (replace) to service detail, with optional returnTo override.

import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { catalogKeys } from "@/modules/catalog/catalog.queries";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import { invalidateInventoryAfterMutation } from "@/modules/inventory/inventory.invalidate";
import { inventoryScopeRoot, mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { runGovernedProcessExit } from "@/modules/inventory/navigation.governance";
import { inventoryKeys } from "@/modules/inventory/inventory.queries";
import type { InventoryProductDetail } from "@/modules/inventory/inventory.types";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";

function extractApiErrorMessage(err: unknown): string {
	const data = (err as any)?.response?.data;
	const msg = data?.message ?? data?.error?.message ?? (err as any)?.message ?? "Failed to restore service.";
	return String(msg);
}

export default function InventoryServiceRestoreScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const qc = useQueryClient();
	const { withBusy, busy } = useAppBusy();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const rootRoute = useMemo(() => inventoryScopeRoot(routeScope), [routeScope]);

	const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
	const productId = String(params.id ?? "").trim();
	const rawReturnTo = params.returnTo;

	const [error, setError] = useState<string | null>(null);

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

	const isUiDisabled = !!busy?.isBusy || isNavLocked;
	const query = useQuery<InventoryProductDetail>({
		queryKey: inventoryKeys.productDetail(productId),
		queryFn: () => inventoryApi.getProductDetail(productId),
		enabled: !!productId,
		staleTime: 30_000,
	});

	const product = query.data ?? null;
	const isService = product ? String((product as any).type ?? "").toUpperCase() === "SERVICE" : true;
	const canRestore = !!product && !product.isActive && isService;
	const detailRoute = useMemo(() => {
		if (!productId) return rootRoute;
		return toScopedRoute(`/(app)/(tabs)/inventory/services/${encodeURIComponent(productId)}` as const);
	}, [productId, rootRoute, toScopedRoute]);

	const onExit = useCallback(() => {
		runGovernedProcessExit(rawReturnTo, detailRoute, {
			router: router as any,
			lockNav,
			disabled: isUiDisabled,
		});
	}, [detailRoute, isUiDisabled, lockNav, rawReturnTo, router]);

	const onConfirmRestore = useCallback(async () => {
		if (!product || !canRestore || isUiDisabled) return;
		if (!lockNav()) return;

		setError(null);
		await withBusy("Restoring service...", async () => {
			try {
				await inventoryApi.restoreProduct(product.id);
				invalidateInventoryAfterMutation(qc, { productId });
				await Promise.all([
					qc.invalidateQueries({ queryKey: inventoryKeys.all }),
					qc.invalidateQueries({ queryKey: catalogKeys.all }),
					qc.invalidateQueries({ queryKey: ["pos", "catalog", "products"] }),
				]);
				router.replace(detailRoute as any);
			} catch (e) {
				setError(extractApiErrorMessage(e));
			}
		});
	}, [canRestore, detailRoute, isUiDisabled, lockNav, product, productId, qc, router, withBusy]);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const headerOptions = useInventoryHeader("process", {
		title: "Restore Service",
		disabled: isUiDisabled,
		onExit,
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						<BAIText variant='caption' muted>
							Restored services return to active lists and can be sold in POS again.
						</BAIText>

						<View style={{ height: 12 }} />

						{query.isLoading ? (
							<BAIText variant='caption' muted>
								Loading service...
							</BAIText>
						) : query.isError ? (
							<View style={styles.stateBlock}>
								<BAIText variant='caption' muted>
									Could not load service.
								</BAIText>
								<BAIRetryButton variant='outline' onPress={() => query.refetch()} disabled={isUiDisabled}>
									Retry
								</BAIRetryButton>
							</View>
						) : !product ? (
							<BAIText variant='caption' muted>
								Service not found.
							</BAIText>
						) : !isService ? (
							<BAIText variant='caption' muted>
								This screen is only for services.
							</BAIText>
						) : !canRestore ? (
							<BAIText variant='caption' muted>
								This service is already active.
							</BAIText>
						) : (
							<BAIText variant='body'>This action will restore “{product.name}”.</BAIText>
						)}

						{error ? (
							<>
								<View style={{ height: 10 }} />
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									{error}
								</BAIText>
							</>
						) : null}

						<View style={{ height: 14 }} />

						<View style={styles.actionsRow}>
							<BAIButton
								shape='pill'
								widthPreset='standard'
								variant='outline'
								intent='neutral'
								onPress={onExit}
								disabled={isUiDisabled}
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>

							<BAICTAPillButton
								variant='solid'
								intent='primary'
								onPress={onConfirmRestore}
								disabled={!canRestore || isUiDisabled}
								style={styles.actionBtn}
							>
								Restore
							</BAICTAPillButton>
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		padding: 12,
	},
	card: {
		borderRadius: 18,
	},
	stateBlock: {
		gap: 10,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 12,
	},
	actionBtn: {
		flex: 1,
	},
});
