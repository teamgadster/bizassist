// BizAssist_mobile
// path: src/components/ui/BAISurface.tsx

import { ReactNode, useMemo } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

export type BAISurfaceProps = {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	padded?: boolean;
	radius?: number;
	bordered?: boolean;
	borderWidth?: number;
	borderColor?: string;
	elevation?: number;
	variant?: "default" | "interactive";
};

export function BAISurface({
	children,
	style,
	padded = true,
	radius = 18,
	bordered = true,
	borderWidth,
	borderColor,
	elevation = 0,
	variant = "default",
}: BAISurfaceProps) {
	const theme = useTheme();

	// Governance:
	// - Use outline (not outlineVariant) for consistent visibility.
	// - Default border width is 1 (no hairline).
	const resolvedBorderColor = borderColor ?? theme.colors.outline;
	const resolvedBorderWidth = borderWidth ?? 1;

	const containerStyle = useMemo<ViewStyle>(() => {
		const elevationColors = (theme as any)?.colors?.elevation as { level1?: string; level2?: string } | undefined;

		const interactiveBg = elevationColors?.level1 ?? elevationColors?.level2 ?? theme.colors.surface;

		const base: ViewStyle = {
			backgroundColor: variant === "interactive" ? interactiveBg : theme.colors.surface,
			borderRadius: radius,
		};

		if (bordered) {
			base.borderColor = resolvedBorderColor;
			base.borderWidth = resolvedBorderWidth;
		}

		if (elevation > 0) {
			base.shadowColor = "#000";
			base.shadowOffset = { width: 0, height: elevation };
			base.shadowOpacity = theme.dark ? 0.3 : 0.12;
			base.shadowRadius = elevation * 3;

			if (Platform.OS === "android") {
				base.elevation = elevation;
			}
		}

		return base;
	}, [theme, radius, bordered, resolvedBorderColor, resolvedBorderWidth, elevation, variant]);

	return <View style={[styles.base, containerStyle, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
	base: {
		marginBottom: 12,
	},
	padded: {
		padding: 14,
	},
});
