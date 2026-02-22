// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/units/create.tsx
//
// Create Unit (Category selection) — custom units
// - Back returns to the previous screen without committing selection
// - Next advances to custom unit details

import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import {
	mapInventoryRouteToScope,
	resolveInventoryRouteScope,
	type InventoryRouteScope,
} from "@/modules/inventory/navigation.scope";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";

import { useAppBusy } from "@/hooks/useAppBusy";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import type { UnitCategory } from "@/modules/units/units.types";
import {
	DRAFT_ID_KEY,
	RETURN_TO_KEY,
	UNIT_CONTEXT_PRODUCT_TYPE_KEY,
	type UnitProductType,
	parseUnitSelectionParams,
	UNIT_CUSTOM_CREATE_ROUTE,
	buildOpenUnitCustomCreateParams,
	UNIT_CREATE_CATEGORY_KEY,
	UNIT_PICKER_ROUTE,
	UNIT_SELECTED_ID_KEY,
	UNIT_SELECT_ROUTE,
} from "@/modules/units/unitPicker.contract";
import {
	ADD_ITEM_ROUTE,
	CREATE_ITEM_ROUTE,
	SETTINGS_ITEMS_SERVICES_ADD_ITEM_ROUTE,
	SETTINGS_ITEMS_SERVICES_CREATE_ITEM_ROUTE,
	SETTINGS_UNITS_ROUTE,
	UNITS_INDEX_ROUTE,
	clearUnitSelectionParams,
	resolveReturnTo,
} from "@/modules/units/units.navigation";
import { useUnitFlowBackGuard } from "@/modules/units/useUnitFlowBackGuard";

const CUSTOM_CATEGORY: UnitCategory = "CUSTOM";

function normalize(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

function toProductType(raw: unknown): UnitProductType {
	return normalize(raw) === "SERVICE" ? "SERVICE" : "PHYSICAL";
}

export default function UnitsCreateCategoryScreen({ routeScope }: { routeScope?: InventoryRouteScope } = {}) {
	const router = useRouter();
	const navigation = useNavigation();
	const params = useLocalSearchParams();
	const { withBusy, busy } = useAppBusy();

	const inbound = useMemo(() => parseUnitSelectionParams(params as any), [params]);
	const draftId = inbound.draftId || normalize((params as any)[DRAFT_ID_KEY]) || "";
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
	const [category] = useState<UnitCategory>(CUSTOM_CATEGORY);

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

	const onCancel = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		exitRef.current = true;
		clearUnitSelectionParams(router as any);

		if (inbound.createUnitCategory) {
			router.replace({
				pathname: toScopedRoute(UNIT_SELECT_ROUTE) as any,
				params: {
					[RETURN_TO_KEY]: returnTo,
					[DRAFT_ID_KEY]: draftId || undefined,
					[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
					[UNIT_CREATE_CATEGORY_KEY]: inbound.createUnitCategory,
				} as any,
			});
			return;
		}

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
		inbound.createUnitCategory,
		inbound.hasSelectionKey,
		inbound.selectedUnitId,
		isUiDisabled,
		lockNav,
		productType,
		returnTo,
		router,
		toScopedRoute,
	]);
	const guardedOnCancel = useProcessExitGuard(onCancel, false);

	const headerOptions = useInventoryHeader("process", {
		title: "Create Custom Unit",
		disabled: isUiDisabled,
		onExit: guardedOnCancel,
		exitFallbackRoute: "/(app)/(tabs)/inventory",
	});

	const onNext = useCallback(async () => {
		if (isUiDisabled || !lockNav()) return;

		await withBusy("Saving unit…", async () => {
			exitRef.current = true;
			router.replace({
				pathname: toScopedRoute(UNIT_CUSTOM_CREATE_ROUTE) as any,
				params: buildOpenUnitCustomCreateParams({
					returnTo,
					draftId: draftId || undefined,
					productType,
					initialCategory: CUSTOM_CATEGORY,
					selectedUnitId: inbound.selectedUnitId || undefined,
				}),
			});
		});
	}, [draftId, inbound.selectedUnitId, isUiDisabled, lockNav, productType, returnTo, router, toScopedRoute, withBusy]);

	useUnitFlowBackGuard(navigation, exitRef, guardedOnCancel);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>

			<BAIScreen padded={false} safeTop={false} safeBottom={false} style={{ flex: 1 }}>
				<BAISurface style={styles.card} padded>
					<BAIText variant='caption' muted>
						Custom units are created under the Custom category.
					</BAIText>

					<View style={{ height: 12 }} />

					<View style={styles.actionsRow}>
						<BAIButton
							variant='outline'
							compact
							onPress={guardedOnCancel}
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

					<BAIText variant='caption' muted>
						Category: {category}
					</BAIText>

					<View style={{ height: 24 }} />
				</BAISurface>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	card: {
		marginHorizontal: 16,
		marginTop: 0,
		borderRadius: 24,
		paddingBottom: 0,
	},
	actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	inlineCancel: { flex: 1 },
	inlineNext: { flex: 1 },
});
