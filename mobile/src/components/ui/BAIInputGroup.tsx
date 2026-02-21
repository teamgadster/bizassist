// BizAssist_mobile path: src/components/ui/BAIInputGroup.tsx
import { useCallback, useMemo } from "react";
import {
	Platform,
	StyleSheet,
	TextInput,
	View,
	type StyleProp,
	type TextInputProps,
	type ViewStyle,
} from "react-native";
import { useTheme } from "react-native-paper";

import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

type Props = {
	value: string;
	onChangeText: (v: string) => void;

	placeholder?: string;

	/**
	 * Button configuration
	 */
	buttonLabel: string;
	onPressButton: () => void;

	/**
	 * Optional submit behavior from keyboard (Enter)
	 */
	onSubmit?: () => void;

	/**
	 * Input constraints / states
	 */
	maxLength?: number;
	disabled?: boolean;
	busy?: boolean;

	/**
	 * Optional styling
	 */
	style?: StyleProp<ViewStyle>;

	/**
	 * Pass-through to TextInput when needed.
	 * Note: value/onChangeText/placeholder/maxLength are already controlled above.
	 */
	inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "maxLength" | "editable">;
};

export function BAIInputGroup({
	value,
	onChangeText,
	placeholder = "Type to search…",
	buttonLabel,
	onPressButton,
	onSubmit,
	maxLength,
	disabled = false,
	busy = false,
	style,
	inputProps,
}: Props) {
	const theme = useTheme();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const bg = theme.colors.surface;

	const isDisabled = disabled || busy;

	const handlePress = useCallback(() => {
		if (isDisabled) return;
		onPressButton();
	}, [isDisabled, onPressButton]);

	const handleSubmit = useCallback(() => {
		if (isDisabled) return;
		// If a dedicated onSubmit exists, use it; else behave like button press.
		if (onSubmit) onSubmit();
		else onPressButton();
	}, [isDisabled, onPressButton, onSubmit]);

	const inputTextColor = theme.colors.onSurface;
	const placeholderColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

	const buttonBg = theme.colors.surface;
	const buttonText = theme.colors.onSurface;
	const dividerColor = borderColor;

	const buttonStyle = useMemo(
		() => [
			styles.button,
			{
				backgroundColor: buttonBg,
				borderLeftColor: dividerColor,
				opacity: isDisabled ? 0.45 : 1,
			},
		],
		[buttonBg, dividerColor, isDisabled]
	);

	return (
		<BAISurface
			padded={false}
			style={[
				styles.container,
				{
					backgroundColor: bg,
					borderColor,
				},
				isDisabled && { opacity: 0.9 },
				style,
			]}
		>
			<View style={styles.inputWrap}>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={placeholderColor}
					maxLength={maxLength}
					editable={!isDisabled}
					returnKeyType='search'
					onSubmitEditing={handleSubmit}
					style={[
						styles.input,
						{
							color: inputTextColor,
						},
					]}
					{...inputProps}
				/>
			</View>

			<View style={styles.buttonWrap}>
				<View
					// Use a plain press handler pattern without Touchable opacity animations
					// to keep the "input group" feeling solid and predictable.
					style={buttonStyle as any}
					onTouchEnd={handlePress as any}
				>
					<BAIText variant='body' style={[styles.buttonText, { color: buttonText }]}>
						{busy ? "…" : buttonLabel}
					</BAIText>
				</View>
			</View>
		</BAISurface>
	);
}

const styles = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderRadius: 14,
		flexDirection: "row",
		alignItems: "stretch",
		overflow: Platform.OS === "ios" ? "hidden" : "hidden",
	},

	inputWrap: {
		flex: 1,
		minWidth: 0,
	},

	input: {
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 16,
	},

	buttonWrap: {
		alignSelf: "stretch",
	},

	button: {
		alignSelf: "stretch",
		justifyContent: "center",
		paddingHorizontal: 16,
		borderLeftWidth: 1,
		minWidth: 92,
	},

	buttonText: {
		fontWeight: "600",
	},
});
