// BizAssist_mobile
// path: src/components/ui/BAIDivider.tsx

import React, { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

type Orientation = "horizontal" | "vertical";

type Props = {
	orientation?: Orientation;

	/**
	 * Line thickness in px (default 1).
	 * Use 0.75 if you want to match your softened border baseline.
	 */
	thickness?: number;

	/**
	 * Symmetric inset for horizontal (left/right) or vertical (top/bottom).
	 */
	inset?: number;

	/**
	 * Start inset (left for horizontal, top for vertical)
	 */
	insetStart?: number;

	/**
	 * End inset (right for horizontal, bottom for vertical)
	 */
	insetEnd?: number;

	/**
	 * Optional explicit color override.
	 * Defaults to theme.colors.outlineVariant ?? theme.colors.outline.
	 */
	color?: string;

	/**
	 * Optional dashed divider.
	 */
	dashed?: boolean;

	style?: StyleProp<ViewStyle>;
};

export function BAIDivider({
	orientation = "horizontal",
	thickness = 1,
	inset,
	insetStart,
	insetEnd,
	color,
	dashed = false,
	style,
}: Props) {
	const theme = useTheme();

	const lineColor = color ?? theme.colors.outlineVariant ?? theme.colors.outline;

	const start = insetStart ?? inset ?? 0;
	const end = insetEnd ?? inset ?? 0;

	const dividerStyle = useMemo<ViewStyle>(() => {
		const common: ViewStyle =
			orientation === "horizontal"
				? { alignSelf: "stretch", marginLeft: start, marginRight: end }
				: { alignSelf: "stretch", marginTop: start, marginBottom: end };

		if (!dashed) {
			return {
				...common,
				...(orientation === "horizontal" ? { height: thickness } : { width: thickness }),
				backgroundColor: lineColor,
			};
		}

		// dashed: use border instead of background fill
		return {
			...common,
			backgroundColor: "transparent",
			borderStyle: "dashed",
			...(orientation === "horizontal"
				? { borderTopWidth: thickness, borderTopColor: lineColor }
				: { borderLeftWidth: thickness, borderLeftColor: lineColor }),
		};
	}, [orientation, thickness, start, end, lineColor, dashed]);

	return <View pointerEvents='none' style={[dividerStyle, style]} />;
}
