import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";

export function ModifierGroupArchiveScreen({ mode }: { mode: "settings" | "inventory" }) {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const groupId = String(params.id ?? "").trim();
	const { withBusy } = useAppBusy();
	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";
	const detailRoute = `${baseRoute}/${encodeURIComponent(groupId)}`;

	const onExit = useCallback(() => {
		router.replace(detailRoute as any);
	}, [detailRoute, router]);
	const guardedExit = useProcessExitGuard(onExit);

	const onConfirm = useCallback(() => {
		if (!groupId) return;
		withBusy("Archiving modifier set...", async () => {
			await modifiersApi.archiveGroup(groupId);
			router.replace(baseRoute as any);
		});
	}, [baseRoute, groupId, router, withBusy]);

	const appHeader = useAppHeader("process", {
		title: "Archive Modifier",
		onExit: guardedExit,
		exitFallbackRoute: detailRoute,
	});
	const inventoryHeader = useInventoryHeader("process", {
		title: "Archive Modifier",
		onExit: guardedExit,
		exitFallbackRoute: detailRoute,
	});

	return (
		<>
			<Stack.Screen options={mode === "settings" ? appHeader : inventoryHeader} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<View style={styles.wrap}>
					<View style={styles.content}>
						<BAISurface bordered padded style={styles.card}>
							<View style={styles.header}>
								<BAIText variant='title'>Archive Modifier</BAIText>
							</View>
							<BAIText variant='body'>
								Archiving removes this modifier set from active use while keeping historical records intact.
							</BAIText>
							<View style={styles.actionsRow}>
								<BAIButton
									variant='outline'
									intent='neutral'
									shape='pill'
									widthPreset='standard'
									style={styles.actionButton}
									onPress={guardedExit}
								>
									Cancel
								</BAIButton>
								<BAIButton
									shape='pill'
									widthPreset='standard'
									style={styles.actionButton}
									intent='danger'
									onPress={onConfirm}
								>
									Archive Modifier Set
								</BAIButton>
							</View>
						</BAISurface>
					</View>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	wrap: { flex: 1, paddingHorizontal: 12 },
	content: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center" },
	card: { borderRadius: 18, gap: 12 },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
	actionsRow: { flexDirection: "row", gap: 10 },
	actionButton: { flex: 1 },
});
