// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/units/add.tsx
//
// Add Unit (Category selection) — catalog enablement
// Header Navigation Governance:
// - PROCESS screen: Exit (X) cancels intent deterministically; no Back semantics.
// - Next navigates to the catalog list for the selected category.

import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import {
	mapInventoryRouteToScope,
	resolveInventoryRouteScope,
	type InventoryRouteScope,
} from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useNavigation } from "@react-navigation/native";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIRadioRow } from "@/components/ui/BAIRadioRow";

import { useAppBusy } from "@/hooks/useAppBusy";
import type { PrecisionScale, UnitCategory } from "@/modules/units/units.types";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import {
	DRAFT_ID_KEY,
	RETURN_TO_KEY,
	UNIT_CONTEXT_PRODUCT_TYPE_KEY,
	type UnitProductType,
	parseUnitSelectionParams,
	UNIT_SELECT_ROUTE,
	UNIT_CREATE_CATEGORY_KEY,
	UNIT_PICKER_ROUTE,
	UNIT_SELECTED_ID_KEY,
} from "@/modules/units/unitPicker.contract";
import {
	ADD_ITEM_ROUTE,
	clearUnitSelectionParams,
	CREATE_ITEM_ROUTE,
	SETTINGS_ITEMS_SERVICES_ADD_ITEM_ROUTE,
	SETTINGS_ITEMS_SERVICES_CREATE_ITEM_ROUTE,
	resolveReturnTo,
	SETTINGS_UNITS_ROUTE,
	UNITS_INDEX_ROUTE,
} from "@/modules/units/units.navigation";
import { useUnitFlowBackGuard } from "@/modules/units/useUnitFlowBackGuard";

const DEFAULT_CATEGORY: UnitCategory = "WEIGHT";
const DEFAULT_PRECISION: PrecisionScale = 2;
const DEFAULT_COUNT_PRECISION: PrecisionScale = 0;

function normalize(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

function toProductType(raw: unknown): UnitProductType {
	return normalize(raw) === "SERVICE" ? "SERVICE" : "PHYSICAL";
}

function allowedCategories(pt: UnitProductType, includeServiceUnits: boolean): UnitCategory[] {
	// Catalog enablement mirrors the unit categories shown in creation flows.
	if (pt === "SERVICE" || includeServiceUnits) return ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME"];
	return ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME"];
}

function categoryLabel(c: UnitCategory): string {
	if (c === "COUNT") return "Count";
	if (c === "WEIGHT") return "Weight";
	if (c === "VOLUME") return "Volume";
	if (c === "LENGTH") return "Length";
	if (c === "AREA") return "Area";
	if (c === "TIME") return "Time";
	return String(c);
}

export default function UnitsAddCategoryScreen({ routeScope }: { routeScope?: InventoryRouteScope } = {}) {
	const router = useRouter();
	const navigation = useNavigation();
	const params = useLocalSearchParams();
	const { withBusy, busy } = useAppBusy();

	const inbound = useMemo(() => parseUnitSelectionParams(params as any), [params]);
	const draftId = inbound.draftId || "";
	const fallbackReturnTo = useMemo(() => {
		if (routeScope === "settings-items-services") {
			return draftId ? SETTINGS_ITEMS_SERVICES_CREATE_ITEM_ROUTE : SETTINGS_ITEMS_SERVICES_ADD_ITEM_ROUTE;
		}
		return draftId ? CREATE_ITEM_ROUTE : ADD_ITEM_ROUTE;
	}, [draftId, routeScope]);

	const returnTo = resolveReturnTo(params as Record<string, unknown>, fallbackReturnTo);
	const effectiveRouteScope = useMemo(() => routeScope ?? resolveInventoryRouteScope(returnTo), [routeScope, returnTo]);
	const toScopedRoute = useCallback(
		(route: string) => mapInventoryRouteToScope(route, effectiveRouteScope),
		[effectiveRouteScope],
	);

	const productType = useMemo(() => toProductType((params as any)[UNIT_CONTEXT_PRODUCT_TYPE_KEY]), [params]);
	const isStandaloneUnitsFlow = !inbound.hasSelectionKey;
	const allowed = useMemo(
		() => allowedCategories(productType, isStandaloneUnitsFlow),
		[isStandaloneUnitsFlow, productType],
	);
	const categories = useMemo(() => allowed, [allowed]);

	const [category, setCategory] = useState<UnitCategory>(() => {
		const fromParam = inbound.createUnitCategory;
		if (allowed.includes(fromParam)) return fromParam;
		return allowed.includes(DEFAULT_CATEGORY) ? DEFAULT_CATEGORY : allowed[0];
	});

	const exitRef = useRef(false);

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

	const isUiDisabled = busy.isBusy || isNavLocked;

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		exitRef.current = true;
		clearUnitSelectionParams(router as any);

		// When launched from standalone Unit management screens, cancel should return there.
		if (!inbound.hasSelectionKey && (returnTo === UNITS_INDEX_ROUTE || returnTo === SETTINGS_UNITS_ROUTE)) {
			router.replace(returnTo as any);
			return;
		}

		router.replace({
			pathname: toScopedRoute(UNIT_PICKER_ROUTE) as any,
			params: {
				[RETURN_TO_KEY]: returnTo,
				[DRAFT_ID_KEY]: draftId || undefined,
				[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
				...(inbound.selectedUnitId ? { [UNIT_SELECTED_ID_KEY]: inbound.selectedUnitId } : {}),
			} as any,
		});
	}, [
		draftId,
		inbound.hasSelectionKey,
		inbound.selectedUnitId,
		isUiDisabled,
		lockNav,
		productType,
		returnTo,
		router,
		toScopedRoute,
	]);
	const guardedOnExit = useProcessExitGuard(onExit, false);

	const headerOptions = useInventoryHeader("process", {
		title: "Unit Category",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: "/(app)/(tabs)/inventory",
	});

	const onNext = useCallback(async () => {
		if (isUiDisabled || !lockNav()) return;
		const nextCategory = category;
		const nextPrecision = nextCategory === "COUNT" ? DEFAULT_COUNT_PRECISION : DEFAULT_PRECISION;

		await withBusy("Saving unit...", async () => {
			exitRef.current = true;
			router.replace({
				pathname: toScopedRoute(UNIT_SELECT_ROUTE) as any,
				params: {
					[RETURN_TO_KEY]: returnTo,
					[DRAFT_ID_KEY]: draftId || undefined,
					[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
					[UNIT_CREATE_CATEGORY_KEY]: nextCategory,
					selectedUnitPrecisionScale: String(nextPrecision),
				} as any,
			});
		});
	}, [category, draftId, isUiDisabled, lockNav, productType, returnTo, router, toScopedRoute, withBusy]);

	useUnitFlowBackGuard(navigation, exitRef, guardedOnExit);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>

			<BAIScreen padded={false} safeTop={false} style={{ flex: 1 }}>
				<View style={styles.screen}>
					<BAISurface style={styles.card} padded>
						<View style={styles.titleRow}>
							<View style={{ flex: 1 }}>
								<BAIText variant='title'>Select Unit Category</BAIText>
								<BAIText variant='caption' muted>
									Choose a unit category to add from the catalog.
								</BAIText>
							</View>
						</View>

						<View style={{ height: 12 }} />

						<View style={styles.actionsRow}>
							<BAIButton
								variant='outline'
								compact
								onPress={guardedOnExit}
								disabled={isUiDisabled}
								style={styles.inlineCancel}
								shape='pill'
								widthPreset='standard'
								intent='neutral'
							>
								Cancel
							</BAIButton>

							<BAICTAPillButton
								intent='primary'
								variant='solid'
								compact
								onPress={onNext}
								disabled={isUiDisabled}
								style={styles.inlineNext}
							>
								Next
							</BAICTAPillButton>
						</View>

						<View style={{ height: 16 }} />

						<View style={styles.categoryList}>
							<BAIText variant='subtitle' muted>
								Unit categories
							</BAIText>
							{categories.map((c) => (
								<BAIRadioRow
									key={c}
									title={categoryLabel(c)}
									selected={category === c}
									onPress={() => setCategory(c)}
								/>
							))}
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, paddingHorizontal: 16, paddingTop: 0 },
	card: { marginHorizontal: 0, marginTop: 0, borderRadius: 24, paddingBottom: 14 },
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	inlineCancel: { flex: 1 },
	inlineNext: { flex: 1 },
	categoryList: { gap: 10 },
});
