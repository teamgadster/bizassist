// BizAssist_mobile
// path: src/modules/options/screens/OptionSetLifecycleScreen.tsx

import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import {
	buildInventoryOptionDetailsRoute,
	buildSettingsOptionDetailsRoute,
	INVENTORY_OPTIONS_LEDGER_ROUTE,
	normalizeReturnTo,
	SETTINGS_OPTIONS_LEDGER_ROUTE,
} from "@/modules/options/options.navigation";
import { useArchiveOptionSet, useOptionSetById, useRestoreOptionSet } from "@/modules/options/options.queries";

type OptionSetFlowMode = "settings" | "inventory";
type OptionLifecycleAction = "archive" | "restore";

type RouteParams = {
	id?: string;
	returnTo?: string;
};

function normalizeRoutePath(route: string | null | undefined): string {
	return String(route ?? "").split("?")[0].split("#")[0].trim();
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
	const data = (err as any)?.response?.data;
	const msg = data?.message ?? data?.error?.message ?? (err as any)?.message ?? fallback;
	return String(msg);
}

export function OptionSetLifecycleScreen({
	mode = "settings",
	action,
}: {
	mode?: OptionSetFlowMode;
	action: OptionLifecycleAction;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const theme = useTheme();
	const params = useLocalSearchParams<RouteParams>();
	const { withBusy, busy } = useAppBusy();

	const optionSetId = String(params.id ?? "").trim();
	const returnTo = useMemo(() => normalizeReturnTo(params.returnTo), [params.returnTo]);
	const currentPath = useMemo(() => normalizeRoutePath(pathname), [pathname]);
	const ledgerRoute = mode === "settings" ? SETTINGS_OPTIONS_LEDGER_ROUTE : INVENTORY_OPTIONS_LEDGER_ROUTE;

	const query = useOptionSetById(optionSetId);
	const archive = useArchiveOptionSet(optionSetId);
	const restore = useRestoreOptionSet(optionSetId);

	const [error, setError] = useState<string | null>(null);

	const navLockRef = useRef(false);
	const [isNavLocked, setIsNavLocked] = useState(false);
	const lockNav = useCallback((ms = 650) => {
		if (navLockRef.current) return false;
		navLockRef.current = true;
		setIsNavLocked(true);
		setTimeout(() => {
			navLockRef.current = false;
			setIsNavLocked(false);
		}, ms);
		return true;
	}, []);

	const isUiDisabled = !!busy?.isBusy || isNavLocked || archive.isPending || restore.isPending;
	const optionSet = query.data ?? null;
	const canRun = action === "archive" ? !!optionSet && optionSet.isActive : !!optionSet && !optionSet.isActive;
	const detailRoute =
		mode === "settings"
			? buildSettingsOptionDetailsRoute(optionSetId, null)
			: buildInventoryOptionDetailsRoute(optionSetId, null);
	const resolveSafeRoute = useCallback(
		(candidate: string | null | undefined, fallback: string): string => {
			const candidatePath = normalizeRoutePath(candidate);
			if (!candidatePath || candidatePath === currentPath) return fallback;
			return candidate as string;
		},
		[currentPath],
	);

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		if (!optionSetId) {
			router.replace(resolveSafeRoute(returnTo ?? ledgerRoute, ledgerRoute) as any);
			return;
		}
		router.replace(resolveSafeRoute(detailRoute, ledgerRoute) as any);
	}, [detailRoute, isUiDisabled, ledgerRoute, lockNav, optionSetId, resolveSafeRoute, returnTo, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onConfirm = useCallback(async () => {
		if (!canRun || isUiDisabled || !optionSet) return;
		if (!lockNav()) return;

		setError(null);
		await withBusy(action === "archive" ? "Archiving option…" : "Restoring option…", async () => {
			try {
				if (action === "archive") {
					await archive.mutateAsync();
				} else {
					await restore.mutateAsync();
				}
				router.replace(resolveSafeRoute(detailRoute, ledgerRoute) as any);
			} catch (err) {
				setError(
					extractApiErrorMessage(err, action === "archive" ? "Failed to archive option set." : "Failed to restore option set."),
				);
			}
		});
	}, [action, archive, canRun, detailRoute, isUiDisabled, ledgerRoute, lockNav, optionSet, resolveSafeRoute, restore, router, withBusy]);

	const headerTitle = action === "archive" ? "Archive Option" : "Restore Option";
	const appHeaderOptions = useAppHeader("process", {
		title: headerTitle,
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});
	const inventoryHeaderOptions = useInventoryHeader("process", {
		title: headerTitle,
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});
	const headerOptions = mode === "settings" ? appHeaderOptions : inventoryHeaderOptions;

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const helperText =
		action === "archive"
			? "Archived option sets are removed from new Create Item selections."
			: "Restored option sets are available in Create Item selections again.";

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface style={[styles.card, { borderColor }]} padded bordered>
						<BAIText variant='caption' muted>
							{helperText}
						</BAIText>

						<View style={{ height: 12 }} />

						{query.isLoading ? (
							<BAIText variant='caption' muted>
								Loading option set…
							</BAIText>
						) : query.isError ? (
							<View style={styles.stateBlock}>
								<BAIText variant='caption' muted>
									Could not load option set.
								</BAIText>
								<BAIRetryButton variant='outline' onPress={() => query.refetch()} disabled={isUiDisabled}>
									Retry
								</BAIRetryButton>
							</View>
						) : !optionSet ? (
							<BAIText variant='caption' muted>
								Option set not found.
							</BAIText>
						) : !canRun ? (
							<BAIText variant='caption' muted>
								This option set cannot be {action}d.
							</BAIText>
						) : (
							<BAIText variant='body'>
								This action will {action} “{optionSet.name}”.
							</BAIText>
						)}

						{error ? (
							<>
								<View style={{ height: 10 }} />
								<BAIText variant='caption' style={{ color: theme.colors.error }}>
									{error}
								</BAIText>
							</>
						) : null}

						<View style={{ height: 14 }} />
						<View style={styles.actionsRow}>
							<BAIButton
								shape='pill'
								widthPreset='standard'
								variant='outline'
								intent='neutral'
								onPress={guardedOnExit}
								disabled={isUiDisabled}
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>
							<BAICTAPillButton
								variant='solid'
								intent={action === "archive" ? "danger" : "primary"}
								onPress={onConfirm}
								disabled={!canRun || isUiDisabled}
								style={styles.actionBtn}
							>
								{action === "archive" ? "Archive" : "Restore"}
							</BAICTAPillButton>
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		padding: 12,
	},
	card: {
		borderRadius: 18,
	},
	stateBlock: {
		gap: 10,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 12,
	},
	actionBtn: {
		flex: 1,
	},
});
