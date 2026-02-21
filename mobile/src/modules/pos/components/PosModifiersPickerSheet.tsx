import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import type { ProductModifierGroup } from "@/modules/pos/pos.api";

type SelectionMap = Record<string, string[]>;

type Props = {
	visible: boolean;
	groups: ProductModifierGroup[];
	currencyCode: string;
	onClose: () => void;
	onConfirm: (selectionMap: SelectionMap, selectedModifierOptionIds: string[], totalDeltaMinor: bigint) => void;
};

function formatMinor(minor: bigint): string {
	const sign = minor < 0n ? "-" : "+";
	const abs = minor < 0n ? -minor : minor;
	const whole = abs / 100n;
	const cents = (abs % 100n).toString().padStart(2, "0");
	return `${sign} ${whole.toString()}.${cents}`;
}

export function PosModifiersPickerSheet({ visible, groups, onClose, onConfirm }: Props) {
	const theme = useTheme();
	const [selectionMap, setSelectionMap] = useState<SelectionMap>({});

	const validationMessage = useMemo(() => {
		for (const group of groups) {
			const selectedCount = (selectionMap[group.id] ?? []).length;
			if (group.isRequired && selectedCount < group.minSelected) {
				return `${group.name}: select at least ${group.minSelected}.`;
			}
			if (selectedCount > group.maxSelected) {
				return `${group.name}: select up to ${group.maxSelected}.`;
			}
			if (group.selectionType === "SINGLE" && selectedCount > 1) {
				return `${group.name}: single selection only.`;
			}
		}
		return null;
	}, [groups, selectionMap]);

	const totalDeltaMinor = useMemo(() => {
		let total = 0n;
		for (const group of groups) {
			const selectedIds = new Set(selectionMap[group.id] ?? []);
			for (const option of group.options) {
				if (!selectedIds.has(option.id)) continue;
				total += BigInt(option.priceDeltaMinor);
			}
		}
		return total;
	}, [groups, selectionMap]);

	function toggle(group: ProductModifierGroup, optionId: string) {
		setSelectionMap((prev) => {
			const current = prev[group.id] ?? [];
			const has = current.includes(optionId);
			if (group.selectionType === "SINGLE") {
				if (has) return { ...prev, [group.id]: [] };
				return { ...prev, [group.id]: [optionId] };
			}
			if (has) return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
			if (current.length >= group.maxSelected) return prev;
			return { ...prev, [group.id]: [...current, optionId] };
		});
	}

	function onConfirmPress() {
		if (validationMessage) return;
		const selectedModifierOptionIds = Object.values(selectionMap).flat();
		onConfirm(selectionMap, selectedModifierOptionIds, totalDeltaMinor);
	}

	return (
		<Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
			<View style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				<BAISurface style={[styles.sheet, { backgroundColor: theme.colors.surface }]} bordered radius={16}>
					<BAIText variant='title'>Modifiers</BAIText>
					<ScrollView style={styles.body} contentContainerStyle={{ gap: 12 }}>
						{groups.map((group) => {
							const selectedIds = new Set(selectionMap[group.id] ?? []);
							return (
								<View key={group.id} style={styles.groupWrap}>
									<BAIText variant='subtitle'>{group.name}</BAIText>
									<BAIText variant='caption' muted>
										{group.selectionType === "SINGLE" ? "Single" : "Multi"} •{" "}
										{group.isRequired ? "Required" : "Optional"}
									</BAIText>
									<View style={styles.optionsWrap}>
										{group.options.map((option) => {
											const selected = selectedIds.has(option.id);
											return (
												<Pressable
													key={option.id}
													onPress={() => toggle(group, option.id)}
													style={[
														styles.optionRow,
														{ borderColor: theme.colors.outline },
														selected && { borderColor: theme.colors.primary },
													]}
												>
													<BAIText variant='body'>{option.name}</BAIText>
													<BAIText variant='caption' muted>
														{formatMinor(BigInt(option.priceDeltaMinor))}
													</BAIText>
												</Pressable>
											);
										})}
									</View>
								</View>
							);
						})}
					</ScrollView>
					{validationMessage ? (
						<BAIText variant='caption' style={{ color: theme.colors.error }}>
							{validationMessage}
						</BAIText>
					) : null}
					<View style={styles.footer}>
						<BAIButton variant='outline' onPress={onClose}>
							Cancel
						</BAIButton>
						<BAIButton onPress={onConfirmPress}>Add ({formatMinor(totalDeltaMinor)})</BAIButton>
					</View>
				</BAISurface>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
	sheet: { maxHeight: "82%", padding: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
	body: { marginTop: 10 },
	groupWrap: { gap: 6 },
	optionsWrap: { gap: 6 },
	optionRow: {
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderRadius: 10,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	footer: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", gap: 10 },
});
