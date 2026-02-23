import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BAIText } from "@/components/ui/BAIText";

type PosTileTextOverlayProps = {
	label?: string;
	name?: string;
	textColor?: string;
};

export function PosTileTextOverlay({ label, name, textColor = "#FFFFFF" }: PosTileTextOverlayProps) {
	const tileLabel = String(label ?? "").trim();
	const itemName = String(name ?? "").trim();
	const hasTileLabel = tileLabel.length > 0;
	const hasItemName = itemName.length > 0;

	if (!hasTileLabel && !hasItemName) return null;

	return (
		<View style={styles.wrap} pointerEvents='none'>
			<LinearGradient
				colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.40)", "rgba(0,0,0,0.78)"]}
				locations={[0.1, 0.58, 1]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={styles.gradient}
			/>
			<View style={styles.content}>
				{hasTileLabel ? (
					<BAIText variant='subtitle' numberOfLines={1} style={[styles.tileLabelText, { color: textColor }]}>
						{tileLabel}
					</BAIText>
				) : null}
				{hasItemName ? (
					<BAIText variant='caption' numberOfLines={1} ellipsizeMode='tail' style={[styles.tileItemName, { color: textColor }]}>
						{itemName}
					</BAIText>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		top: 0,
		justifyContent: "flex-end",
	},
	gradient: {
		...StyleSheet.absoluteFillObject,
	},
	content: {
		paddingHorizontal: 12,
		paddingBottom: 10,
		paddingTop: 28,
		gap: 2,
		justifyContent: "flex-end",
	},
	tileLabelText: {
		fontWeight: "700",
		fontSize: 30,
		lineHeight: 34,
	},
	tileItemName: {
		fontSize: 18,
		lineHeight: 22,
	},
});
