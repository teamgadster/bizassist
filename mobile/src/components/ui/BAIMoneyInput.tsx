// BizAssist_mobile
// path: src/components/ui/BAIMoneyInput.tsx
import React, { useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { TextInput } from "react-native-paper";

import { BAITextInput } from "@/components/ui/BAITextInput";
import { formatMoney } from "@/shared/money/money.format";
import { stripControlChars } from "@/shared/text/sanitizeText";
import { sanitizeMoneyInput } from "@/shared/validation/sanitize";

type BAITextInputProps = React.ComponentProps<typeof BAITextInput>;

type BAIMoneyInputProps = Omit<
	BAITextInputProps,
	"value" | "onChangeText" | "onBlur" | "keyboardType" | "left" | "placeholder"
> & {
	value: string;
	onChangeText: (value: string) => void;
	currencyCode: string;
	placeholder?: string;
	left?: BAITextInputProps["left"];
	onBlur?: BAITextInputProps["onBlur"];
};

type CurrencyDisplayParts = {
	full: string;
	number: string;
	symbol: string;
};

function normalizeCurrencyCode(currencyCode: string): string {
	return (currencyCode ?? "").trim().toUpperCase();
}

function extractCurrencySymbol(formatted: string, fallback: string): string {
	const cleaned = formatted.replace(/[\d\s.,-]/g, "");
	return cleaned || fallback;
}

function getCurrencyDisplayParts(currencyCode: string, amount: number): CurrencyDisplayParts {
	const code = normalizeCurrencyCode(currencyCode);
	const fallbackFull = String(formatMoney({ currencyCode: code, amount })).trim();

	if (!code) {
		const fixed = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
		return { full: fixed, number: fixed, symbol: "" };
	}

	let full = fallbackFull;
	let symbol = "";
	let number = "";

	try {
		if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
			const formatter = new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: code,
				currencyDisplay: "symbol",
			});

			full = formatter.format(amount);

			if (typeof formatter.formatToParts === "function") {
				const parts = formatter.formatToParts(amount);
				symbol = parts.find((p) => p.type === "currency")?.value ?? "";
				number = parts
					.filter((p) => p.type !== "currency")
					.map((p) => p.value)
					.join("")
					.trim();
			}
		}
	} catch {
		// fall through to fallback parsing
	}

	if (!symbol && full) {
		symbol = extractCurrencySymbol(full, code);
	}

	if (!number && full) {
		number = symbol ? full.replace(symbol, "").trim() : full;
	}

	return {
		full: full || fallbackFull,
		number: number || fallbackFull,
		symbol,
	};
}

function buildCurrencyInputFormat(currencyCode: string) {
	const parts = getCurrencyDisplayParts(currencyCode, 0);
	const trimmedFull = (parts.full ?? "").trim();
	const guide = trimmedFull ? `Format: ${trimmedFull}` : "Format: 0.00";

	let placeholder = (parts.number ?? "").trim();
	if (parts.symbol && placeholder.includes(parts.symbol)) {
		placeholder = placeholder.replace(parts.symbol, "").trim();
	}
	if (!placeholder || placeholder === "0") {
		placeholder = "0.00";
	}

	return {
		formatGuide: guide,
		placeholder,
		symbol: parts.symbol,
	};
}

function normalizeMoneyOnBlurLocalized(raw: string, currencyCode: string): string {
	const stripped = stripControlChars(raw, { allowNewlines: false, allowTabs: false });
	const sanitized = sanitizeMoneyInput(stripped);
	const trimmed = sanitized.trim();
	if (!trimmed || trimmed === ".") return "";

	const n = Number(trimmed);
	if (!Number.isFinite(n)) return "";

	// Normalize to 2-decimal money value, then localize display.
	const fixed = n.toFixed(2);
	const amount = Number(fixed);
	if (!Number.isFinite(amount)) return fixed;

	const parts = getCurrencyDisplayParts(currencyCode, amount);
	let display = (parts.number ?? "").trim();
	if (parts.symbol && display.includes(parts.symbol)) {
		display = display.replace(parts.symbol, "").trim();
	}
	return display || fixed;
}

export function BAIMoneyInput({
	value,
	onChangeText,
	currencyCode,
	placeholder,
	left,
	disabled,
	onBlur,
	...rest
}: BAIMoneyInputProps) {
	const moneyInputFormat = useMemo(() => buildCurrencyInputFormat(currencyCode), [currencyCode]);

	const resolvedPlaceholder = placeholder ?? moneyInputFormat.placeholder;

	const resolvedLeft = useMemo(() => {
		if (left !== undefined) return left;
		return moneyInputFormat.symbol ? (
			<TextInput.Affix text={moneyInputFormat.symbol} textStyle={styles.moneyAffixText} />
		) : undefined;
	}, [left, moneyInputFormat.symbol]);

	const handleChangeText = useCallback(
		(next: string) => {
			const stripped = stripControlChars(next, { allowNewlines: false, allowTabs: false });
			onChangeText(sanitizeMoneyInput(stripped));
		},
		[onChangeText],
	);

	const handleBlur = useCallback(
		(event?: any) => {
			if (!disabled) {
				const normalized = normalizeMoneyOnBlurLocalized(value, currencyCode);
				if (normalized !== value) {
					onChangeText(normalized);
				}
			}
			onBlur?.(event);
		},
		[currencyCode, disabled, onBlur, onChangeText, value],
	);

	return (
		<BAITextInput
			value={value}
			onChangeText={handleChangeText}
			onBlur={handleBlur}
			keyboardType='decimal-pad'
			placeholder={resolvedPlaceholder}
			left={resolvedLeft}
			disabled={disabled}
			{...rest}
		/>
	);
}

const styles = StyleSheet.create({
	moneyAffixText: { marginRight: -11, fontSize: 19 }, // tighten space to the amount
});
