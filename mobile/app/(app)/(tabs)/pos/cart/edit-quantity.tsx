// BizAssist_mobile
// path: app/(app)/(tabs)/pos/cart/edit-quantity.tsx
//
// POS Quantity Edit (process)
// Governance (locked):
// - Header-left = Exit (cancel), header-right = none.
// - Keypad-like numeric input constrained by Unit.precisionScale (0..5).
// - No silent rounding; reject invalid decimals.
// - Save commits via pos.quantityEditStore and returns to POS.

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { InputAccessoryView, Platform, StyleSheet, View } from "react-native";
import { TextInput, useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { precisionPlaceholder } from "@/modules/units/units.format";
import {
	clampPrecisionScale,
	fromScaledInt,
	lineTotalMinor,
	minorToDecimalString,
	normalizeQuantityString,
	toScaledInt,
} from "@/modules/pos/pos.quantity";
import { useNavLock } from "@/shared/hooks/useNavLock";
import { setPendingQuantityEdit } from "@/modules/pos/pos.quantityEditStore";
import { formatMoney } from "@/shared/money/money.format";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

const UDQI_INT_MAX_DIGITS = 12;

function formatQtyDisplay(raw: string, maxFrac = 2): string {
	const s = String(raw ?? "").trim();
	if (!s) return "0";
	const neg = s.startsWith("-");
	const t = neg ? s.slice(1) : s;
	const [iRaw, fRaw = ""] = t.split(".");
	let i = iRaw.replace(/^0+(?=\d)/, "") || "0";
	let f = fRaw;

	const incInt = (value: string) => {
		let carry = 1;
		const digits = value.split("").map((d) => Number(d));
		for (let idx = digits.length - 1; idx >= 0 && carry; idx--) {
			const next = digits[idx] + carry;
			if (next === 10) {
				digits[idx] = 0;
				carry = 1;
			} else {
				digits[idx] = next;
				carry = 0;
			}
		}
		if (carry) digits.unshift(1);
		return digits.join("");
	};

	const shouldCompact = i.length >= 5; // >= 10,000
	if (shouldCompact) {
		let unitGroups = Math.floor((i.length - 1) / 3);
		if (unitGroups > 4) unitGroups = 4;
		const suffixes = ["", "k", "M", "B", "T"] as const;
		let suffix = suffixes[unitGroups] ?? "";
		const prefixLen = i.length - unitGroups * 3;
		const digits = `${i}${f}`.padEnd(prefixLen + 2, "0");
		let whole = digits.slice(0, prefixLen) || "0";
		let dec1 = digits.slice(prefixLen, prefixLen + 1) || "0";
		const dec2 = digits.slice(prefixLen + 1, prefixLen + 2) || "0";

		if (dec2 >= "5") {
			if (dec1 === "9") {
				dec1 = "0";
				whole = incInt(whole);
			} else {
				dec1 = String(Number(dec1) + 1);
			}
		}

		if (whole.length > prefixLen) {
			const nextGroup = Math.min(unitGroups + 1, suffixes.length - 1);
			suffix = suffixes[nextGroup] ?? suffix;
			whole = "1";
			dec1 = "0";
		}

		const compact = `${neg ? "-" : ""}${whole}${dec1 !== "0" ? `.${dec1}` : ""}${suffix}`;
		return compact;
	}

	if (maxFrac <= 0) {
		if (f.length > 0 && f[0] >= "5") i = incInt(i);
		f = "";
	} else if (f.length > maxFrac) {
		const cut = f.slice(0, maxFrac);
		const nextDigit = f[maxFrac];
		let carry = nextDigit >= "5";
		const digits = cut.split("").map((d) => Number(d));
		for (let idx = digits.length - 1; idx >= 0 && carry; idx--) {
			const next = digits[idx] + 1;
			if (next === 10) {
				digits[idx] = 0;
				carry = true;
			} else {
				digits[idx] = next;
				carry = false;
			}
		}
		if (carry) i = incInt(i);
		f = digits.join("");
	}

	const fTrim = f.replace(/0+$/, "");
	const iGrouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return `${neg ? "-" : ""}${iGrouped}${fTrim ? `.${fTrim}` : ""}`;
}

function formatMoneyCompact(currencyCode: string, amountRaw: string): string {
	const raw = String(amountRaw ?? "").trim() || "0";
	const compact = formatQtyDisplay(raw, 2);
	const formatted = formatMoney({ currencyCode, amount: raw });

	if (!formatted) return compact;

	const replaced = formatted.replace(/-?\d[\d,]*([.]\d+)?/, compact);
	return replaced || compact;
}

function capText(raw: string, maxLen: number) {
	if (maxLen <= 0) return "";
	return raw.length > maxLen ? raw.slice(0, maxLen) : raw;
}

/**
 * UDQI typing sanitize (non-negative):
 * - digits + optional single dot
 * - clamp fractional digits to `scale`
 * - allows trailing dot while typing
 */
function sanitizeQuantityInput(raw: string, scale: number): string {
	let s = String(raw ?? "")
		.replace(/,/g, "")
		.trim();
	if (!s) return "";

	s = s.replace(/[^\d.]/g, "");

	const firstDot = s.indexOf(".");
	if (firstDot >= 0) {
		const before = s.slice(0, firstDot + 1);
		const after = s.slice(firstDot + 1).replace(/\./g, "");
		s = before + after;
	}

	if (scale <= 0) {
		return s.replace(/\./g, "");
	}

	if (s.includes(".")) {
		const [intPart, fracPart = ""] = s.split(".");
		const clampedFrac = fracPart.slice(0, Math.max(0, Math.trunc(scale)));
		s = intPart + "." + clampedFrac;
	}

	return s;
}

/**
 * UDQI caps:
 * - cap integer digits to UDQI_INT_MAX_DIGITS
 * - cap fractional digits to `scale`
 * - apply hard cap (FIELD_LIMITS.quantity)
 */
function enforceUdiqCaps(sanitized: string, scale: number, hardCap: number): string {
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

	return capText(s.slice(0, UDQI_INT_MAX_DIGITS), hardCap);
}

function isValidDecimalString(raw: string, scale: number): boolean {
	const s = raw.trim();
	if (!s) return false;
	if (!/^\d+(\.\d*)?$/.test(s)) return false;
	const parts = s.split(".");
	const frac = parts[1] ?? "";
	return frac.length <= scale;
}

function normalizeQuantityForSubmit(
	raw: string,
	scale: number,
): { ok: true; value: string } | { ok: false; message: string } {
	const s0 = String(raw ?? "").trim();
	if (!s0) return { ok: false, message: "Enter a quantity." };
	if (/[eE,]/.test(s0)) return { ok: false, message: "Invalid number format." };
	if (!/^\d+(\.\d*)?$/.test(s0)) return { ok: false, message: "Enter a valid quantity." };
	if (s0.endsWith(".")) return { ok: false, message: "Quantity cannot end with a decimal point." };

	const sc = Math.max(0, Math.trunc(Number(scale) || 0));
	if (sc <= 0) {
		return { ok: true, value: s0.replace(/\./g, "") };
	}

	const [intRaw, fracRaw = ""] = s0.split(".");
	if (fracRaw.length > sc) return { ok: false, message: `Max ${sc} decimals for this unit.` };

	const intPart = intRaw.length ? intRaw : "0";
	const frac = (fracRaw + "0".repeat(sc)).slice(0, sc);
	return { ok: true, value: `${intPart}.${frac}` };
}

export default function PosCartEditQuantityScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { canNavigate } = useNavLock({ lockMs: 650 });

	const params = useLocalSearchParams<{
		productId?: string;
		name?: string;
		quantity?: string;
		precisionScale?: string;
		unitToken?: string;
		maxQty?: string;
		trackInventory?: string;
		unitPrice?: string;
		currencyCode?: string;
		reorderPoint?: string;
	}>();

	const productId = String(params.productId ?? "").trim();
	const name = String(params.name ?? "").trim();
	const unitToken = String(params.unitToken ?? "").trim();
	const scale = clampPrecisionScale(Number(params.precisionScale ?? "0"));
	const trackInventory = String(params.trackInventory ?? "").trim() === "true";
	const maxQtyParam = String(params.maxQty ?? "").trim();
	const unitPrice = String(params.unitPrice ?? "").trim();
	const currencyCode = String(params.currencyCode ?? "").trim();
	const reorderPointParam = String(params.reorderPoint ?? "").trim();

	const initialQty = useMemo(() => {
		const q = String(params.quantity ?? "").trim();
		return normalizeQuantityString(q || "0", scale);
	}, [params.quantity, scale]);

	const [value, setValue] = useState<string>(initialQty);
	const [touched, setTouched] = useState(false);

	const onExit = useCallback(() => {
		if (!canNavigate) return;
		router.back();
	}, [canNavigate, router]);

	const header = useInventoryHeader("process", { title: "Quantity", disabled: !canNavigate, onExit });
	const placeholder = useMemo(() => precisionPlaceholder(scale), [scale]);
	const quantityKeyboardType = useMemo(() => (scale <= 0 ? "number-pad" : "decimal-pad"), [scale]);
	const inputAccessoryId = Platform.OS === "ios" ? "pos-qty-accessory" : undefined;
	const hardCap = FIELD_LIMITS.quantity;

	const maxQty = useMemo(() => {
		if (!trackInventory || !maxQtyParam) return "";
		return normalizeQuantityString(maxQtyParam, scale);
	}, [maxQtyParam, scale, trackInventory]);

	const maxScaled = useMemo(() => {
		if (!trackInventory || !maxQty) return null;
		return toScaledInt(maxQty, scale);
	}, [maxQty, scale, trackInventory]);

	const reorderScaled = useMemo(() => {
		if (!trackInventory || !reorderPointParam) return null;
		const normalized = normalizeQuantityString(reorderPointParam, scale);
		return toScaledInt(normalized, scale);
	}, [reorderPointParam, scale, trackInventory]);

	const calcValue = useMemo(() => {
		if (!value) return "0";
		if (value.endsWith(".")) return value.slice(0, -1) || "0";
		return value;
	}, [value]);

	const inputScaled = useMemo(() => {
		if (!isValidDecimalString(calcValue, scale)) return 0n;
		return toScaledInt(calcValue, scale);
	}, [calcValue, scale]);
	const displayQty = useMemo(() => normalizeQuantityString(value || "0", scale), [scale, value]);
	const submitNormalized = useMemo(() => normalizeQuantityForSubmit(value, scale), [scale, value]);

	const exceedsMax = maxScaled !== null && inputScaled > maxScaled;
	const remainingScaled = maxScaled !== null ? maxScaled - inputScaled : null;
	const remainingQty =
		remainingScaled !== null ? fromScaledInt(remainingScaled < 0n ? 0n : remainingScaled, scale) : "";
	const stockDisplay = maxQty ? formatQtyDisplay(maxQty) : "";
	const remainingDisplay = remainingQty ? formatQtyDisplay(remainingQty) : "";
	const stockLabel = stockDisplay ? `${stockDisplay}${unitToken ? ` ${unitToken}` : ""}` : "";
	const remainingLabel = remainingDisplay ? `${remainingDisplay}${unitToken ? ` ${unitToken}` : ""}` : "";
	const isOutOfStock = trackInventory && remainingScaled !== null && remainingScaled <= 0n;
	const isLowStock =
		trackInventory &&
		!isOutOfStock &&
		remainingScaled !== null &&
		reorderScaled !== null &&
		remainingScaled <= reorderScaled;

	const isValid = useMemo(() => {
		if (!productId) return false;
		if (!isValidDecimalString(value, scale)) return false;
		if (!submitNormalized.ok) return false;
		const scaled = toScaledInt(submitNormalized.value, scale);
		if (scaled <= 0n) return false;
		if (exceedsMax) return false;
		return true;
	}, [exceedsMax, productId, scale, submitNormalized, value]);

	const isSaveDisabled = !canNavigate || !isValid;

	const unitPriceLabel = useMemo(
		() => formatMoney({ currencyCode, amount: unitPrice || "0.00" }),
		[currencyCode, unitPrice],
	);
	const lineTotalLabel = useMemo(() => {
		const lineMinor = lineTotalMinor({
			unitPrice: unitPrice || "0.00",
			quantity: calcValue,
			precisionScale: scale,
		});
		const raw = minorToDecimalString(lineMinor, 2);
		return formatMoneyCompact(currencyCode, raw);
	}, [calcValue, currencyCode, scale, unitPrice]);

	const onSave = useCallback(() => {
		if (isSaveDisabled) return;
		if (!submitNormalized.ok) return;
		const normalized = submitNormalized.value;
		if (toScaledInt(normalized, scale) <= 0n) return;

		setPendingQuantityEdit({ productId, quantity: normalized });
		router.back();
	}, [isSaveDisabled, productId, router, scale, submitNormalized]);

	const onBlurQuantity = useCallback(() => {
		setValue((prev) => {
			const sanitized = sanitizeQuantityInput(prev, scale);
			const capped = enforceUdiqCaps(sanitized, scale, hardCap);
			const normalized = normalizeQuantityForSubmit(capped, scale);
			return normalized.ok ? normalized.value : capped;
		});
	}, [hardCap, scale]);

	return (
		<BAIScreen safeTop={false} style={{ backgroundColor: theme.colors.background }}>
			<Stack.Screen
				options={{
					...header,
					headerShown: true,
					headerShadowVisible: false,
					headerRight: () => null,
					headerStyle: { backgroundColor: theme.colors.background },
					headerTintColor: theme.colors.onSurface,
					headerTitleStyle: { color: theme.colors.onSurface },
					contentStyle: { backgroundColor: theme.colors.background },
				}}
			/>

			<BAISurface style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}>
				<BAIText variant='title' numberOfLines={1}>
					{name || "Item"}
				</BAIText>

				<BAIText variant='caption' muted style={styles.detailRow}>
					{unitPriceLabel} • Qty {displayQty} • {lineTotalLabel}
					{trackInventory && (remainingLabel || stockLabel) ? (
						<BAIText
							variant='caption'
							muted={!isOutOfStock && !isLowStock}
							style={isOutOfStock ? { color: theme.colors.error } : isLowStock ? styles.lowStock : undefined}
						>
							{` • ${(remainingLabel || stockLabel) ?? ""} left`}
						</BAIText>
					) : null}
				</BAIText>

				<BAIText variant='caption' muted style={styles.subtitle}>
					Enter a quantity{unitToken ? ` (${unitToken})` : ""}.
				</BAIText>

				<TextInput
					mode='outlined'
					label='Quantity'
					value={value}
					onChangeText={(t) => {
						setTouched(true);
						const sanitized = sanitizeQuantityInput(t, scale);
						const capped = enforceUdiqCaps(sanitized, scale, hardCap);
						setValue(capped);
					}}
					onBlur={onBlurQuantity}
					placeholder={placeholder}
					keyboardType={quantityKeyboardType}
					autoFocus
					maxLength={hardCap}
					inputAccessoryViewID={inputAccessoryId}
					outlineStyle={{ borderRadius: 12 }}
				/>

				{touched && !isValid ? (
					<View style={styles.errRow}>
						<BAIText variant='caption' style={{ color: theme.colors.error }}>
							{exceedsMax && stockLabel
								? `Exceeds available stock (${stockLabel}).`
								: !isValidDecimalString(value, scale)
									? "Enter a valid quantity."
									: !submitNormalized.ok
										? submitNormalized.message
										: `Invalid quantity. Max ${scale} decimals. Must be greater than 0.`}
						</BAIText>
					</View>
				) : null}

				<View style={styles.actionRow}>
					<BAIButton
						shape='pill'
						variant='outline'
						onPress={onExit}
						disabled={!canNavigate}
						style={styles.actionButton}
						intent='neutral'
					>
						Cancel
					</BAIButton>
					<BAIButton shape='pill' onPress={onSave} disabled={isSaveDisabled} style={styles.actionButton}>
						Save
					</BAIButton>
				</View>
			</BAISurface>

			{inputAccessoryId ? (
				<InputAccessoryView nativeID={inputAccessoryId} style={{ backgroundColor: theme.colors.background }}>
					<View style={styles.accessorySpacer} />
				</InputAccessoryView>
			) : null}
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	card: {
		margin: 16,
		padding: 16,
		borderWidth: 1,
		borderRadius: 24,
		gap: 10,
	},
	subtitle: { marginTop: 2 },
	detailRow: { marginTop: 4 },
	errRow: { marginTop: 6 },
	lowStock: { color: "#F59E0B" },
	actionRow: { marginTop: 10, flexDirection: "row", gap: 10 },
	actionButton: { flex: 1 },
	accessorySpacer: { height: 0 },
});
