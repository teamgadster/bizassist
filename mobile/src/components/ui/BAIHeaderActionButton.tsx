import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { BAIText } from "@/components/ui/BAIText";

export function BAIHeaderActionButton({
	label,
	disabled = false,
	variant = "text",
}: {
	label: string;
	disabled?: boolean;
	variant?: "text" | "solid-primary";
}) {
	const theme = useTheme();

	if (variant === "solid-primary") {
		return (
			<View
				style={[
					styles.solidWrap,
					{
						backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary,
					},
				]}
			>
				<BAIText
					variant='subtitle'
					style={[styles.label, { color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary }]}
				>
					{label}
				</BAIText>
			</View>
		);
	}

	return (
		<BAIText
			variant='subtitle'
			style={[styles.label, { color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.primary }]}
		>
			{label}
		</BAIText>
	);
}

const styles = StyleSheet.create({
	label: {
		fontWeight: "700",
	},
	solidWrap: {
		minHeight: 34,
		paddingHorizontal: 12,
		borderRadius: 17,
		alignItems: "center",
		justifyContent: "center",
	},
});
