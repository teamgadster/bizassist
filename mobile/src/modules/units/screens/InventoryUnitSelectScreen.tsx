// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/units/select.tsx
//
// Add Unit (Category-specific) — catalog enablement
// IMPORTANT:
// - This screen uses catalog categories (COUNT is UI-only).
// - Count units default to precision 0 (1) unless overridden.
// - The server should return category COUNT for count-like units.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import {
	mapInventoryRouteToScope,
	resolveInventoryRouteScope,
	type InventoryRouteScope,
} from "@/modules/inventory/navigation.scope";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAButton, BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIRadioRow } from "@/components/ui/BAIRadioRow";

import { BAIDivider } from "@/components/ui/BAIDivider";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { unitsApi } from "@/modules/units/units.api";
import { syncUnitListCaches } from "@/modules/units/units.cache";
import { unitKeys } from "@/modules/units/units.queries";
import type { PrecisionScale, Unit } from "@/modules/units/units.types";
import {
	buildUnitSelectionParams,
	DRAFT_ID_KEY,
	RETURN_TO_KEY,
	UNIT_CONTEXT_PRODUCT_TYPE_KEY,
	UNIT_CUSTOM_CREATE_ROUTE,
	type UnitProductType,
	parseUnitSelectionParams,
	UNIT_CREATE_CATEGORY_KEY,
	UNIT_ADD_ROUTE,
} from "@/modules/units/unitPicker.contract";
import {
	ADD_ITEM_ROUTE,
	clearUnitSelectionParams,
	CREATE_ITEM_ROUTE,
	replaceToReturnTo,
	resolveReturnTo,
	SETTINGS_ITEMS_SERVICES_ADD_ITEM_ROUTE,
	SETTINGS_ITEMS_SERVICES_CREATE_ITEM_ROUTE,
} from "@/modules/units/units.navigation";
import { useUnitFlowBackGuard } from "@/modules/units/useUnitFlowBackGuard";

import { UNIT_CATALOG, type UnitCategory as CatalogUnitCategory, type UnitItem } from "@/features/units/unitCatalog";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";

const DEFAULT_PRECISION: PrecisionScale = 2;
const PRECISION_OPTIONS: PrecisionScale[] = [0, 1, 2, 3, 4, 5];
const COUNT_CATALOG_ID = "ea";

function categoryDefaultPrecision(category: CatalogUnitCategory): PrecisionScale {
	if (category === "COUNT") return 0;
	if (category === "WEIGHT") return 3;
	if (category === "VOLUME") return 3;
	if (category === "LENGTH") return 2;
	if (category === "AREA") return 2;
	if (category === "TIME") return 2;
	return DEFAULT_PRECISION;
}

function categoryMaxPrecision(category: CatalogUnitCategory): PrecisionScale {
	if (category === "COUNT") return 5;
	return 5;
}

function normalize(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

function toProductType(raw: unknown): UnitProductType {
	return normalize(raw) === "SERVICE" ? "SERVICE" : "PHYSICAL";
}

function toNumberOrNull(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function clampPrecision(raw: unknown, fallback: PrecisionScale = DEFAULT_PRECISION): PrecisionScale {
	const n = toNumberOrNull(raw);
	const x = Number.isFinite(n as number) ? Math.max(0, Math.min(5, Math.trunc(n as number))) : fallback;
	return x as PrecisionScale;
}

function precisionSuffix(scale: PrecisionScale): string {
	if (scale <= 0) return "(1)";
	return `(.${"0".repeat(Math.min(5, Math.max(1, scale)))})`;
}

function categoryLabel(cat: CatalogUnitCategory): string {
	if (cat === "COUNT") return "Count";
	if (cat === "WEIGHT") return "Weight";
	if (cat === "VOLUME") return "Volume";
	if (cat === "LENGTH") return "Length";
	if (cat === "AREA") return "Area";
	if (cat === "TIME") return "Time";
	return "Category";
}

function normalizeCatalogCategory(raw: unknown): CatalogUnitCategory | null {
	if (typeof raw !== "string") return null;
	const normalized = raw.trim().toUpperCase();
	if (!normalized) return null;
	const allowed: CatalogUnitCategory[] = ["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA", "TIME"];
	return allowed.includes(normalized as CatalogUnitCategory) ? (normalized as CatalogUnitCategory) : null;
}

function normKey(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function catalogToUnitCategory(cat: CatalogUnitCategory): Unit["category"] {
	return cat;
}

function resolveCatalogToExisting(governedUnits: Unit[], item: UnitItem): Unit | null {
	const sym = normKey(item.symbol);
	const name = normKey(item.name);
	const expectedCategory = catalogToUnitCategory(item.category);
	const eligible = governedUnits.filter((u) => u.category === expectedCategory);

	const byAbbr = eligible.find((u) => normKey(u.abbreviation ?? "") === sym) ?? null;
	if (byAbbr) return byAbbr;

	const byName = eligible.find((u) => normKey(u.name) === name) ?? null;
	return byName;
}

export default function UnitSelectScreen({ routeScope }: { routeScope?: InventoryRouteScope } = {}) {
	const router = useRouter();
	const navigation = useNavigation();
	const params = useLocalSearchParams();
	const queryClient = useQueryClient();
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

	const category = useMemo<CatalogUnitCategory>(() => {
		const raw = normalizeCatalogCategory((params as any)[UNIT_CREATE_CATEGORY_KEY]);
		if (raw) return raw;

		const parsed = normalizeCatalogCategory(inbound.createUnitCategory);
		if (parsed) return parsed;

		return "COUNT";
	}, [inbound.createUnitCategory, params]);
	const unitGroupLabel = categoryLabel(category);
	const defaultCategoryPrecision = categoryDefaultPrecision(category);
	const maxCategoryPrecision = categoryMaxPrecision(category);
	const maxAllowedPrecision: PrecisionScale = maxCategoryPrecision;

	const defaultPrecision = defaultCategoryPrecision;
	const [selectedPrecision, setSelectedPrecision] = useState<PrecisionScale>(() =>
		clampPrecision(
			(params as any).selectedUnitPrecisionScale ?? inbound.selectedUnitPrecisionScale ?? defaultPrecision,
			defaultPrecision,
		),
	);
	const precisionOptions: PrecisionScale[] = PRECISION_OPTIONS.filter((p) => p <= maxAllowedPrecision);

	useEffect(() => {
		if (selectedPrecision > maxAllowedPrecision) {
			setSelectedPrecision(defaultPrecision);
		}
	}, [defaultPrecision, maxAllowedPrecision, selectedPrecision]);

	const unitsQuery = useQuery<Unit[]>({
		queryKey: unitKeys.list({ includeArchived: false }),
		queryFn: () => unitsApi.listUnits({ includeArchived: false }),
		staleTime: 30_000,
	});

	const governed = useMemo(() => (unitsQuery.data ?? []).filter((u) => u.isActive), [unitsQuery.data]);

	const catalogUnits = useMemo(() => {
		const list = UNIT_CATALOG.filter((u) => u.category === category);
		if (category !== "COUNT") return list;

		return [...list].sort((a, b) => {
			const byName = a.name.localeCompare(b.name);
			if (byName !== 0) return byName;
			return a.symbol.localeCompare(b.symbol);
		});
	}, [category]);

	const availableCatalogUnits = useMemo(
		() => (catalogUnits as UnitItem[]).filter((u) => !resolveCatalogToExisting(governed, u)),
		[catalogUnits, governed],
	);

	const defaultCatalogId = useMemo(() => {
		if (category === "COUNT") {
			const countUnit = availableCatalogUnits.find((u) => u.id === COUNT_CATALOG_ID);
			if (countUnit) return countUnit.id;
		}
		return availableCatalogUnits[0]?.id ?? "";
	}, [availableCatalogUnits, category]);

	const [selectedCatalogId, setSelectedCatalogId] = useState<string>(() => defaultCatalogId);

	useEffect(() => {
		if (!availableCatalogUnits.length) {
			setSelectedCatalogId("");
			return;
		}
		const stillExists = availableCatalogUnits.some((u) => u.id === selectedCatalogId);
		if (!stillExists) setSelectedCatalogId(defaultCatalogId);
	}, [availableCatalogUnits, defaultCatalogId, selectedCatalogId]);

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

	const exitRef = useRef(false);

	const selectedCatalogItem = useMemo(
		() => availableCatalogUnits.find((u) => u.id === selectedCatalogId) ?? null,
		[availableCatalogUnits, selectedCatalogId],
	);

	const onCancel = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		exitRef.current = true;
		clearUnitSelectionParams(router as any);
		router.replace({
			pathname: toScopedRoute(UNIT_ADD_ROUTE) as any,
			params: {
				[RETURN_TO_KEY]: returnTo,
				[DRAFT_ID_KEY]: draftId || undefined,
				[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
				[UNIT_CREATE_CATEGORY_KEY]: category,
				selectedUnitPrecisionScale: String(selectedPrecision),
			} as any,
		});
	}, [category, draftId, isUiDisabled, lockNav, productType, returnTo, router, selectedPrecision, toScopedRoute]);
	const guardedOnCancel = useProcessExitGuard(onCancel, false);

	const openCustomCreate = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		exitRef.current = true;
		router.replace({
			pathname: toScopedRoute(UNIT_CUSTOM_CREATE_ROUTE) as any,
			params: {
				[RETURN_TO_KEY]: returnTo,
				[DRAFT_ID_KEY]: draftId || undefined,
				[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
				[UNIT_CREATE_CATEGORY_KEY]: "CUSTOM",
			} as any,
		});
	}, [draftId, isUiDisabled, lockNav, productType, returnTo, router, toScopedRoute]);

	const updateUnitCache = useCallback(
		(unit: Unit) => {
			syncUnitListCaches(queryClient, unit);
		},
		[queryClient],
	);

	const onSave = useCallback(async () => {
		if (isUiDisabled || !lockNav()) return;
		if (!selectedCatalogItem) return;

		await withBusy("Saving unit...", async () => {
			const catalogItem = selectedCatalogItem as UnitItem;
			const existing = resolveCatalogToExisting(governed, catalogItem);
			const unit =
				existing ??
				(await unitsApi.enableCatalogUnit({
					intent: "ENABLE_CATALOG",
					catalogId: catalogItem.id,
					precisionScale: selectedPrecision,
				}));

			updateUnitCache(unit);

			const selectionParams = buildUnitSelectionParams({
				selectedUnitId: unit.id,
				selectedUnitName: unit.name,
				selectedUnitAbbreviation: unit.abbreviation ?? "",
				selectedUnitCategory: unit.category,
				selectedUnitPrecisionScale: unit.precisionScale ?? selectedPrecision,
				selectionSource: "created",
				draftId: draftId || undefined,
				returnTo,
				productType,
			});

			exitRef.current = true;
			clearUnitSelectionParams(router as any);
			replaceToReturnTo(router as any, returnTo, selectionParams);
		});
	}, [
		draftId,
		governed,
		isUiDisabled,
		lockNav,
		productType,
		returnTo,
		router,
		selectedCatalogItem,
		selectedPrecision,
		updateUnitCache,
		withBusy,
	]);

	// Header Navigation Governance:
	// - This is a "process" screen (intentful flow). Exit cancels intent deterministically via onCancel.
	const headerOptions = useInventoryHeader("process", {
		title: "Add Unit",
		disabled: isUiDisabled,
		onExit: guardedOnCancel,
		exitFallbackRoute: "/(app)/(tabs)/inventory",
	});

	useUnitFlowBackGuard(navigation, exitRef, guardedOnCancel);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>

			<BAIScreen tabbed padded={false} safeTop={false} style={{ flex: 1 }}>
				<BAISurface style={styles.card} padded>
					<View style={styles.titleRow}>
						<BAIText variant='title'>{`Add Unit · ${categoryLabel(category)}`}</BAIText>
					</View>
					<View style={{ height: 6 }} />
					<BAIText variant='caption' muted>
						{`Unit group: ${unitGroupLabel}`}
					</BAIText>

					<View style={{ height: 10 }} />

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
							onPress={onSave}
							disabled={!selectedCatalogItem || isUiDisabled}
							style={styles.inlineSave}
						>
							Save
						</BAICTAPillButton>
					</View>

					<View style={{ height: 12 }} />

					<ScrollView
						style={styles.listScroll}
						contentContainerStyle={styles.listContent}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps='handled'
					>
						{availableCatalogUnits.length === 0 ? (
							<BAIText variant='body' muted>
								All units in this category are already enabled.
							</BAIText>
						) : (
							availableCatalogUnits.map((u) => (
								<View key={u.id} style={styles.rowWrap}>
									<BAIRadioRow
										title={`${u.name}   (${u.symbol})`}
										selected={selectedCatalogId === u.id}
										onPress={() => setSelectedCatalogId(u.id)}
									/>
								</View>
							))
						)}

						<>
							<View style={{ height: 30 }} />
							<BAIDivider thickness={0.75} inset={14} />
							<View style={{ height: 18 }} />

							<BAIText variant='title' muted>
								✅ Precision
							</BAIText>

							<View style={{ height: 8 }} />

							{precisionOptions.map((p) => {
								const suffix = precisionSuffix(p);
								const label = p === 0 ? "Whole units (1)" : `${p} decimal${p === 1 ? "" : "s"} ${suffix}`;
								return (
									<View key={String(p)} style={styles.rowWrap}>
										<BAIRadioRow
											title={label}
											selected={selectedPrecision === p}
											onPress={() => setSelectedPrecision(p)}
										/>
									</View>
								);
							})}
						</>

						<View style={{ height: 24 }} />
						<BAIDivider thickness={0.75} inset={14} />
						<View style={{ height: 20 }} />

						<BAICTAButton variant='outline' onPress={openCustomCreate} disabled={isUiDisabled}>
							Create Custom Unit
						</BAICTAButton>
					</ScrollView>
				</BAISurface>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	card: { marginHorizontal: 16, marginTop: 0, borderRadius: 24, flex: 1, paddingBottom: 0 },
	titleRow: { flexDirection: "row", alignItems: "center" },
	actionsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	inlineSave: { flex: 1 },
	inlineCancel: { flex: 1 },
	rowWrap: { paddingTop: 10 },
	listScroll: { flex: 1 },
	listContent: { paddingBottom: 24 },
});
