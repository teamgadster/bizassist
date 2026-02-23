import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIButton } from "../../../components/ui/BAIButton";
import { BAIScreen } from "../../../components/ui/BAIScreen";
import { BAISurface } from "../../../components/ui/BAISurface";
import { BAIText } from "../../../components/ui/BAIText";
import { useAppBusy } from "../../../hooks/useAppBusy";
import { useInventoryHeader } from "../../inventory/useInventoryHeader";
import { useAppHeader } from "../../navigation/useAppHeader";
import { useProcessExitGuard } from "../../navigation/useProcessExitGuard";
import { modifiersApi } from "../modifiers.api";

export function ModifierGroupLifecycleScreen({
	mode,
	action,
}: {
	mode: "settings" | "inventory";
	action: "archive" | "restore";
}) {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams<{ id?: string }>();
	const groupId = String(params.id ?? "").trim();
	const { withBusy, busy } = useAppBusy();
	const baseRoute = mode === "settings" ? "/(app)/(tabs)/settings/modifiers" : "/(app)/(tabs)/inventory/modifiers";
	const detailRoute = `${baseRoute}/${encodeURIComponent(groupId)}`;
	const exitRoute = groupId ? detailRoute : baseRoute;

	const outline = theme.colors.outlineVariant ?? theme.colors.outline;
	const surfaceAlt = theme.colors.surfaceVariant ?? theme.colors.surface;
	const surfaceInteractive = useMemo(
		() => ({
			borderColor: outline,
			backgroundColor: surfaceAlt,
		}),
		[outline, surfaceAlt],
	);

	const onExit = useCallback(() => {
		router.replace(exitRoute as any);
	}, [exitRoute, router]);
	const guardedExit = useProcessExitGuard(onExit);

	const onConfirm = useCallback(() => {
		if (!groupId) return;
		withBusy(action === "archive" ? "Archiving modifier set..." : "Restoring modifier set...", async () => {
			if (action === "archive") await modifiersApi.archiveGroup(groupId);
			else await modifiersApi.restoreGroup(groupId);
			router.replace(exitRoute as any);
		});
	}, [action, exitRoute, groupId, router, withBusy]);

	const headerTitle = action === "archive" ? "Archive Modifier" : "Restore Modifier";
	const appHeader = useAppHeader("process", { title: headerTitle, onExit: guardedExit, exitFallbackRoute: exitRoute });
	const inventoryHeader = useInventoryHeader("process", {
		title: headerTitle,
		onExit: guardedExit,
		exitFallbackRoute: exitRoute,
	});

	return (
		<>
			<Stack.Screen options={mode === "settings" ? appHeader : inventoryHeader} />
			<BAIScreen tabbed>
				<View style={styles.screen}>
					<BAISurface bordered style={[styles.card, surfaceInteractive]}>
						<BAIText variant='body'>
							{action === "archive"
								? "Archived modifier sets are excluded from new product and service attachments."
								: "Restored modifier sets can be attached to products and services again."}
						</BAIText>
						<View style={styles.footer}>
							<BAIButton variant='outline' style={styles.footerBtn} onPress={guardedExit} disabled={busy.isBusy}>
								Cancel
							</BAIButton>
							<BAIButton style={styles.footerBtn} onPress={onConfirm} disabled={busy.isBusy}>
								{action === "archive" ? "Archive" : "Restore"}
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
