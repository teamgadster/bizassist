import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { runGovernedProcessExit } from "@/modules/inventory/navigation.governance";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { modifiersApi } from "@/modules/modifiers/modifiers.api";
import { updateModifierGroupArchiveState } from "@/modules/modifiers/modifiers.cache";

export function ModifierGroupRestoreScreen({ mode }: { mode: "settings" | "inventory" }) {
	const router = useRouter();
	const theme = useTheme();
	const tabBarHeight = useBottomTabBarHeight();
	const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
	const groupId = String(params.id ?? "").trim();
	const exitReturnTo = String(params.returnTo ?? "").trim();
	const queryClient = useQueryClient();
	const { withBusy } = useAppBusy();
	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";
	const activeListRoute = `${baseRoute}?filter=active`;
	const detailRoute = `${baseRoute}/${encodeURIComponent(groupId)}`;
	const exitFallbackRoute = groupId ? detailRoute : baseRoute;

	const outline = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor: outline,
			backgroundColor: surfaceAlt,
		}),
		[outline, surfaceAlt],
	);

	const resolveExitRoute = useCallback(() => exitFallbackRoute, [exitFallbackRoute]);

	const onExit = useCallback(() => {
		runGovernedProcessExit(exitReturnTo || undefined, resolveExitRoute(), { router: router as any });
	}, [exitReturnTo, resolveExitRoute, router]);
	const guardedExit = useProcessExitGuard(onExit);

	const onConfirm = useCallback(() => {
		if (!groupId) return;
		withBusy("Restoring modifier set...", async () => {
			await modifiersApi.restoreGroup(groupId);
			updateModifierGroupArchiveState(queryClient, groupId, false);
			await queryClient.invalidateQueries({ queryKey: ["modifiers"] });
			runGovernedProcessExit(undefined, activeListRoute, { router: router as any });
		});
	}, [activeListRoute, groupId, queryClient, router, withBusy]);

	const appHeader = useAppHeader("process", {
		title: "Restore Modifier Set",
		onExit: guardedExit,
		exitFallbackRoute,
	});
	const inventoryHeader = useInventoryHeader("process", {
		title: "Restore Modifier Set",
		onExit: guardedExit,
		exitFallbackRoute,
	});

	return (
		<>
			<Stack.Screen options={mode === "settings" ? appHeader : inventoryHeader} />
			<BAIScreen tabbed padded={false} safeTop={false} safeBottom={false} style={styles.root}>
				<View style={[styles.wrap, { paddingBottom: tabBarHeight + 8 }]}>
					<View style={styles.content}>
						<BAISurface bordered padded style={[styles.card, surfaceInteractive]}>
							<View style={styles.header}>
								<BAIText variant='title'>Restore Modifier Set</BAIText>
							</View>
							<BAIText variant='body'>
								Restored modifier sets become available for new product and service attachments.
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
								<BAIButton shape='pill' widthPreset='standard' style={styles.actionButton} onPress={onConfirm}>
									Restore Modifier Set
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
