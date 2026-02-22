import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";

const modifiersListKey = ["modifiers", "groups", "attach-picker"] as const;

export function ModifierGroupSelector({
	selectedIds,
	onChange,
	disabled = false,
}: {
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
}) {
	const theme = useTheme();
	const query = useQuery({
		queryKey: modifiersListKey,
		queryFn: () => modifiersApi.listGroups(false),
		staleTime: 30_000,
	});

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const items = query.data ?? [];

	const toggle = (id: string) => {
		if (disabled) return;
		if (selectedSet.has(id)) {
			onChange(selectedIds.filter((x) => x !== id));
			return;
		}
		onChange([...selectedIds, id]);
	};

	return (
		<BAISurface bordered style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}> 
			<View style={styles.headerRow}>
				<BAIText variant='subtitle'>Modifiers</BAIText>
				<BAIText variant='caption' muted>
					{selectedIds.length} selected
				</BAIText>
			</View>
			{query.isLoading ? (
				<BAIText variant='caption' muted>
					Loading modifier groups...
				</BAIText>
			) : query.isError ? (
				<BAIText variant='caption' style={{ color: theme.colors.error }}>
					Unable to load modifier groups.
				</BAIText>
			) : items.length === 0 ? (
				<BAIText variant='caption' muted>
					No modifier groups available.
				</BAIText>
			) : (
				<View style={styles.list}>
					{items.map((item) => {
						const checked = selectedSet.has(item.id);
						return (
							<Pressable
								key={item.id}
								onPress={() => toggle(item.id)}
								disabled={disabled}
								style={({ pressed }) => [styles.row, pressed ? { opacity: 0.8 } : null]}
							>
								<BAIText variant='body'>{item.name}</BAIText>
								<MaterialCommunityIcons
									name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
									size={22}
									color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant ?? theme.colors.onSurface}
								/>
							</Pressable>
						);
					})}
				</View>
			)}
		</BAISurface>
	);
}

const styles = StyleSheet.create({
	card: { borderRadius: 12, padding: 10, gap: 8 },
	headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	list: { gap: 8 },
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 4,
	},
});
