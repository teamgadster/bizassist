import { useMemo } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";

import { BAINeutralCheckbox } from "@/components/ui/BAINeutralCheckbox";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { formatCompactNumber } from "@/lib/locale/businessLocale";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import type { ModifierGroup } from "@/modules/modifiers/modifiers.types";

export const modifierGroupSelectorKey = ["modifiers", "groups", "attach-picker"] as const;

function buildOptionSummary(group: ModifierGroup, countryCode?: string | null): string {
	const activeOptionNames = group.options
		.filter((option) => !option.isArchived)
		.map((option) => option.name.trim())
		.filter(Boolean);

	if (activeOptionNames.length === 0) return "No active modifiers";
	if (activeOptionNames.length <= 3) return activeOptionNames.join(", ");
	return `${activeOptionNames.slice(0, 3).join(", ")}, +${formatCompactNumber(activeOptionNames.length - 3, countryCode)} more`;
}

export function ModifierGroupSelector({
	selectedIds,
	onChange,
	disabled = false,
	showHeader = true,
	useContainer = true,
	showRowDividers = false,
	style,
	emptyMode = "message",
	groups,
	isLoading,
	isError,
}: {
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
	showHeader?: boolean;
	useContainer?: boolean;
	showRowDividers?: boolean;
	style?: StyleProp<ViewStyle>;
	emptyMode?: "message" | "hidden";
	groups?: ModifierGroup[];
	isLoading?: boolean;
	isError?: boolean;
}) {
	const theme = useTheme();
	const { countryCode } = useActiveBusinessMeta();
	const query = useQuery({
		queryKey: modifierGroupSelectorKey,
		queryFn: () => modifiersApi.listGroups(false),
		staleTime: 30_000,
	});

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const items = groups ?? query.data ?? [];
	const loading = typeof isLoading === "boolean" ? isLoading : query.isLoading;
	const error = typeof isError === "boolean" ? isError : query.isError;
	const shouldHideWhenEmpty = !loading && !error && items.length === 0 && emptyMode === "hidden";

	const toggle = (id: string) => {
		if (disabled) return;
		if (selectedSet.has(id)) {
			onChange(selectedIds.filter((x) => x !== id));
			return;
		}
		onChange([...selectedIds, id]);
	};

	if (shouldHideWhenEmpty) return null;

	const content = (
		<>
			{showHeader ? (
				<View style={styles.headerRow}>
					<BAIText variant='subtitle'>Modifiers</BAIText>
					<BAIText variant='caption' muted>
						{formatCompactNumber(selectedIds.length, countryCode)} selected
					</BAIText>
				</View>
			) : null}
			{loading ? (
				<BAIText variant='caption' muted>
					Loading modifier groups...
				</BAIText>
			) : error ? (
				<BAIText variant='caption' style={{ color: theme.colors.error }}>
					Unable to load modifier groups.
				</BAIText>
			) : items.length === 0 ? (
				emptyMode === "message" ? (
					<BAIText variant='caption' muted>
						No modifier groups available.
					</BAIText>
				) : null
			) : (
				<View style={styles.list}>
					{items.map((item, index) => {
						const checked = selectedSet.has(item.id);
						const optionSummary = buildOptionSummary(item, countryCode);
						const isLast = index === items.length - 1;
						return (
							<Pressable
								key={item.id}
								onPress={() => toggle(item.id)}
								disabled={disabled}
								style={({ pressed }) => [
									styles.row,
									showRowDividers && !isLast
										? {
											borderBottomWidth: StyleSheet.hairlineWidth,
											borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
											paddingBottom: 10,
											marginBottom: 10,
										}
										: null,
									pressed ? { opacity: 0.8 } : null,
								]}
							>
								<View style={styles.rowText}>
									<BAIText variant='body' style={styles.rowTitle}>
										{item.name}
									</BAIText>
									<BAIText variant='caption' muted numberOfLines={1}>
										{optionSummary}
									</BAIText>
								</View>
								<BAINeutralCheckbox checked={checked} disabled={disabled} />
							</Pressable>
						);
					})}
				</View>
			)}
		</>
	);

	if (!useContainer) {
		return <View style={style}>{content}</View>;
	}

	return (
		<BAISurface
			bordered
			style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }, style]}
		>
			{content}
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
		paddingVertical: 6,
		gap: 12,
	},
	rowText: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	rowTitle: {
		fontWeight: "600",
	},
});
