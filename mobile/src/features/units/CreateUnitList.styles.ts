// src/features/units/CreateUnitList.styles.ts

import { StyleSheet } from "react-native";

const HAIRLINE = StyleSheet.hairlineWidth;
const BOTTOM_BAR_HEIGHT = 72;

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},

	searchWrap: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 10,
		backgroundColor: "#FFFFFF",
	},
	search: {
		backgroundColor: "transparent",
	},

	sectionHeader: {
		paddingHorizontal: 16,
		paddingTop: 22,
		paddingBottom: 10,
		backgroundColor: "#FFFFFF",
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		letterSpacing: 0.6,
		color: "#6B6B6B",
	},
	sectionDivider: {
		marginTop: 10,
		height: HAIRLINE,
		backgroundColor: "#E6E6E6",
	},

	row: {
		paddingHorizontal: 16,
		paddingVertical: 18,
		backgroundColor: "#FFFFFF",
	},
	rowDivider: {
		height: HAIRLINE,
		backgroundColor: "#E6E6E6",
	},

	rowText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1F1F1F",
	},
	symbol: {
		fontWeight: "500",
		color: "#6B6B6B",
	},

	listContent: {
		paddingBottom: BOTTOM_BAR_HEIGHT + 16,
	},

	bottomBar: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: BOTTOM_BAR_HEIGHT,
		backgroundColor: "#EFEFEF",
		borderTopWidth: HAIRLINE,
		borderTopColor: "#DADADA",
		justifyContent: "center",
		alignItems: "center",
	},
	bottomBarText: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1F1F1F",
	},
});
