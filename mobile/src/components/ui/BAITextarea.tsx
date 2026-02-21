// BizAssist_mobile path: src/components/ui/BAITextarea.tsx
import { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { TextInput, useTheme, type TextInputProps } from "react-native-paper";
import { sanitizeTextInput, stripControlChars } from "@/shared/text/sanitizeText";

type BAITextareaProps = Omit<
	TextInputProps,
	"mode" | "multiline" | "numberOfLines" | "contentStyle" | "style" | "outlineStyle"
> & {
	/**
	 * Initial visible line count before auto-growth.
	 */
	visibleLines?: number;

	/**
	 * Keep text scroll behavior while visually clipping any scrollbar indicators.
	 */
	hideScrollIndicator?: boolean;

	/**
	 * Visual height control.
	 * - minHeight defaults to a sensible textarea height.
	 * - maxHeight protects layouts from runaway growth (still scrolls internally).
	 */
	minHeight?: number;
	maxHeight?: number;

	/**
	 * Optional hard cap. If provided, onChangeText will clamp to this length.
	 * Also passed through to Paper TextInput maxLength.
	 */
	maxLength?: number;

	/**
	 * Layout styles apply to the wrapper View (since Paper TextInput style is TextStyle-typed).
	 */
	containerStyle?: StyleProp<ViewStyle>;

	/**
	 * Text styles apply to the inner text area.
	 */
	inputStyle?: StyleProp<TextStyle>;
	sanitizeOptions?: {
		enabled?: boolean;
		allowTabs?: boolean;
		normalizeWhitespace?: boolean;
	};
};

export function BAITextarea({
	visibleLines = 4,
	hideScrollIndicator = false,
	minHeight = 110,
	maxHeight = 220,
	maxLength,
	containerStyle,
	inputStyle,
	scrollEnabled = true,
	onChangeText,
	onBlur,
	value,
	editable,
	disabled,
	sanitizeOptions,
	...props
}: BAITextareaProps) {
	const theme = useTheme();

	const isDisabled = disabled || editable === false;
	const sanitizeEnabled = sanitizeOptions?.enabled ?? true;
	const allowTabs = sanitizeOptions?.allowTabs ?? false;
	const normalizeWhitespace = sanitizeOptions?.normalizeWhitespace ?? false;

	const resolvedOnChangeText = useMemo(() => {
		if (!onChangeText) return undefined;

		const sanitizeForChange = (text: string) => {
			if (!sanitizeEnabled) return text;
			return stripControlChars(text, {
				allowNewlines: true,
				allowTabs,
			});
		};

		if (typeof maxLength === "number" && Number.isFinite(maxLength) && maxLength > 0) {
			return (text: string) => {
				const sanitized = sanitizeForChange(text);
				onChangeText(sanitized.length > maxLength ? sanitized.slice(0, maxLength) : sanitized);
			};
		}

		return (text: string) => {
			onChangeText(sanitizeForChange(text));
		};
	}, [allowTabs, maxLength, onChangeText, sanitizeEnabled]);

	const resolvedOnBlur = useMemo(() => {
		if (!onBlur && !onChangeText) return undefined;

		return (event: any) => {
			if (sanitizeEnabled && onChangeText && typeof value === "string") {
				const sanitized = sanitizeTextInput(value, {
					allowNewlines: true,
					allowTabs,
					normalizeWhitespace,
				});
				if (sanitized !== value) {
					onChangeText(sanitized);
				}
			}

			onBlur?.(event);
		};
	}, [allowTabs, normalizeWhitespace, onBlur, onChangeText, sanitizeEnabled, value]);

	return (
		<View style={[styles.wrapper, hideScrollIndicator ? styles.clipScrollIndicator : null, containerStyle]}>
			<TextInput
				{...props}
				mode='outlined'
				multiline
				numberOfLines={visibleLines}
				value={value}
				disabled={isDisabled}
				scrollEnabled={scrollEnabled}
				onChangeText={resolvedOnChangeText}
				onBlur={resolvedOnBlur}
				maxLength={maxLength}
				textAlignVertical='top'
				// IMPORTANT: style is TextStyle-typed in Paper, so keep it minimal and text-safe.
				style={styles.input}
				contentStyle={[
					styles.content,
					{
						minHeight,
						maxHeight,
						color: theme.colors.onSurface,
					},
					inputStyle,
				]}
				outlineStyle={styles.outline}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		width: "100%",
	},
	clipScrollIndicator: {
		overflow: "hidden",
	},
	// Paper TextInput style is typed as TextStyle; avoid ViewStyle-only props here.
	input: {
		width: "100%",
	},
	// Inner text area styles
	content: {
		paddingTop: 12,
		paddingBottom: 12,
	},
	outline: {
		borderRadius: 14,
	},
});
