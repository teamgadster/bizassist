import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "react-native-paper";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { attributesApi } from "@/modules/attributes/attributes.api";
import { setPendingAttributeSelection } from "@/modules/pos/pos.attributeSelectionStore";
import type { SelectedAttributeSnapshot } from "@/modules/attributes/attributes.types";

type Params = { productId?: string; productName?: string };

export default function PosSelectAttributesScreen() {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<Params>();
	const productId = String(params.productId ?? "").trim();
	const productName = String(params.productName ?? "").trim();
	const [selectionMap, setSelectionMap] = useState<Record<string, string[]>>({});

	const query = useQuery({
		queryKey: ["pos", "attributes", "product", productId],
		queryFn: () => attributesApi.getProductAttributes(productId),
		enabled: !!productId,
		staleTime: 15_000,
	});

	const requiredAttributeIds = useMemo(() => {
		return (query.data ?? [])
			.filter((entry) => entry.isRequired && entry.attribute.options.some((option) => !option.isArchived))
			.map((entry) => entry.attributeId);
	}, [query.data]);

	const canAdd = useMemo(() => {
		if (!query.data || !productId) return false;
		return requiredAttributeIds.every((attributeId) => (selectionMap[attributeId] ?? []).length > 0);
	}, [productId, query.data, requiredAttributeIds, selectionMap]);

	const onExit = () => {
		setPendingAttributeSelection(null);
		router.back();
	};

	const onConfirm = () => {
		if (!query.data || !productId || !canAdd) return;
		const snapshots: SelectedAttributeSnapshot[] = [];
		for (const entry of query.data) {
			const selectedOptionIds = selectionMap[entry.attributeId] ?? [];
			const optionsById = new Map(entry.attribute.options.filter((option) => !option.isArchived).map((o) => [o.id, o]));
			for (const optionId of selectedOptionIds) {
				const option = optionsById.get(optionId);
				if (!option) continue;
				snapshots.push({
					attributeId: entry.attributeId,
					optionId,
					attributeNameSnapshot: entry.attribute.name,
					optionNameSnapshot: option.name,
				});
			}
		}
		setPendingAttributeSelection({ productId, selectedAttributes: snapshots });
		router.back();
	};

	const toggleOption = (attributeId: string, optionId: string, selectionType: "SINGLE" | "MULTI") => {
		setSelectionMap((prev) => {
			const current = prev[attributeId] ?? [];
			if (selectionType === "SINGLE") {
				if (current[0] === optionId) return prev;
				return { ...prev, [attributeId]: [optionId] };
			}
			if (current.includes(optionId)) {
				return { ...prev, [attributeId]: current.filter((id) => id !== optionId) };
			}
			return { ...prev, [attributeId]: [...current, optionId] };
		});
	};

	return (
		<>
			<Stack.Screen
				options={{
					headerShown: true,
					headerShadowVisible: false,
					header: () => (
						<BAIHeader
							title='Select Attributes'
							variant='exit'
							onLeftPress={onExit}
							onRightPress={onConfirm}
							rightDisabled={!canAdd}
							rightSlot={({ disabled }) => (
								<View
									style={[
										styles.addPill,
										{ backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary },
									]}
								>
									<BAIText style={{ color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary }}>
										Add
									</BAIText>
								</View>
							)}
						/>
					),
				}}
			/>
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom style={styles.root}>
				<View style={styles.wrap}>
					<BAISurface style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} bordered>
						<BAIText variant='title'>{productName || "Item"}</BAIText>
						<BAIText variant='caption' muted>
							Choose required attributes before adding to cart.
						</BAIText>
						{query.isLoading ? (
							<BAIText muted>Loading attributes...</BAIText>
						) : query.isError ? (
							<BAIText style={{ color: theme.colors.error }}>Failed to load attributes.</BAIText>
						) : (query.data ?? []).length === 0 ? (
							<BAIText muted>No attributes required.</BAIText>
						) : (
							<ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps='handled'>
								{(query.data ?? []).map((entry) => {
									const options = entry.attribute.options.filter((option) => !option.isArchived);
									if (options.length === 0) return null;
									const selected = selectionMap[entry.attributeId] ?? [];
									return (
										<BAISurface key={entry.attributeId} style={[styles.group, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} bordered>
											<BAIText variant='subtitle'>
												{entry.attribute.name}
												{entry.isRequired ? " *" : ""}
											</BAIText>
											<BAIText variant='caption' muted>
												{entry.attribute.selectionType === "SINGLE" ? "Select one" : "Select one or more"}
											</BAIText>
											<View style={styles.optionsWrap}>
												{options.map((option) => {
													const picked = selected.includes(option.id);
													return (
														<BAIButton
															key={option.id}
															variant={picked ? "solid" : "outline"}
															shape='pill'
															onPress={() => toggleOption(entry.attributeId, option.id, entry.attribute.selectionType)}
														>
															{option.name}
														</BAIButton>
													);
												})}
											</View>
										</BAISurface>
									);
								})}
							</ScrollView>
						)}
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 12 },
	card: { flex: 1, borderRadius: 16, padding: 12, gap: 8 },
	list: { gap: 10, paddingBottom: 12 },
	group: { borderRadius: 12, padding: 10, gap: 6 },
	optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	addPill: { minWidth: 80, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
});
