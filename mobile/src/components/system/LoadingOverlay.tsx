// path: src/components/system/LoadingOverlay.tsx
import { memo, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Portal, useTheme } from "react-native-paper";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIText } from "@/components/ui/BAIText";

type LoadingOverlayProps = {
	visible: boolean;
	message?: string;
	submessage?: string;
};

/**
 * Global, non-dismissable loading overlay.
 * - Must sit above navigation (Portal)
 * - Must block touches behind it (absolute fill)
 * - Theme-aware backdrop (light vs dark)
 * - Shadowed panel for depth and focus
 */
function LoadingOverlay({ visible, message, submessage }: LoadingOverlayProps) {
	const theme = useTheme();

	const backdropColor = useMemo(() => {
		if (theme.dark) {
			// Dark mode: near-black, controlled opacity (focus + authority)
			return "rgba(0, 0, 0, 0.65)";
		}

		// Light mode: soft surface tint, avoids harsh blackout
		return "rgba(250, 250, 250, 0.65)";
	}, [theme.dark]);

	if (!visible) return null;

	return (
		<Portal>
			<View
				style={[styles.backdrop, { backgroundColor: backdropColor }]}
				pointerEvents='auto'
				accessibilityViewIsModal
				accessibilityRole='alert'
			>
				<View style={[styles.panel, styles.panelShadow, { backgroundColor: theme.colors.surface }]}>
					<BAIActivityIndicator size={56} />
					{!!message && (
						<BAIText variant='body' style={styles.message}>
							{message}
						</BAIText>
					)}
					{!!submessage && (
						<BAIText variant='caption' style={styles.submessage}>
							{submessage}
						</BAIText>
					)}
				</View>
			</View>
		</Portal>
	);
}

export default memo(LoadingOverlay);

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	panel: {
		width: 160,
		height: 160,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
		paddingHorizontal: 10,
	},
	panelShadow: {
		...(Platform.OS === "ios"
			? {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 6 },
					shadowOpacity: 0.25,
					shadowRadius: 16,
			  }
			: {
					elevation: 10,
			  }),
	},
	message: {
		marginTop: 12,
		textAlign: "center",
	},
	submessage: {
		marginTop: 6,
		textAlign: "center",
		opacity: 0.8,
	},
});
