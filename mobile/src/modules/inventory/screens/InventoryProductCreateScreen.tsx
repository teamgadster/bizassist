// BizAssist_mobile
// path: src/modules/inventory/screens/InventoryProductCreateScreen.tsx
//
// UDQI FINAL (Jan 2026):
// - Hard cap: 18 characters for Initial on hand + Reorder point.
// - Blur now normalizes to full unit precision (e.g., scale 5: "50.00" → "50.00000").
// - Submit-time normalization: right-pad zeros to Unit.precisionScale and submit fixed-scale decimal strings.
// - Reject trailing dot at submit.
// - Clamp fractional digits while typing (<= precisionScale).
// - No “cents shifting”: typing "12" stays "12" even if scale=2/5.
// - No UI/layout changes.
//
// ✅ MIN SAFE FIX (this patch):
// - Enforce UDQI integer-digit cap (12 digits) on Initial on hand + Reorder point, same as adjust.tsx,
//   to prevent DB numeric overflow (Prisma P2020) while preserving natural typing.
//
// ✅ FIX (Jan 2026):
// - Resolve TS error: Cancel button referenced undefined onBackToAddItems.
//   Governance: This is a process screen, so Cancel should share Exit semantics (cancel intent).
//   Solution: wire Cancel to onExitToAddItems.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesome6 } from "@expo/vector-icons";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIIconButton } from "@/components/ui/BAIIconButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIMoneyInput } from "@/components/ui/BAIMoneyInput";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { BAITextarea } from "@/components/ui/BAITextarea";
import { BAIPressableRow } from "@/components/ui/BAIPressableRow";
import { BAISwitchRow } from "@/components/ui/BAISwitchRow";
import { ConfirmActionModal } from "@/components/settings/ConfirmActionModal";

import { useAppBusy } from "@/hooks/useAppBusy";
import { useAppToast } from "@/providers/AppToastProvider";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";

import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import {
	sanitizeLabelInput,
	sanitizeMoneyInput,
	sanitizeProductNameDraftInput,
	sanitizeProductNameInput,
	sanitizeDescriptionDraftInput,
	sanitizeDescriptionInput,
	sanitizeSkuInput,
} from "@/shared/validation/sanitize";
import { GTIN_MAX_LENGTH, sanitizeGtinInput, validateGtinValue } from "@/shared/validation/gtin";
import { inventoryApi } from "@/modules/inventory/inventory.api";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { inventoryScopeRoot, mapInventoryRouteToScope, type InventoryRouteScope } from "@/modules/inventory/navigation.scope";
import { runGovernedExitReplace } from "@/modules/inventory/navigation.governance";
import { invalidateInventoryAfterMutation } from "@/modules/inventory/inventory.invalidate";
import type { CreateProductInput } from "@/modules/inventory/inventory.types";
import { uploadProductImage } from "@/modules/media/media.upload";
import { toMediaDomainError } from "@/modules/media/media.errors";

import {
	CATEGORY_PICKER_ROUTE,
	DRAFT_ID_KEY as CATEGORY_DRAFT_ID_KEY,
	RETURN_TO_KEY as CATEGORY_RETURN_TO_KEY,
	parseCategorySelectionParams,
	CATEGORY_SELECTED_ID_KEY,
	CATEGORY_SELECTED_NAME_KEY,
	CATEGORY_SELECTION_SOURCE_KEY,
} from "@/modules/categories/categoryPicker.contract";

import { useProductCreateDraft } from "@/modules/inventory/drafts/useProductCreateDraft";
import {
	POS_TILE_ROUTE,
	DRAFT_ID_KEY as POS_TILE_DRAFT_ID_KEY,
	ROOT_RETURN_TO_KEY as POS_TILE_ROOT_RETURN_TO_KEY,
} from "@/modules/inventory/posTile.contract";

// Units
import { unitsApi } from "@/modules/units/units.api";
import { syncUnitListCaches } from "@/modules/units/units.cache";
import { unitKeys } from "@/modules/units/units.queries";
import type { Unit, PrecisionScale } from "@/modules/units/units.types";
import { getEachUnit } from "@/modules/units/units.visibility";
import {
	UNIT_PICKER_ROUTE,
	parseUnitSelectionParams,
	UNIT_SELECTED_ID_KEY,
	UNIT_SELECTED_NAME_KEY,
	UNIT_SELECTED_ABBR_KEY,
	UNIT_SELECTED_CATEGORY_KEY,
	UNIT_SELECTED_PRECISION_KEY,
	UNIT_SELECTION_SOURCE_KEY,
	UNIT_CONTEXT_PRODUCT_TYPE_KEY,
	RETURN_TO_KEY,
	DRAFT_ID_KEY,
} from "@/modules/units/unitPicker.contract";

const INVENTORY_THIS_ROUTE = "/(app)/(tabs)/inventory/products/create" as const;
const INVENTORY_ADD_ITEMS_ROUTE = "/(app)/(tabs)/inventory/add-item" as const;
const SCANNED_BARCODE_KEY = "scannedBarcode" as const;
const INVENTORY_SCAN_ROUTE = "/(app)/(tabs)/inventory/scan" as const;

const DEFAULT_PRECISION: PrecisionScale = 2;
const COUNT_PRECISION: PrecisionScale = 0;
const COUNT_CATALOG_ID = "ea";
const COUNT_DISPLAY_NAME = "Per Piece";
const COUNT_DISPLAY_ABBR = "pc";

// UDQI caps
const HARD_QTY_CAP = 18;
const UDQI_INT_MAX_DIGITS = 12;

function safeString(v: unknown): string {
	return typeof v === "string" ? v : String(v ?? "");
}

function toMoneyOrNull(raw: string): number | null {
	const sanitized = sanitizeMoneyInput(String(raw ?? ""));
	const v = sanitized.trim();
	if (!v) return null;

	const n = Number(v);
	if (!Number.isFinite(n)) return null;
	if (n < 0) return null;
	return n;
}

/**
 * UDQI: Quantity input invariant (Create Item; non-negative):
 * - digits + optional single dot
 * - max `scale` decimals
 * - no negative values
 * - allows "10." during typing (submit blocks trailing '.')
 * - must not behave like “cents input”: "12" stays "12"
 */
function sanitizeQuantityInput(raw: string, scale: number): string {
	let v = String(raw ?? "")
		.replace(/,/g, "")
		.trim();

	if (!v) return "";

	// Strip everything except digits and dot
	v = v.replace(/[^\d.]/g, "");

	// Collapse multiple dots into one
	const parts = v.split(".");
	if (parts.length > 2) {
		v = parts[0] + "." + parts.slice(1).join("");
	}

	// If scale is 0, remove dots entirely (whole numbers only)
	if (scale <= 0) {
		return v.replace(/\./g, "");
	}

	// Clamp fractional length to scale
	if (v.includes(".")) {
		const [int, dec = ""] = v.split(".");
		v = int + "." + dec.slice(0, Math.max(0, Math.trunc(scale)));
	}

	return v;
}

function capText(raw: string, maxLen: number) {
	if (maxLen <= 0) return "";
	return raw.length > maxLen ? raw.slice(0, maxLen) : raw;
}


/**
 * ✅ MIN SAFE FIX (Create):
 * Enforce UDQI integer digit cap (12) + scale fractional cap, keeping natural typing.
 * - Non-negative only (Create screen does not allow negatives).
 * - At most 1 '.' (already ensured by sanitizeQuantityInput).
 * - Cap integer digits to UDQI_INT_MAX_DIGITS.
 * - Cap fractional digits to `scale`.
 * - Apply HARD_QTY_CAP as final safety net.
 */
function enforceUdiqCaps(sanitized: string, scale: number, hardCap: number) {
	let s = String(sanitized ?? "");
	if (!s) return "";

	if (scale <= 0) {
		const intOnly = s.replace(/\./g, "");
		const cappedInt = intOnly.slice(0, UDQI_INT_MAX_DIGITS);
		return capText(cappedInt, hardCap);
	}

	if (s.includes(".")) {
		const [intPartRaw, fracRaw = ""] = s.split(".");
		const intPart = intPartRaw.slice(0, UDQI_INT_MAX_DIGITS);
		const frac = fracRaw.slice(0, Math.max(0, Math.trunc(scale)));
		return capText(intPart + "." + frac, hardCap);
	}

	// no dot: integer typing
	return capText(s.slice(0, UDQI_INT_MAX_DIGITS), hardCap);
}

/**
 * Placeholder must reflect precision: scale 0 => "0", scale 2 => "0.00", scale 5 => "0.00000"
 */
function formatZeroPlaceholder(scale: number): string {
	const s = Math.max(0, Math.trunc(Number(scale) || 0));
	if (s <= 0) return "0";
	return "0." + "0".repeat(s);
}

function countFractionDigits(decimal: string): number {
	const s = String(decimal ?? "").trim();
	if (!s) return 0;
	const dot = s.indexOf(".");
	if (dot < 0) return 0;
	return Math.max(0, s.length - dot - 1);
}

function clampPrecisionScale(raw: unknown): PrecisionScale {
	const n = typeof raw === "number" ? raw : Number(raw);
	const clamped = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.trunc(n))) : DEFAULT_PRECISION;
	return clamped as PrecisionScale;
}

function normalizeUnitKey(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function isEachUnit(name: string | undefined, abbr: string | undefined, category?: string): boolean {
	if (category !== "COUNT") return false;
	const normalizedName = normalizeUnitKey(name);
	const normalizedAbbr = normalizeUnitKey(abbr ?? "");
	return normalizedName === "each" || normalizedName === "per piece" || normalizedAbbr === COUNT_CATALOG_ID;
}

function displayUnitName(name: string | undefined, abbr: string | undefined, category?: string): string {
	if (isEachUnit(name, abbr, category)) return COUNT_DISPLAY_NAME;
	return (name ?? "").trim();
}

function displayUnitValueInline(name: string, abbr: string, category?: string): string {
	const n = (name ?? "").trim();
	const a = (abbr ?? "").trim();

	if (isEachUnit(n, a, category)) return `${COUNT_DISPLAY_NAME} (${COUNT_DISPLAY_ABBR})`;
	if (!n) return COUNT_DISPLAY_NAME;
	if (!a) return n;
	return `${n} (${a})`;
}

function buildUnitPrecisionHelper(scale: number, unitToken: string) {
	if (scale <= 0) return `Whole numbers only (${unitToken}).`;
	if (scale === 1) return `Up to 1 decimal place (${unitToken}).`;
	return `Up to ${scale} decimal places (${unitToken}).`;
}

/**
 * UDQI FINAL: submit-time normalization only.
 * - Reject empty, "-", or trailing dot.
 * - Clamp fraction digits already handled while typing; enforce again here.
 * - Return fixed-scale decimal-string by right-padding zeros to `scale`.
 * - scale=0 => integer string (no dot).
 */
function normalizeQuantityForSubmit(
	raw: string,
	scale: number,
): { ok: true; value: string | null } | { ok: false; message: string } {
	const s0 = String(raw ?? "").trim();
	if (!s0) return { ok: true, value: null };

	if (/[eE,]/.test(s0)) return { ok: false, message: "Invalid number format." };
	if (!/^\d+(\.\d*)?$/.test(s0)) return { ok: false, message: "Enter a valid quantity." };
	if (s0.endsWith(".")) return { ok: false, message: "Quantity cannot end with a decimal point." };

	const sc = Math.max(0, Math.trunc(Number(scale) || 0));

	if (sc <= 0) {
		// whole number only; strip any dot (shouldn't exist due to typing rules)
		return { ok: true, value: s0.replace(/\./g, "") };
	}

	const [intRaw, fracRaw = ""] = s0.split(".");
	if (fracRaw.length > sc) return { ok: false, message: `Max ${sc} decimals for this unit.` };

	const intPart = intRaw.length ? intRaw : "0";
	const frac = (fracRaw + "0".repeat(sc)).slice(0, sc);
	return { ok: true, value: `${intPart}.${frac}` };
}

function normalizeQuantityForBlur(raw: string, scale: number, hardCap: number) {
	const sanitized = sanitizeQuantityInput(raw, scale);
	const capped = enforceUdiqCaps(sanitized, scale, hardCap);

	const trimmed = capped.trim();
	if (!trimmed || trimmed === "." || trimmed === "-") return "";

	const normalized = normalizeQuantityForSubmit(capped, scale);
	if (!normalized.ok) return capped;

	return normalized.value ?? "";
}

/**
 * Re-normalize stored quantity text when Unit/UDQI precision changes.
 * Preserves numeric magnitude (no decimal/cents shifting) and outputs fixed-scale text.
 */
function normalizeQuantityForUnitChange(raw: string, nextScale: number, hardCap: number) {
	let s = String(raw ?? "")
		.replace(/,/g, "")
		.trim();
	if (!s) return "";

	// Keep only numeric decimal content.
	s = s.replace(/[^\d.]/g, "");
	if (!s) return "";

	const firstDot = s.indexOf(".");
	const intRaw = firstDot >= 0 ? s.slice(0, firstDot) : s;
	const fracRaw = firstDot >= 0 ? s.slice(firstDot + 1).replace(/\./g, "") : "";

	const intPart = (intRaw.replace(/^0+(?=\d)/, "") || "0").slice(0, UDQI_INT_MAX_DIGITS);
	const sc = Math.max(0, Math.trunc(Number(nextScale) || 0));

	if (sc <= 0) {
		return capText(intPart, hardCap);
	}

	const frac = fracRaw.slice(0, sc);
	const paddedFrac = (frac + "0".repeat(sc)).slice(0, sc);
	return capText(`${intPart}.${paddedFrac}`, hardCap);
}

export default function InventoryProductCreateScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const router = useRouter();
	const theme = useTheme();
	const queryClient = useQueryClient();
	const { withBusy, busy } = useAppBusy();
	const { showSuccess } = useAppToast();
	const { currencyCode } = useActiveBusinessMeta();
	const toScopedRoute = useCallback((route: string) => mapInventoryRouteToScope(route, routeScope), [routeScope]);
	const thisRoute = useMemo(() => toScopedRoute(INVENTORY_THIS_ROUTE), [toScopedRoute]);
	const addItemsRoute = useMemo(() => {
		if (routeScope === "settings-items-services") {
			return `${inventoryScopeRoot(routeScope)}?type=ITEMS`;
		}
		return toScopedRoute(INVENTORY_ADD_ITEMS_ROUTE);
	}, [routeScope, toScopedRoute]);
	const scanRoute = useMemo(() => toScopedRoute(INVENTORY_SCAN_ROUTE), [toScopedRoute]);
	const isBusy = !!busy?.isBusy;

	// --- nav lock (mandatory)
	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [imageError, setImageError] = useState<string | null>(null);
	const [confirmExitOpen, setConfirmExitOpen] = useState(false);

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

	const params = useLocalSearchParams();

	// Draft id: prefer Unit contract key (same literal "draftId"), fallback to Category contract key (also "draftId")
	const paramDraftId = useMemo(() => {
		const a = safeString((params as any)?.[DRAFT_ID_KEY]).trim();
		if (a) return a;
		return safeString((params as any)?.[CATEGORY_DRAFT_ID_KEY]).trim();
	}, [params]);

	const { draftId, draft, patch, reset } = useProductCreateDraft(paramDraftId);
	const createdProductIdRef = useRef<string | null>(null);

	// This screen is Create Item → PHYSICAL
	const unitProductType = "PHYSICAL" as const;

	const isUiDisabled = isBusy || isNavLocked;

	const hasLocalImage = Boolean(draft.imageLocalUri && draft.imageLocalUri.trim().length > 0);
	const localImageUri = hasLocalImage ? draft.imageLocalUri.trim() : "";
	const tileMode = draft.posTileMode === "IMAGE" ? "IMAGE" : "COLOR";
	const tileColor = typeof draft.posTileColor === "string" ? draft.posTileColor : null;
	const tileLabel = useMemo(() => sanitizeLabelInput(draft.posTileLabel ?? "").trim(), [draft.posTileLabel]);
	const itemName = useMemo(() => (draft.name ?? "").trim(), [draft.name]);
	const hasLabel = tileLabel.length > 0;
	const hasItemName = itemName.length > 0;
	const hasColor = !!tileColor;
	const hasVisualTile = hasLocalImage || hasColor;
	const shouldShowEmpty = !hasVisualTile;
	const shouldShowTileTextOverlay = hasVisualTile && (hasLabel || hasItemName);
	const shouldShowNameOnlyOverlay = !hasLabel && hasItemName;
	const tileLabelColor = "#FFFFFF";
	const tileLabelBg = "rgba(0,0,0,0.45)";

	const onEditPosTile = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		setImageError(null);

		router.push({
			pathname: toScopedRoute(POS_TILE_ROUTE) as any,
			params: {
				[POS_TILE_DRAFT_ID_KEY]: draftId,
				[POS_TILE_ROOT_RETURN_TO_KEY]: thisRoute,
			},
		});
	}, [draftId, isUiDisabled, lockNav, router, thisRoute, toScopedRoute]);

	const onOpenBarcodeScanner = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		setError(null);
		router.push({
			pathname: scanRoute as any,
			params: {
				returnTo: thisRoute,
				draftId,
			},
		});
	}, [draftId, isUiDisabled, lockNav, router, scanRoute, thisRoute]);

	// --- apply scanned barcode return param ---
	useEffect(() => {
		const raw =
			typeof (params as any)?.[SCANNED_BARCODE_KEY] === "string" ? String((params as any)[SCANNED_BARCODE_KEY]) : "";
		const value = sanitizeGtinInput(raw).trim();
		if (!value) return;

		patch({ barcode: value });

		(router as any).setParams?.({
			[SCANNED_BARCODE_KEY]: undefined,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [(params as any)?.[SCANNED_BARCODE_KEY]]);

	/* ---------------- units list (default selection) ---------------- */

	const unitsQuery = useQuery<Unit[]>({
		queryKey: unitKeys.list({ includeArchived: false }),
		queryFn: () => unitsApi.listUnits({ includeArchived: false }),
		staleTime: 30_000,
	});

	const countUnit = useMemo(() => {
		const activeUnits = (unitsQuery.data ?? []).filter((u) => u.isActive);
		return getEachUnit(activeUnits);
	}, [unitsQuery.data]);

	/* ---------------- return params: category ---------------- */

	const categorySelection = useMemo(() => parseCategorySelectionParams(params as any), [params]);

	useEffect(() => {
		if (!categorySelection.hasSelectionKey) return;

		patch({
			categoryId: categorySelection.selectedCategoryId,
			categoryName: categorySelection.selectedCategoryName,
		});

		(router as any).setParams?.({
			[CATEGORY_SELECTED_ID_KEY]: undefined,
			[CATEGORY_SELECTED_NAME_KEY]: undefined,
			[CATEGORY_SELECTION_SOURCE_KEY]: undefined,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [categorySelection.hasSelectionKey, categorySelection.selectedCategoryId, categorySelection.selectedCategoryName]);

	/* ---------------- return params: unit (hardened) ---------------- */

	const unitSelection = useMemo(() => parseUnitSelectionParams(params as any), [params]);

	useEffect(() => {
		const rawSelectedId =
			typeof (params as any)?.[UNIT_SELECTED_ID_KEY] === "string"
				? String((params as any)[UNIT_SELECTED_ID_KEY]).trim()
				: "";

		const selectedUnitId = (unitSelection.selectedUnitId || rawSelectedId).trim();

		// Nothing to apply.
		if (!selectedUnitId) {
			if (unitSelection.hasSelectionKey || (params as any)?.[UNIT_SELECTED_ID_KEY] !== undefined) {
				(router as any).setParams?.({
					[UNIT_SELECTED_ID_KEY]: undefined,
					[UNIT_SELECTED_NAME_KEY]: undefined,
					[UNIT_SELECTED_ABBR_KEY]: undefined,
					[UNIT_SELECTED_CATEGORY_KEY]: undefined,
					[UNIT_SELECTED_PRECISION_KEY]: undefined,
					[UNIT_SELECTION_SOURCE_KEY]: undefined,
					[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: undefined,
				});
			}
			return;
		}

		const selectedUnitName =
			(unitSelection.selectedUnitName || String((params as any)?.[UNIT_SELECTED_NAME_KEY] ?? "")).trim() ||
			COUNT_DISPLAY_NAME;

		const selectedUnitAbbreviation = (
			unitSelection.selectedUnitAbbreviation || String((params as any)?.[UNIT_SELECTED_ABBR_KEY] ?? "")
		).trim();

		const selectedUnitCategory = String(
			unitSelection.selectedUnitCategory ?? (params as any)?.[UNIT_SELECTED_CATEGORY_KEY] ?? "COUNT",
		);

		const resolvedUnitName =
			displayUnitName(selectedUnitName, selectedUnitAbbreviation, selectedUnitCategory) || COUNT_DISPLAY_NAME;

		const incomingPrecisionRaw =
			unitSelection.selectedUnitPrecisionScale ?? (params as any)?.[UNIT_SELECTED_PRECISION_KEY] ?? DEFAULT_PRECISION;

		const incomingPrecision = clampPrecisionScale(incomingPrecisionRaw ?? DEFAULT_PRECISION);
		const normalizedPrecision =
			selectedUnitCategory === "COUNT"
				? clampPrecisionScale(incomingPrecisionRaw ?? COUNT_PRECISION)
				: incomingPrecision;

		patch({
			unitId: selectedUnitId,
			unitName: resolvedUnitName,
			unitAbbreviation: selectedUnitAbbreviation,
			unitCategory: selectedUnitCategory,
			unitPrecisionScale: normalizedPrecision,
		});

		(router as any).setParams?.({
			[UNIT_SELECTED_ID_KEY]: undefined,
			[UNIT_SELECTED_NAME_KEY]: undefined,
			[UNIT_SELECTED_ABBR_KEY]: undefined,
			[UNIT_SELECTED_CATEGORY_KEY]: undefined,
			[UNIT_SELECTED_PRECISION_KEY]: undefined,
			[UNIT_SELECTION_SOURCE_KEY]: undefined,
			[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: undefined,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		unitSelection.selectedUnitId,
		unitSelection.selectedUnitName,
		unitSelection.selectedUnitAbbreviation,
		unitSelection.selectedUnitCategory,
		unitSelection.selectedUnitPrecisionScale,
		unitSelection.hasSelectionKey,
		params,
	]);

	const countAutoRef = useRef(false);

	const upsertUnitCache = useCallback(
		(unit: Unit) => {
			syncUnitListCaches(queryClient, unit);
		},
		[queryClient],
	);

	const applyUnitSelection = useCallback(
		(unit: Unit) => {
			const normalizedPrecision =
				unit.category === "COUNT"
					? clampPrecisionScale(unit.precisionScale ?? COUNT_PRECISION)
					: clampPrecisionScale(unit.precisionScale ?? DEFAULT_PRECISION);

			const resolvedName = displayUnitName(unit.name, unit.abbreviation, unit.category) || COUNT_DISPLAY_NAME;

			patch({
				unitId: unit.id,
				unitName: resolvedName,
				unitAbbreviation: unit.abbreviation ?? "",
				unitCategory: unit.category,
				unitPrecisionScale: normalizedPrecision,
			});
		},
		[patch],
	);

	useEffect(() => {
		if (draft.unitId?.trim()) return;
		if (unitSelection.hasSelectionKey) return;

		if (countUnit) {
			applyUnitSelection(countUnit);
			return;
		}

		if (countAutoRef.current || !unitsQuery.isFetched) return;
		countAutoRef.current = true;

		unitsApi
			.enableCatalogUnit({
				intent: "ENABLE_CATALOG",
				catalogId: COUNT_CATALOG_ID,
				precisionScale: COUNT_PRECISION,
			})
			.then((unit) => {
				upsertUnitCache(unit);
				applyUnitSelection(unit);
			})
			.catch(() => {
				// noop: user can still choose from Unit Type if enable fails
			});
	}, [
		applyUnitSelection,
		draft.unitId,
		countUnit,
		unitSelection.hasSelectionKey,
		unitsQuery.isFetched,
		upsertUnitCache,
	]);

	/* ---------------- Units: resolve selection (default count unit) ---------------- */

	const effectiveUnit = useMemo(() => {
		if (!draft.unitId?.trim()) {
			if (!countUnit) return null;

			return {
				id: countUnit.id,
				name: displayUnitName(countUnit.name, countUnit.abbreviation, "COUNT") || COUNT_DISPLAY_NAME,
				abbreviation: (countUnit.abbreviation ?? "").trim(),
				category: "COUNT",
				precisionScale: clampPrecisionScale(countUnit.precisionScale ?? COUNT_PRECISION),
			};
		}

		const category = String(draft.unitCategory || "COUNT");
		const precision =
			category === "COUNT"
				? clampPrecisionScale(draft.unitPrecisionScale ?? COUNT_PRECISION)
				: clampPrecisionScale(draft.unitPrecisionScale ?? DEFAULT_PRECISION);

		return {
			id: draft.unitId.trim(),
			name: displayUnitName(draft.unitName, draft.unitAbbreviation, category) || COUNT_DISPLAY_NAME,
			abbreviation: (draft.unitAbbreviation ?? "").trim(),
			category,
			precisionScale: precision,
		};
	}, [draft.unitAbbreviation, draft.unitCategory, draft.unitId, draft.unitName, draft.unitPrecisionScale, countUnit]);

	const effectiveUnitId = (effectiveUnit?.id ?? "").trim();

	// Derive scale once for the UI layer
	const effectiveScale = useMemo(() => {
		const s = Number(effectiveUnit?.precisionScale ?? 0);
		return Number.isFinite(s) ? Math.max(0, Math.trunc(s)) : 0;
	}, [effectiveUnit?.precisionScale]);

	// Hard cap for quantity-like inputs
	const qtyMaxLen = HARD_QTY_CAP;

	const quantityKeyboardType = useMemo(() => {
		return effectiveScale > 0 ? ("decimal-pad" as const) : ("number-pad" as const);
	}, [effectiveScale]);

	const unitTokenForHelper = useMemo(() => {
		const abbr = (effectiveUnit?.abbreviation ?? "").trim();
		const cat = String(effectiveUnit?.category ?? "COUNT");
		if (cat === "COUNT") return COUNT_DISPLAY_ABBR;
		if (abbr) return abbr;
		const nm = (effectiveUnit?.name ?? "").trim();
		return nm || "unit";
	}, [effectiveUnit]);

	const precisionHelperText = useMemo(
		() => buildUnitPrecisionHelper(effectiveScale, unitTokenForHelper),
		[effectiveScale, unitTokenForHelper],
	);

	const quantityPlaceholder = useMemo(() => formatZeroPlaceholder(effectiveScale), [effectiveScale]);

	// Keep quantity fields aligned with the selected Unit + UDQI precision.
	const unitUdiqKey = `${effectiveUnitId}:${effectiveScale}`;
	const previousUnitUdiqKeyRef = useRef(unitUdiqKey);

	useEffect(() => {
		if (previousUnitUdiqKeyRef.current === unitUdiqKey) return;
		previousUnitUdiqKeyRef.current = unitUdiqKey;

		const nextInitial = normalizeQuantityForUnitChange(draft.initialOnHandText, effectiveScale, qtyMaxLen);
		const nextReorder = normalizeQuantityForUnitChange(draft.reorderPointText, effectiveScale, qtyMaxLen);

		if (nextInitial === draft.initialOnHandText && nextReorder === draft.reorderPointText) return;

		patch({
			initialOnHandText: nextInitial,
			reorderPointText: nextReorder,
		});
	}, [draft.initialOnHandText, draft.reorderPointText, effectiveScale, patch, qtyMaxLen, unitUdiqKey]);

	const hasDirtyInput = useMemo(() => {
		const hasValue = (v: string) => v.trim().length > 0;

		if (hasValue(draft.name)) return true;
		if (hasValue(draft.description)) return true;
		if (hasValue(draft.sku)) return true;
		if (hasValue(draft.barcode)) return true;
		if (hasValue(draft.priceText)) return true;
		if (hasValue(draft.costText)) return true;
		if (hasValue(draft.initialOnHandText)) return true;
		if (hasValue(draft.reorderPointText)) return true;
		if (hasValue(draft.categoryId) || hasValue(draft.categoryName)) return true;
		if (hasValue(draft.imageLocalUri)) return true;

		if (!draft.trackInventory) return true;

		if (effectiveUnitId && countUnit?.id && effectiveUnitId !== countUnit.id) return true;

		return false;
	}, [
		countUnit?.id,
		draft.barcode,
		draft.categoryId,
		draft.categoryName,
		draft.costText,
		draft.description,
		draft.imageLocalUri,
		draft.initialOnHandText,
		draft.name,
		draft.priceText,
		draft.reorderPointText,
		draft.sku,
		draft.trackInventory,
		effectiveUnitId,
	]);

	/* ---------------- navigation ---------------- */

	const openCategoryPicker = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		router.replace({
			pathname: toScopedRoute(CATEGORY_PICKER_ROUTE) as any,
			params: {
				[CATEGORY_RETURN_TO_KEY]: thisRoute,
				[CATEGORY_DRAFT_ID_KEY]: draftId,

				selectedCategoryId: draft.categoryId || "",
				selectedCategoryName: draft.categoryName || "",
				selectionSource: "existing",
			} as any,
		});
	}, [draft.categoryId, draft.categoryName, draftId, isUiDisabled, lockNav, router, thisRoute, toScopedRoute]);

	const openUnitPicker = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		const current = effectiveUnit ?? {
			id: "",
			name: COUNT_DISPLAY_NAME,
			abbreviation: "",
			category: "COUNT",
			precisionScale: COUNT_PRECISION,
		};

		const currentName = (current.name || COUNT_DISPLAY_NAME).trim();
		const currentAbbr = (current.abbreviation ?? "").trim();
		const currentCategory = String(current.category || "COUNT");
		const currentPrecision =
			currentCategory === "COUNT"
				? String(clampPrecisionScale(current.precisionScale ?? COUNT_PRECISION))
				: String(clampPrecisionScale(current.precisionScale ?? DEFAULT_PRECISION));

		router.replace({
			pathname: toScopedRoute(UNIT_PICKER_ROUTE) as any,
			params: {
				[RETURN_TO_KEY]: thisRoute,
				[DRAFT_ID_KEY]: draftId,

				...(effectiveUnitId ? { [UNIT_SELECTED_ID_KEY]: effectiveUnitId } : {}),
				[UNIT_SELECTED_NAME_KEY]: currentName,
				[UNIT_SELECTED_ABBR_KEY]: currentAbbr,
				[UNIT_SELECTED_CATEGORY_KEY]: currentCategory,
				[UNIT_SELECTED_PRECISION_KEY]: currentPrecision,

				[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: unitProductType,
				[UNIT_SELECTION_SOURCE_KEY]: "existing",
			} as any,
		});
	}, [draftId, effectiveUnit, effectiveUnitId, isUiDisabled, lockNav, router, thisRoute, toScopedRoute, unitProductType]);


	/* ---------------- save ---------------- */

	const onSave = useCallback(
		async (afterSave: "detail" | "addAnother" = "detail") => {
			if (isUiDisabled) return;

			const nameTrimmed = sanitizeProductNameInput(draft.name).trim();
			if (!nameTrimmed) return;

			const finalUnitId = effectiveUnitId;
			if (!finalUnitId) {
				setError("Please select a unit.");
				return;
			}

			setError(null);

			const imageUriForUpload = tileMode === "IMAGE" ? localImageUri : "";

			await withBusy("Saving item…", async () => {
				const priceN = toMoneyOrNull(draft.priceText);
				const costN = toMoneyOrNull(draft.costText);

				if (costN !== null && priceN !== null && costN > priceN) {
					setError("Cost cannot exceed price.");
					return;
				}

				const normalizedGtin = sanitizeGtinInput(draft.barcode).trim();
				const gtinValidation = validateGtinValue(normalizedGtin);
				if (!gtinValidation.ok) {
					setError(gtinValidation.message);
					return;
				}

				const scale = effectiveScale;

				// UDQI FINAL: submit-time normalization only
				let reorderNormalized: string | null = null;
				let initialNormalized: string | null = null;

				if (draft.trackInventory) {
					const initialRes = normalizeQuantityForSubmit(draft.initialOnHandText, scale);
					if (!initialRes.ok) {
						setError(initialRes.message);
						return;
					}
					initialNormalized = initialRes.value;

					const reorderRes = normalizeQuantityForSubmit(draft.reorderPointText, scale);
					if (!reorderRes.ok) {
						setError(reorderRes.message);
						return;
					}
					reorderNormalized = reorderRes.value;

					if (initialNormalized != null && countFractionDigits(initialNormalized) > scale) {
						setError(`Initial on hand is invalid for this unit (max ${scale} decimals).`);
						return;
					}
					if (reorderNormalized != null && countFractionDigits(reorderNormalized) > scale) {
						setError(`Reorder point is invalid for this unit (max ${scale} decimals).`);
						return;
					}
				}

				const input: CreateProductInput = {
					type: "PHYSICAL",
					name: nameTrimmed,
					trackInventory: draft.trackInventory,
					sku: draft.sku.trim() || undefined,
					barcode: normalizedGtin || undefined,
					categoryId: draft.categoryId.trim() || undefined,
					description: sanitizeDescriptionInput(draft.description).trim() || undefined,

					price: priceN ?? undefined,
					cost: costN ?? undefined,

					reorderPoint: draft.trackInventory ? (reorderNormalized ?? undefined) : undefined,
					initialOnHand: draft.trackInventory ? (initialNormalized ?? undefined) : undefined,
				};

				const apiPayload = {
					...input,
					unitId: finalUnitId,
					posTileMode: tileMode,
					posTileColor: tileColor ?? null,
					posTileLabel: tileLabel || undefined,
				};

				try {
					let createdId = createdProductIdRef.current;
					if (!createdId) {
						const created = await inventoryApi.createProduct(apiPayload as any);
						createdId = created.id;
						createdProductIdRef.current = createdId;
						invalidateInventoryAfterMutation(queryClient, { productId: createdId });
					}

					const detailRoute = toScopedRoute(`/(app)/(tabs)/inventory/products/${encodeURIComponent(createdId)}`);

					if (imageUriForUpload) {
						try {
							await uploadProductImage({
								imageKind: "PRIMARY_POS_TILE",
								localUri: imageUriForUpload,
								productId: createdId,
								isPrimary: true,
								sortOrder: 0,
							});
						} catch (e) {
							const domain = toMediaDomainError(e);
							setError(domain.message || "Item saved, but the photo failed to upload. Tap save to retry.");
							return;
						}
					}

					createdProductIdRef.current = null;
					reset();
					if (afterSave === "addAnother") {
						showSuccess("Item saved. Add another item.");
						return;
					}
					router.replace(detailRoute as any);
				} catch (e: any) {
					const payload = e?.response?.data;
					const backendCode = payload?.code ?? payload?.errorCode ?? payload?.error?.code ?? payload?.data?.code;
					if (backendCode === "CATALOG_LIMIT_REACHED") {
						setError("Limit Reached\nThis business has reached the supported catalog limit. Contact support.");
						return;
					}
					if (backendCode === "BARCODE_ALREADY_EXISTS") {
						setError("GTIN (Barcode) already exists for this business.");
						return;
					}
					if (backendCode === "SKU_ALREADY_EXISTS") {
						setError("SKU already exists for this business.");
						return;
					}
					const backendMessage =
						payload?.message ??
						payload?.error ??
						payload?.errorMessage ??
						payload?.error?.message ??
						payload?.data?.message;
					const msg = String(backendMessage ?? e?.message ?? "Failed to create item.");
					setError(msg);
				}
			});
		},
		[
			draft,
			effectiveScale,
			effectiveUnitId,
			isUiDisabled,
			localImageUri,
			queryClient,
			reset,
			router,
			showSuccess,
			tileColor,
			tileLabel,
			tileMode,
			withBusy,
		],
	);

	const onSaveAndAddAnother = useCallback(() => onSave("addAnother"), [onSave]);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const unitValueText = useMemo(() => {
		if (!effectiveUnit) return "None";
		const name = (effectiveUnit.name || COUNT_DISPLAY_NAME).trim() || COUNT_DISPLAY_NAME;
		const abbr = (effectiveUnit.abbreviation ?? "").trim();
		return displayUnitValueInline(name, abbr, String(effectiveUnit.category));
	}, [effectiveUnit]);

	const saveDisabled = isUiDisabled || !draft.name.trim() || !effectiveUnitId;

	// Process cancel intent → go back to Add Item selector
	const onExitToAddItems = useCallback(() => {
		if (isUiDisabled) return;
		if (hasDirtyInput) {
			setConfirmExitOpen(true);
			return;
		}
		runGovernedExitReplace(addItemsRoute, {
			router: router as any,
			lockNav,
			disabled: isUiDisabled,
		});
	}, [addItemsRoute, hasDirtyInput, isUiDisabled, lockNav, router]);
	const guardedOnExitToAddItems = useProcessExitGuard(onExitToAddItems);

	const onDiscardExit = useCallback(() => {
		if (isUiDisabled) return;
		setConfirmExitOpen(false);
		const exited = runGovernedExitReplace(addItemsRoute, {
			router: router as any,
			lockNav,
			disabled: isUiDisabled,
		});
		if (!exited) return;
		createdProductIdRef.current = null;
		reset();
	}, [addItemsRoute, isUiDisabled, lockNav, reset, router]);

	const onResumeEditing = useCallback(() => {
		if (isUiDisabled) return;
		setConfirmExitOpen(false);
	}, [isUiDisabled]);

	const tabBarHeight = useBottomTabBarHeight();
	const screenBottomPad = tabBarHeight + 12;

	const headerOptions = useInventoryHeader("process", {
		title: "Create Item",
		disabled: isUiDisabled,
		onExit: guardedOnExitToAddItems,
	});

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>

			<BAIScreen padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<View
					style={[
						styles.screen,
						styles.scroll,
						{ backgroundColor: theme.colors.background, paddingBottom: screenBottomPad },
					]}
				>
					<BAISurface style={[styles.card, { borderColor }]} padded={false}>
						<View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
							<BAIText variant='title'>Create Item</BAIText>
							<BAIText variant='body' muted>
								Add item details below.
							</BAIText>
						</View>
						<ScrollView
							style={styles.formScroll}
							contentContainerStyle={styles.formContainer}
							showsVerticalScrollIndicator={false}
							showsHorizontalScrollIndicator={false}
							keyboardShouldPersistTaps='handled'
						>
							<View style={styles.imageSection}>
								<View style={styles.imageInlineRow}>
									<View
										style={[
											styles.imagePreview,
											{
												borderColor,
												backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
											},
										]}
									>
										{hasLocalImage && tileMode === "IMAGE" ? (
											<Image source={{ uri: localImageUri }} style={styles.imagePreviewImage} resizeMode='cover' />
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
										{shouldShowTileTextOverlay ? (
											<View style={styles.tileLabelWrap}>
												{shouldShowNameOnlyOverlay ? (
													<>
														<View style={styles.tileNameOnlyContent}>
															<View style={[styles.tileNamePill, { backgroundColor: tileLabelBg }]}>
																<BAIText
																	variant='caption'
																	numberOfLines={1}
																	ellipsizeMode='tail'
																	style={[styles.tileItemName, { color: tileLabelColor }]}
																>
																	{itemName}
																</BAIText>
															</View>
														</View>
													</>
												) : (
													<>
														<View style={[styles.tileLabelOverlay, { backgroundColor: tileLabelBg }]} />
														<View style={styles.tileLabelContent}>
															<View style={styles.tileLabelRow}>
																{hasLabel ? (
																	<BAIText
																		variant='subtitle'
																		numberOfLines={1}
																		style={[styles.tileLabelText, { color: tileLabelColor }]}
																	>
																		{tileLabel}
																	</BAIText>
																) : null}
															</View>
															<View style={styles.tileNameRow}>
																{hasItemName ? (
																	<View style={[styles.tileNamePill, { backgroundColor: tileLabelBg }]}>
																		<BAIText
																			variant='caption'
																			numberOfLines={1}
																			ellipsizeMode='tail'
																			style={[styles.tileItemName, { color: tileLabelColor }]}
																		>
																			{itemName}
																		</BAIText>
																	</View>
																) : null}
															</View>
														</View>
													</>
												)}
											</View>
										) : null}
									</View>

									<View style={styles.imageActionColumn}>
										<BAIIconButton
											variant='outlined'
											size='lg'
											icon='barcode-scan'
											iconSize={44}
											accessibilityLabel='Scan barcode'
											onPress={onOpenBarcodeScanner}
											disabled={isUiDisabled}
											style={styles.barcodeIconButtonLarge}
										/>
										<BAIIconButton
											variant='outlined'
											size='md'
											icon='camera'
											iconSize={34}
											accessibilityLabel='Edit image'
											onPress={onEditPosTile}
											disabled={isUiDisabled}
											style={styles.imageEditButtonOutside}
										/>
									</View>
								</View>

								{imageError ? (
									<BAIText variant='caption' style={{ color: theme.colors.error }}>
										{imageError}
									</BAIText>
								) : null}
							</View>

							<BAITextInput
								label='Name'
								value={draft.name}
								onChangeText={(t) => patch({ name: sanitizeProductNameDraftInput(t) })}
								onBlur={() => {
									if (isUiDisabled) return;
									patch({ name: sanitizeProductNameInput(draft.name) });
								}}
								maxLength={FIELD_LIMITS.productName}
								placeholder='e.g. Iced Latte'
								disabled={isUiDisabled}
							/>

							<BAITextarea
								label='Description (optional)'
								value={draft.description}
								onChangeText={(t) => patch({ description: sanitizeDescriptionDraftInput(t) })}
								onBlur={() => {
									if (isUiDisabled) return;
									patch({ description: sanitizeDescriptionInput(draft.description) });
								}}
								maxLength={FIELD_LIMITS.productDescription}
								placeholder='Optional description…'
								disabled={isUiDisabled}
							/>

							<BAITextInput
								label='GTIN (Barcode)'
								value={draft.barcode}
								onChangeText={(t) => patch({ barcode: sanitizeGtinInput(t) })}
								maxLength={GTIN_MAX_LENGTH}
								placeholder='Scan or enter UPC / EAN / ISBN'
								keyboardType='number-pad'
								disabled={isUiDisabled}
							/>

							<BAITextInput
								label='SKU is auto-generated if left blank'
								value={draft.sku}
								onChangeText={(t) => patch({ sku: sanitizeSkuInput(t) })}
								maxLength={FIELD_LIMITS.sku}
								placeholder='Optional'
								disabled={isUiDisabled}
							/>

							<BAIPressableRow
								label='Category'
								value={draft.categoryName ? draft.categoryName : "None"}
								onPress={openCategoryPicker}
								disabled={isUiDisabled}
								style={{ marginTop: 10 }}
							/>

							<BAIPressableRow
								label='Unit'
								value={unitValueText}
								onPress={openUnitPicker}
								disabled={isUiDisabled}
								style={{ marginTop: 10 }}
							/>


							{!effectiveUnitId ? (
								<BAIText variant='caption' muted>
									Select a unit to continue.
								</BAIText>
							) : null}

							<View style={{ height: 12 }} />

							<BAIText variant='subtitle'>Pricing</BAIText>

							<BAIMoneyInput
								label='Price'
								value={draft.priceText}
								onChangeText={(value) => patch({ priceText: value })}
								currencyCode={currencyCode}
								maxLength={FIELD_LIMITS.price}
								disabled={isUiDisabled}
							/>

							<View style={{ height: 0 }} />

							<BAIMoneyInput
								label='Cost (optional)'
								value={draft.costText}
								onChangeText={(value) => patch({ costText: value })}
								currencyCode={currencyCode}
								maxLength={FIELD_LIMITS.cost}
								disabled={isUiDisabled}
							/>

							<View style={{ height: 6 }} />

							<BAIText variant='subtitle' style={{ marginBottom: 6 }}>
								Inventory
							</BAIText>

							<BAISwitchRow
								style={{ marginBottom: 6 }}
								switchVariant='blue'
								label='Track inventory'
								description='If off, this item will not affect stock counts.'
								value={draft.trackInventory}
								onValueChange={(next: boolean) => patch({ trackInventory: next })}
								disabled={isUiDisabled}
							/>

							{draft.trackInventory ? (
								<>
									<BAITextInput
										label='Initial on hand'
										value={draft.initialOnHandText}
										onChangeText={(t) => {
											const s0 = sanitizeQuantityInput(t, effectiveScale);
											const s1 = enforceUdiqCaps(s0, effectiveScale, qtyMaxLen);
											patch({ initialOnHandText: s1 });
										}}
										onBlur={() => {
											if (isUiDisabled) return;
											patch({
												initialOnHandText: normalizeQuantityForBlur(draft.initialOnHandText, effectiveScale, qtyMaxLen),
											});
										}}
										maxLength={qtyMaxLen}
										keyboardType={quantityKeyboardType}
										placeholder={quantityPlaceholder}
										disabled={isUiDisabled}
										{...({ helperText: precisionHelperText } as any)}
									/>

									<BAITextInput
										label='Reorder point (optional)'
										value={draft.reorderPointText}
										onChangeText={(t) => {
											const s0 = sanitizeQuantityInput(t, effectiveScale);
											const s1 = enforceUdiqCaps(s0, effectiveScale, qtyMaxLen);
											patch({ reorderPointText: s1 });
										}}
										onBlur={() => {
											if (isUiDisabled) return;
											patch({
												reorderPointText: normalizeQuantityForBlur(draft.reorderPointText, effectiveScale, qtyMaxLen),
											});
										}}
										maxLength={qtyMaxLen}
										keyboardType={quantityKeyboardType}
										placeholder={quantityPlaceholder}
										disabled={isUiDisabled}
										{...({ helperText: precisionHelperText } as any)}
									/>
								</>
							) : null}

							{error ? (
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									{error}
								</BAIText>
							) : null}

							<View style={styles.actions}>
								<BAICTAPillButton
									variant='outline'
									onPress={guardedOnExitToAddItems}
									disabled={isUiDisabled}
									style={{ flex: 1 }}
									intent='neutral'
								>
									Cancel
								</BAICTAPillButton>

								<BAICTAPillButton
									intent='primary'
									variant='solid'
									onPress={() => onSave("detail")}
									disabled={saveDisabled}
									style={{ flex: 1 }}
								>
									Save
								</BAICTAPillButton>
							</View>
							<View style={{ height: 10 }} />
							<BAIButton
								variant='solid'
								onPress={onSaveAndAddAnother}
								disabled={saveDisabled}
								style={styles.saveAnotherButton}
								intent='primary'
							>
								Save & Add Another
							</BAIButton>
						</ScrollView>
					</BAISurface>
				</View>
			</BAIScreen>

			<ConfirmActionModal
				visible={confirmExitOpen}
				title='Unsaved changes'
				message='Do you want to resume editing or discard this item?'
				confirmLabel='Resume'
				cancelLabel='Discard'
				confirmIntent='primary'
				cancelIntent='error'
				onDismiss={onResumeEditing}
				onConfirm={onResumeEditing}
				onCancel={onDiscardExit}
				disabled={isUiDisabled}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	screen: { paddingHorizontal: 12, paddingBottom: 0 },
	scroll: { flex: 1 },
	card: {
		flex: 1,
		minHeight: 0,
		borderWidth: 1,
		borderRadius: 24,
		gap: 6,
		paddingHorizontal: 0,
		paddingTop: 12,
		paddingBottom: 0,
	},
	cardHeader: {
		paddingHorizontal: 14,
		paddingBottom: 10,
		marginBottom: 0,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	formScroll: {
		flex: 1,
	},
	formContainer: {
		paddingHorizontal: 14,
		paddingBottom: 0,
	},
	imageSection: {
		alignItems: "center",
		gap: 10,
		marginBottom: 16,
		marginTop: 6,
	},
	imagePreview: {
		width: 180,
		aspectRatio: 1,
		borderRadius: 18,
		borderWidth: 1,
		overflow: "hidden",
	},
	imagePreviewImage: {
		width: "100%",
		height: "100%",
	},
	imagePreviewEmpty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	tileLabelWrap: {
		position: "absolute",
		left: 2,
		right: 2,
		bottom: 2,
		borderRadius: 16,
		overflow: "hidden",
		minHeight: 80,
	},
	tileLabelOverlay: {
		...StyleSheet.absoluteFillObject,
	},
	tileLabelContent: {
		paddingHorizontal: 10,
		paddingTop: 6,
		paddingBottom: 6,
		justifyContent: "flex-start",
		gap: 2,
	},
	tileNameOnlyContent: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		minHeight: 32,
		paddingHorizontal: 10,
		paddingVertical: 6,
		justifyContent: "center",
	},
	tileLabelRow: {
		minHeight: 36,
		justifyContent: "flex-end",
	},
	tileNameRow: {
		minHeight: 20,
		justifyContent: "flex-start",
	},
	tileNamePill: {
		alignSelf: "stretch",
		width: "100%",
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	tileLabelText: {
		fontWeight: "700",
		fontSize: 30,
	},
	tileItemName: {
		marginTop: 0,
		fontSize: 18,
	},
	imageInlineRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 16,
	},
	imageActionColumn: {
		alignItems: "center",
		gap: 20,
	},
	barcodeIconButtonLarge: {
		width: 84,
		height: 84,
		borderRadius: 42,
	},
	imageEditButtonOutside: {
		width: 60,
		height: 60,
		borderRadius: 30,
	},
	actions: {
		flexDirection: "row",
		gap: 10,
		marginTop: 10,
	},
	sectionDivider: {
		height: 1,
		marginTop: 14,
		marginBottom: 14,
	},
	saveAnotherButton: {
		marginTop: 10,
		marginBottom: 250,
	},
});
