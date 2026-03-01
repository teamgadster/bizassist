import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIGroupTabs, type BAIGroupTab } from "@/components/ui/BAIGroupTabs";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAISwitchRow } from "@/components/ui/BAISwitchRow";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { useTheme } from "react-native-paper";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeProductNameInput } from "@/shared/validation/sanitize";
import { attributesApi } from "../attributes.api";
import { attributesKeys } from "../attributes.queryKeys";
import type { AttributeSelectionType, UpsertAttributeOptionInput } from "../attributes.types";

type Params = { id?: string; returnTo?: string };

const selectionTabs: readonly BAIGroupTab<AttributeSelectionType>[] = [
	{ label: "Single", value: "SINGLE" },
	{ label: "Multi", value: "MULTI" },
] as const;

function makeOption(): UpsertAttributeOptionInput {
	return { name: "" };
}

export function AttributeUpsertScreen({ mode }: { mode: "inventory" | "settings" }) {
	const router = useRouter();
	const theme = useTheme();
	const qc = useQueryClient();
	const params = useLocalSearchParams<Params>();
	const id = String(params.id ?? "").trim();
	const intent = id ? "edit" : "create";
	const { withBusy, busy } = useAppBusy();
	const tabBarHeight = useBottomTabBarHeight();
	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/items-services/attributes" : "/(app)/(tabs)/inventory/attributes";

	const query = useQuery({
		queryKey: attributesKeys.detail(id),
		queryFn: () => attributesApi.getById(id),
		enabled: !!id,
		staleTime: 30_000,
	});

	const item = query.data;
	const [name, setName] = useState("");
	const [selectionType, setSelectionType] = useState<AttributeSelectionType>("SINGLE");
	const [isRequired, setIsRequired] = useState(false);
	const [options, setOptions] = useState<UpsertAttributeOptionInput[]>([makeOption()]);
	const [hydratedId, setHydratedId] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!item || hydratedId === item.id) return;
		setName(item.name);
		setSelectionType(item.selectionType);
		setIsRequired(item.isRequired);
		setOptions(item.options.map((option) => ({ id: option.id, name: option.name, isArchived: option.isArchived })));
		setHydratedId(item.id);
	}, [hydratedId, item]);

	const isUiDisabled = !!busy?.isBusy;
	const normalizedName = useMemo(() => sanitizeProductNameInput(name).trim(), [name]);
	const normalizedOptions = useMemo(
		() =>
			options.map((option, index) => ({
				id: option.id,
				name: sanitizeProductNameInput(option.name).trim(),
				sortOrder: index,
				isArchived: option.isArchived === true,
			})),
		[options],
	);
	const activeOptions = useMemo(
		() => normalizedOptions.filter((option) => !option.isArchived && option.name.length > 0),
		[normalizedOptions],
	);
	const canSave = normalizedName.length >= 1 && (!isRequired || activeOptions.length > 0) && !isUiDisabled;

	const mutation = useMutation({
		mutationFn: async () => {
			const payload = {
				name: normalizedName,
				selectionType,
				isRequired,
				options: normalizedOptions.filter((option) => option.name.length > 0),
			};
			if (intent === "edit") {
				return attributesApi.update(id, payload);
			}
			return attributesApi.create(payload);
		},
		onSuccess: async (saved) => {
			await qc.invalidateQueries({ queryKey: attributesKeys.all });
			router.replace(`${baseRoute}/${encodeURIComponent(saved.id)}/edit` as any);
		},
		onError: (e: any) => {
			const code = e?.response?.data?.error?.code;
			if (code === "ATTRIBUTE_NAME_TAKEN") {
				setError("Attribute name already exists.");
				return;
			}
			setError(String(e?.response?.data?.error?.message ?? e?.message ?? "Failed to save attribute."));
		},
	});

	const archiveMutation = useMutation({
		mutationFn: async () => {
			if (!id) return;
			if (item?.isArchived) return attributesApi.restore(id);
			return attributesApi.archive(id);
		},
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: attributesKeys.all });
			if (id) await qc.invalidateQueries({ queryKey: attributesKeys.detail(id) });
		},
	});

	const onExit = useCallback(() => {
		router.replace(baseRoute as any);
	}, [baseRoute, router]);
	const header = useInventoryHeader("process", {
		title: intent === "edit" ? "Edit Attribute" : "Create Attribute",
		onExit,
		disabled: isUiDisabled,
		exitFallbackRoute: baseRoute,
	});

	const onSave = useCallback(() => {
		if (!canSave) return;
		setError(null);
		withBusy("Saving attribute...", async () => {
			await mutation.mutateAsync();
		});
	}, [canSave, mutation, withBusy]);

	return (
		<>
			<Stack.Screen options={{ ...header, headerShadowVisible: false }} />
			<BAIScreen padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<View style={[styles.wrap, { backgroundColor: theme.colors.background, paddingBottom: tabBarHeight + 8 }]}>
					<BAISurface style={[styles.card, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]} padded={false}>
						<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
							<BAITextInput
								label='Name'
								value={name}
								onChangeText={(value) => setName(value.slice(0, FIELD_LIMITS.modifierSetName))}
								disabled={isUiDisabled}
							/>
							<BAIGroupTabs tabs={selectionTabs} value={selectionType} onChange={setSelectionType} disabled={isUiDisabled} />
							<BAISwitchRow
								label='Required by default'
								value={isRequired}
								onValueChange={setIsRequired}
								disabled={isUiDisabled}
							/>
							<BAIText variant='subtitle'>Options</BAIText>
							{options.map((option, index) => (
								<View key={`${option.id ?? "new"}-${index}`} style={styles.optionRow}>
									<BAITextInput
										label={`Option ${index + 1}`}
										value={option.name}
										onChangeText={(value) =>
											setOptions((prev) => prev.map((entry, i) => (i === index ? { ...entry, name: value } : entry)))
										}
										disabled={isUiDisabled}
									/>
									<BAISwitchRow
										label='Archived'
										value={option.isArchived === true}
										onValueChange={(value) =>
											setOptions((prev) => prev.map((entry, i) => (i === index ? { ...entry, isArchived: value } : entry)))
										}
										disabled={isUiDisabled}
									/>
								</View>
							))}
							<BAIButton variant='outline' shape='pill' onPress={() => setOptions((prev) => [...prev, makeOption()])}>
								Add Option
							</BAIButton>
							{error ? (
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									{error}
								</BAIText>
							) : null}
							<View style={styles.actions}>
								<BAIButton variant='outline' shape='pill' onPress={onExit} disabled={isUiDisabled}>
									Cancel
								</BAIButton>
								<BAIButton shape='pill' onPress={onSave} disabled={!canSave}>
									Save
								</BAIButton>
							</View>
							{intent === "edit" ? (
								<BAIButton
									intent={item?.isArchived ? "success" : "danger"}
									shape='pill'
									onPress={() => withBusy("Updating attribute...", async () => archiveMutation.mutateAsync())}
									disabled={isUiDisabled}
								>
									{item?.isArchived ? "Restore Attribute" : "Archive Attribute"}
								</BAIButton>
							) : null}
						</ScrollView>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 12 },
	card: { flex: 1, borderWidth: 1, borderRadius: 16 },
	content: { padding: 12, gap: 10 },
	optionRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 8 },
	actions: { flexDirection: "row", gap: 10 },
});
