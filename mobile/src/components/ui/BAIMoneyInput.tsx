import React, { useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { TextInput } from "react-native-paper";

import { BAITextInput } from "@/components/ui/BAITextInput";
import { MONEY_INPUT_MAX_VALUE, MONEY_INPUT_PRECISION } from "@/shared/money/money.constants";
import { resolveCurrencySymbol } from "@/shared/money/money.symbol";
import { sanitizeMoneyInput } from "@/shared/validation/sanitize";

type BAITextInputProps = React.ComponentProps<typeof BAITextInput>;

type BAIMoneyInputProps = Omit<BAITextInputProps, "value" | "onChangeText" | "keyboardType"> & {
	value: string;
	onChangeText: (value: string) => void;
	currencyCode: string;
};

function parseMoneyValue(raw: string): number | null {
	const normalized = String(raw ?? "")
		.replace(/,/g, "")
		.trim();
	if (!normalized) return null;
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

function clampMoneyValue(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > MONEY_INPUT_MAX_VALUE) return MONEY_INPUT_MAX_VALUE;
	return value;
}

function formatMoneyNumber(value: number): string {
	const safeValue = clampMoneyValue(value);
	return safeValue.toLocaleString(undefined, {
		minimumFractionDigits: MONEY_INPUT_PRECISION,
		maximumFractionDigits: MONEY_INPUT_PRECISION,
	});
}

export function BAIMoneyInput({ value, onChangeText, currencyCode, onBlur, ...rest }: BAIMoneyInputProps) {
	const currencySymbol = useMemo(() => resolveCurrencySymbol(currencyCode), [currencyCode]);

	const placeholder = useMemo(() => {
		const basePlaceholder = typeof rest.placeholder === "string" && rest.placeholder.trim() ? rest.placeholder : "0.00";
		if (!currencySymbol || basePlaceholder.startsWith(currencySymbol)) return basePlaceholder;
		return `${currencySymbol}${basePlaceholder}`;
	}, [currencySymbol, rest.placeholder]);

	const handleChangeText = useCallback(
		(next: string) => {
			onChangeText(sanitizeMoneyInput(next));
		},
		[onChangeText],
	);

	const handleBlur = useCallback(
		(event: any) => {
			const parsed = parseMoneyValue(value);
			if (parsed == null) {
				onChangeText("");
				onBlur?.(event);
				return;
			}

			onChangeText(formatMoneyNumber(parsed));
			onBlur?.(event);
		},
		[onBlur, onChangeText, value],
	);

	return (
		<BAITextInput
			{...rest}
			value={value}
			onChangeText={handleChangeText}
			onBlur={handleBlur}
			keyboardType='decimal-pad'
			placeholder={placeholder}
			left={currencySymbol ? <TextInput.Affix text={currencySymbol} textStyle={styles.moneyAffixText} /> : undefined}
			contentStyle={[rest.contentStyle, styles.rightAligned]}
		/>
	);
}

const styles = StyleSheet.create({
	moneyAffixText: { marginRight: -11, fontSize: 19 },
	rightAligned: {
		textAlign: "right",
		paddingRight: 4,
	},
});
