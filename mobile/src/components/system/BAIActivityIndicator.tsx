// BizAssist_mobile
// path: src/components/system/BAIActivityIndicator.tsx

import React, { memo, useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ActivityIndicator as PaperActivityIndicator, useTheme } from "react-native-paper";

export type BAIActivityIndicatorSize = "small" | "medium" | "large" | number;

export type BAIActivityIndicatorProps = {
	/**
	 * Whether the indicator is animating.
	 * Defaults to true.
	 */
	animating?: boolean;

	/**
	 * Standardized size mapping:
	 * - small: 24
	 * - medium: 36
	 * - large: 56
	 * Or pass a numeric size directly.
	 */
	size?: BAIActivityIndicatorSize;

	/**
	 * Optional explicit color override.
	 */
	color?: string;

	/**
	 * Semantic color selection when `color` is not provided.
	 */
	tone?: "primary" | "onSurface" | "onSurfaceVariant";

	/**
	 * Optional style passthrough.
	 */
	style?: StyleProp<ViewStyle>;
};

const SIZE_MAP: Record<Exclude<BAIActivityIndicatorSize, number>, number> = {
	small: 24,
	medium: 36,
	large: 56,
};

function resolveSize(size: BAIActivityIndicatorSize | undefined): number {
	if (typeof size === "number") return size;
	if (!size) return SIZE_MAP.medium;
	return SIZE_MAP[size];
}

export const BAIActivityIndicator = memo(function BAIActivityIndicator({
	animating = true,
	size = "medium",
	color,
	tone = "primary",
	style,
}: BAIActivityIndicatorProps) {
	const theme = useTheme();

	const resolvedSize = useMemo(() => resolveSize(size), [size]);

	const resolvedColor = useMemo(() => {
		if (color) return color;

		// Loader should be light in dark mode and dark in light mode.
		const onSurface = theme.colors.onSurface;
		const onSurfaceVariant = theme.colors.onSurfaceVariant ?? onSurface;
		const primary = onSurface;

		switch (tone) {
			case "onSurface":
				return onSurface;
			case "onSurfaceVariant":
				return onSurfaceVariant;
			case "primary":
			default:
				return primary;
		}
	}, [color, tone, theme.colors]);

	return <PaperActivityIndicator animating={animating} size={resolvedSize} color={resolvedColor} style={style} />;
});
