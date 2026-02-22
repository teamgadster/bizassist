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

export function ModifierGroupRestoreScreen({ mode }: { mode: "settings" | "inventory" }) {
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
		withBusy("Restoring modifier...", async () => {
			await modifiersApi.restoreGroup(groupId);
			router.replace(detailRoute as any);
		});
	}, [detailRoute, groupId, router, withBusy]);

	const appHeader = useAppHeader("process", { title: "Restore Modifier", onExit: guardedExit, exitFallbackRoute: detailRoute });
	const inventoryHeader = useInventoryHeader("process", {
		title: "Restore Modifier",
		onExit: guardedExit,
		exitFallbackRoute: detailRoute,
	});

	return (
		<>
			<Stack.Screen options={mode === "settings" ? appHeader : inventoryHeader} />
			<BAIScreen tabbed>
				<View style={styles.screen}>
					<BAISurface bordered variant='interactive' style={styles.card}>
						<BAIText variant='body'>Restored modifier groups become available for new product and service attachments.</BAIText>
						<View style={styles.footer}>
							<BAIButton variant='outline' style={styles.footerBtn} onPress={guardedExit}>
								Cancel
							</BAIButton>
							<BAIButton style={styles.footerBtn} onPress={onConfirm}>
								Restore
							</BAIButton>
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, padding: 12 },
	card: { borderRadius: 14, padding: 12, gap: 10 },
	footer: { flexDirection: "row", gap: 10 },
	footerBtn: { flex: 1 },
});
