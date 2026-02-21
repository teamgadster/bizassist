// BizAssist_mobile
// path: src/modules/inventory/components/InventorySearchBar.tsx

import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAIIconButton } from "@/components/ui/BAIIconButton";

import { FIELD_LIMITS } from "@/shared/fieldLimits";

const INPUT_HEIGHT = 56;

type Props = {
	value: string;
	onChangeText: (v: string) => void;

	// Scan button
	onPressScan: () => void;

	// Optional enhancements (backward-safe)
	onSubmit?: () => void;
	scanEnabled?: boolean;
	placeholder?: string;
	disabled?: boolean;
};

export function InventorySearchBar({
	value,
	onChangeText,
	onPressScan,
	onSubmit,
	scanEnabled = true,
	placeholder,
	disabled,
}: Props) {
	const theme = useTheme();

	const outline = theme.dark ? theme.colors.outline : theme.colors.outlineVariant ?? theme.colors.outline;

	const ph = useMemo(() => placeholder ?? "Search ", [placeholder]);

	const isDisabled = !!disabled;
	const canSubmit = !isDisabled && typeof onSubmit === "function";
	const canScan = !isDisabled && !!scanEnabled;

	const iconColor = canScan ? theme.colors.onSurface : theme.colors.onSurfaceDisabled;

	// BAISearchBar already enforces maxLength and caps input; keep a tight wrapper for parity
	// and to make future governance changes local.
	const handleChangeText = useCallback(
		(v: string) => {
			// BAISearchBar caps, but we keep this as an additional safety net.
			onChangeText(v.length > FIELD_LIMITS.search ? v.slice(0, FIELD_LIMITS.search) : v);
		},
		[onChangeText]
	);

	const handleSubmit = useCallback(() => {
		if (!canSubmit) return;
		// Trim on submit to keep query keys deterministic and avoid “space-only” searches.
		onChangeText((value ?? "").trim());
		onSubmit?.();
	}, [canSubmit, onChangeText, onSubmit, value]);

	return (
		<View style={styles.row}>
			<BAISearchBar
				value={value}
				onChangeText={handleChangeText}
				placeholder={ph}
				disabled={isDisabled}
				maxLength={FIELD_LIMITS.search}
				returnKeyType='search'
				onSubmit={canSubmit ? handleSubmit : undefined}
				height={INPUT_HEIGHT}
				style={styles.search}
				accessibilityLabel='Search inventory'
			/>

			<View style={styles.scanBtnWrapper}>
				<BAIIconButton
					icon='barcode-scan'
					accessibilityLabel='Scan barcode'
					onPress={onPressScan}
					disabled={!canScan}
					variant='outlined'
					iconColor={iconColor}
					style={[
						styles.scanBtn,
						{
							width: INPUT_HEIGHT,
							height: INPUT_HEIGHT,
							borderRadius: INPUT_HEIGHT / 2,
							borderColor: outline,
							backgroundColor: theme.colors.surface,
						},
					]}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	search: {
		flex: 1,
	},
	scanBtnWrapper: {
		height: INPUT_HEIGHT,
		width: INPUT_HEIGHT,
		borderRadius: INPUT_HEIGHT / 2,
		overflow: "hidden",
	},
	scanBtn: {
		// Keep icon button perfectly square and aligned with pill language
	},
});
