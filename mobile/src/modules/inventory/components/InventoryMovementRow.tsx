// BizAssist_mobile
// path: src/modules/inventory/components/InventoryMovementRow.tsx

import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAITimeAgo } from "@/components/system/BAITimeAgo";
import { BAIText } from "@/components/ui/BAIText";
import type { InventoryMovement } from "@/modules/inventory/inventory.types";
import { unitDisplayToken, type UnitDisplayInput } from "@/modules/units/units.format";

type Props = {
	movement: InventoryMovement;
	compact?: boolean;
	showDateTime?: boolean;
	precisionScale?: number;
	unit?: UnitDisplayInput | null;
};

function formatReason(reason: InventoryMovement["reason"]): string {
	switch (reason) {
		case "SALE":
			return "Sale";
		case "STOCK_IN":
			return "Stock in";
		case "STOCK_OUT":
			return "Stock out";
		case "ADJUSTMENT":
			return "Adjustment";
		default:
			return "Movement";
	}
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

function clampPrecisionScale(value: unknown): number {
	const raw = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(raw)) return 0;
	return Math.max(0, Math.min(5, Math.trunc(raw)));
}

function formatLegacyScaledInt(rawScaledInt: string, scale: number): string {
	const s = rawScaledInt.trim();
	if (!/^-?\d+$/.test(s)) return s;

	const neg = s.startsWith("-");
	const digits = neg ? s.slice(1) : s;
	if (scale <= 0) return (neg ? "-" : "") + (digits || "0");

	const padded = digits.padStart(scale + 1, "0");
	const intPart = padded.slice(0, -scale) || "0";
	const fracPart = padded.slice(-scale);
	return (neg ? "-" : "") + intPart + "." + fracPart;
}

function formatUdqiDecimal(rawDecimal: string, scale: number): string {
	const t = rawDecimal.trim();
	if (!t) return "—";
	const s = t.endsWith(".") ? t.slice(0, -1) : t;
	if (!/^-?\d+(\.\d+)?$/.test(s)) return t;

	// Decimal-major; pad/clip to scale
	if (!s.includes(".")) {
		return scale > 0 ? `${s}.${"0".repeat(scale)}` : s;
	}

	const neg = s.startsWith("-");
	const body = neg ? s.slice(1) : s;
	const [intPartRaw, fracRaw = ""] = body.split(".");
	if (scale <= 0) return (neg ? "-" : "") + (intPartRaw || "0");

	const frac = (fracRaw + "0".repeat(scale)).slice(0, scale);
	return (neg ? "-" : "") + (intPartRaw || "0") + "." + frac;
}

/**
 * UDQI-safe delta formatting:
 * - If raw string contains '.', treat as UDQI decimal-major (pad/clip to scale).
 * - If raw string is integer and scale>0, treat as legacy scaled-int.
 * - Else fallback to numeric legacy.
 *
 * This prevents: raw "50" @ scale=2 from rendering "+50.00" (wrong) instead of "+0.50" (correct legacy).
 */
function formatDelta(movement: InventoryMovement, precisionScale?: number): string {
	const scale = clampPrecisionScale(precisionScale);

	const raw = typeof movement.quantityDeltaRaw === "string" ? movement.quantityDeltaRaw.trim() : "";
	if (raw && /^-?\d+(\.\d+)?$/.test(raw)) {
		const neg = raw.startsWith("-");
		const body = neg ? raw.slice(1) : raw;

		// If integer string with scale>0 => legacy scaled-int
		if (!raw.includes(".") && scale > 0) {
			const base = formatLegacyScaledInt(raw, scale);
			const isZero = body.replace(/^0+/, "") === "";
			if (isZero || neg) return base;
			return `+${base}`;
		}

		// Otherwise treat as UDQI decimal-major
		const base = formatUdqiDecimal(raw, scale);
		const isZero = body.replace(".", "").replace(/^0+/, "") === "";
		if (isZero || neg) return base;
		return `+${base}`;
	}

	// Numeric fallback: legacy scaled-int integer
	const n =
		typeof movement.quantityDelta === "number" && Number.isFinite(movement.quantityDelta) ? movement.quantityDelta : 0;
	const rawInt = String(Math.trunc(n));
	const base = scale > 0 ? formatLegacyScaledInt(rawInt, scale) : rawInt;
	return n > 0 ? `+${base}` : base;
}

function InventoryMovementRowBase({ movement, compact, showDateTime, precisionScale, unit }: Props) {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;

	const qtyLabel = useMemo(() => {
		const base = formatDelta(movement, precisionScale);
		if (!base || base === "—") return base;

		const unitToken = unitDisplayToken(
			unit ?? movement,
			"quantity",
			movement.quantityDeltaRaw ?? movement.quantityDelta,
		);
		return unitToken ? `${base} ${unitToken}` : base;
	}, [movement, precisionScale, unit]);

	const deltaValue = useMemo(() => {
		const raw = movement.quantityDeltaRaw ?? movement.quantityDelta;
		const n = typeof raw === "number" ? raw : Number(raw);
		return Number.isFinite(n) ? n : 0;
	}, [movement]);

	const reasonLabel = useMemo(() => formatReason(movement.reason), [movement.reason]);
	const timestampLabel = useMemo(() => formatReadableTime(movement.createdAt), [movement.createdAt]);

	return (
		<View style={[styles.row, { borderColor, backgroundColor: surfaceAlt }, compact && styles.compact]}>
			<View style={styles.left}>
				<BAIText variant='body'>{reasonLabel}</BAIText>
				{showDateTime && timestampLabel ? (
					<View style={styles.timeRow}>
						<BAIText variant='caption' muted>
							{timestampLabel}
						</BAIText>
						<BAIText variant='caption' muted style={styles.inlineSep}>
							|
						</BAIText>
						<BAITimeAgo value={movement.createdAt} variant='caption' muted />
					</View>
				) : (
					<BAITimeAgo value={movement.createdAt} />
				)}
			</View>

			<BAIText variant='subtitle' style={deltaValue < 0 ? { color: theme.colors.error } : undefined}>
				{qtyLabel}
			</BAIText>
		</View>
	);
}

export const InventoryMovementRow = memo(InventoryMovementRowBase);

const styles = StyleSheet.create({
	row: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	compact: {
		paddingVertical: 10,
	},
	left: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	timeRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		flexWrap: "wrap",
	},
	inlineSep: {
		marginHorizontal: 2,
	},
});
