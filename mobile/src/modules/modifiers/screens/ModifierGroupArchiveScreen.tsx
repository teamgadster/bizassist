import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";

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

export function ModifierGroupArchiveScreen({ mode }: { mode: "settings" | "inventory" }) {
	const router = useRouter();
	const theme = useTheme();
	const tabBarHeight = useBottomTabBarHeight();
	const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
	const groupId = String(params.id ?? "").trim();
	const exitReturnTo = String(params.returnTo ?? "").trim();
	const { withBusy } = useAppBusy();
	const baseRoute = "/(app)/(tabs)/inventory/modifiers";
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
		withBusy("Archiving modifier set...", async () => {
			await modifiersApi.archiveGroup(groupId);
			runGovernedProcessExit(exitReturnTo || undefined, baseRoute, { router: router as any });
		});
	}, [baseRoute, exitReturnTo, groupId, router, withBusy]);

	const appHeader = useAppHeader("process", {
		title: "Archive Modifier",
		onExit: guardedExit,
		exitFallbackRoute,
	});
	const inventoryHeader = useInventoryHeader("process", {
		title: "Archive Modifier",
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
