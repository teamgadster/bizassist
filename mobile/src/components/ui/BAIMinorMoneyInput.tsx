import React, { useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";

import { BAITextInput } from "@/components/ui/BAITextInput";
import { MONEY_INPUT_PRECISION } from "@/shared/money/money.constants";
import { digitsToMinorUnits, formatMinorUnits, MONEY_MAX_MINOR_DIGITS, parseMinorUnits, sanitizeDigits } from "@/shared/money/money.minor";

type BAITextInputProps = React.ComponentProps<typeof BAITextInput>;

type BAIMinorMoneyInputProps = Omit<BAITextInputProps, "value" | "onChangeText" | "keyboardType" | "selection" | "maxLength"> & {
	value: string;
	onChangeText: (value: string) => void;
	currencyCode: string;
	maxMinorDigits?: number;
};

function normalizeInteger(raw: unknown, fallback: number): number {
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(1, Math.trunc(parsed));
}

function decimalTextToMinorUnits(raw: string, scale: number, maxMinorDigits: number): number {
	const cleaned = String(raw ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
	if (!cleaned) return 0;

	const [intRaw = "", ...fractionParts] = cleaned.split(".");
	const intDigits = sanitizeDigits(intRaw);
	const fractionDigits = sanitizeDigits(fractionParts.join(""));
	const decimalDigits = scale > 0 ? fractionDigits.slice(0, scale).padEnd(scale, "0") : "";
	const combinedDigits = `${intDigits}${decimalDigits}`;

	if (!combinedDigits) return 0;
	return digitsToMinorUnits(combinedDigits, maxMinorDigits);
}

function minorUnitsToDecimalText(minorUnits: number, scale: number): string {
	const safeMinor = parseMinorUnits(minorUnits);
	if (safeMinor <= 0) return "";
	if (scale <= 0) return String(safeMinor);

	const divisor = 10 ** scale;
	const major = Math.floor(safeMinor / divisor);
	const minor = safeMinor % divisor;
	return `${major}.${String(minor).padStart(scale, "0")}`;
}

function getMaxMaskedLength(currencyCode: string, scale: number, maxMinorDigits: number): number {
	const maxMinor = digitsToMinorUnits("9".repeat(maxMinorDigits), maxMinorDigits);
	return formatMinorUnits({
		minorUnits: maxMinor,
		currencyCode,
		scale,
	}).length;
}

function applyMinorInputContract(args: { currentMinor: number; nextText: string; maxMinorDigits: number }): number {
	const currentMinor = parseMinorUnits(args.currentMinor);
	const maxMinorDigits = normalizeInteger(args.maxMinorDigits, MONEY_MAX_MINOR_DIGITS);
	const sanitized = sanitizeDigits(args.nextText);
	const currentDigits = sanitizeDigits(String(currentMinor));

	const capReached = currentDigits.length >= maxMinorDigits;
	const isGrowthAttempt = sanitized.length > currentDigits.length;

	// Backspace-Safe Cap Guard: block only growth when max precision length is already reached.
	if (capReached && isGrowthAttempt) return currentMinor;

	const isSingleAppend =
		sanitized.length === currentDigits.length + 1 &&
		sanitized.startsWith(currentDigits);

	// Silent Growth Lock: treat end-appends as explicit digit pushes, otherwise re-parse entire sanitized digits.
	const nextMinor = isSingleAppend
		? digitsToMinorUnits(currentDigits + sanitized[sanitized.length - 1], maxMinorDigits)
		: digitsToMinorUnits(sanitized, maxMinorDigits);

	return parseMinorUnits(nextMinor);
}

export function BAIMinorMoneyInput({
	value,
	onChangeText,
	currencyCode,
	maxMinorDigits = MONEY_MAX_MINOR_DIGITS,
	contentStyle,
	placeholder,
	...rest
}: BAIMinorMoneyInputProps) {
	const scale = MONEY_INPUT_PRECISION;
	const safeMaxMinorDigits = normalizeInteger(maxMinorDigits, MONEY_MAX_MINOR_DIGITS);
	const currentMinor = useMemo(
		() => decimalTextToMinorUnits(value, scale, safeMaxMinorDigits),
		[safeMaxMinorDigits, scale, value],
	);

	const maskedValue = useMemo(
		() =>
			currentMinor > 0
				? formatMinorUnits({
						minorUnits: currentMinor,
						currencyCode,
						scale,
					})
				: "",
		[currentMinor, currencyCode, scale],
	);

	const resolvedPlaceholder = useMemo(
		() =>
			typeof placeholder === "string" && placeholder.trim().length > 0
				? placeholder
				: formatMinorUnits({ minorUnits: 0, currencyCode, scale }),
		[placeholder, currencyCode, scale],
	);

	const maxLength = useMemo(
		() => getMaxMaskedLength(currencyCode, scale, safeMaxMinorDigits),
		[currencyCode, safeMaxMinorDigits, scale],
	);

	const handleChangeText = useCallback(
		(nextText: string) => {
			const nextMinor = applyMinorInputContract({
				currentMinor,
				nextText,
				maxMinorDigits: safeMaxMinorDigits,
			});

			if (nextMinor === currentMinor) return;
			onChangeText(minorUnitsToDecimalText(nextMinor, scale));
		},
		[currentMinor, onChangeText, safeMaxMinorDigits, scale],
	);

	const caret = maskedValue.length;

	return (
		<BAITextInput
			{...rest}
			value={maskedValue}
			onChangeText={handleChangeText}
			keyboardType='number-pad'
			maxLength={maxLength}
			placeholder={resolvedPlaceholder}
			selection={maskedValue ? { start: caret, end: caret } : undefined}
			contentStyle={[contentStyle, styles.rightAligned]}
		/>
	);
}

const styles = StyleSheet.create({
	rightAligned: {
		textAlign: "right",
		paddingRight: 4,
	},
});
