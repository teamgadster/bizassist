// BizAssist_mobile
// path: src/modules/options/screens/OptionSetDetailScreen.tsx

import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { BAIRetryButton } from "@/components/ui/BAIRetryButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import {
	buildInventoryOptionArchiveRoute,
	buildInventoryOptionEditRoute,
	buildInventoryOptionRestoreRoute,
	buildSettingsOptionArchiveRoute,
	buildSettingsOptionEditRoute,
	buildSettingsOptionRestoreRoute,
	INVENTORY_OPTIONS_LEDGER_ROUTE,
	normalizeReturnTo,
	SETTINGS_OPTIONS_LEDGER_ROUTE,
} from "@/modules/options/options.navigation";
import { useOptionSetById } from "@/modules/options/options.queries";

type OptionSetFlowMode = "settings" | "inventory";

type RouteParams = {
	id?: string;
	returnTo?: string;
};

function normalizeRoutePath(route: string | null | undefined): string {
	return String(route ?? "").split("?")[0].split("#")[0].trim();
}

export function OptionSetDetailScreen({ mode = "settings" }: { mode?: OptionSetFlowMode }) {
	const router = useRouter();
	const pathname = usePathname();
	const theme = useTheme();
	const params = useLocalSearchParams<RouteParams>();
	const { busy } = useAppBusy();

	const optionSetId = String(params.id ?? "").trim();
	const returnTo = useMemo(() => normalizeReturnTo(params.returnTo), [params.returnTo]);
	const currentPath = useMemo(() => normalizeRoutePath(pathname), [pathname]);

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

	const isUiDisabled = !!busy?.isBusy || isNavLocked;
	const query = useOptionSetById(optionSetId);
	const optionSet = query.data ?? null;

	const ledgerRoute = mode === "settings" ? SETTINGS_OPTIONS_LEDGER_ROUTE : INVENTORY_OPTIONS_LEDGER_ROUTE;
	const resolveSafeBackRoute = useCallback(
		(candidate: string | null | undefined): string => {
			const candidatePath = normalizeRoutePath(candidate);
			if (!candidatePath || candidatePath === currentPath) return ledgerRoute;
			return candidate as string;
		},
		[currentPath, ledgerRoute],
	);

	const onBack = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;
		if (router.canGoBack?.()) {
			router.back();
			return;
		}
		router.replace(resolveSafeBackRoute(returnTo ?? ledgerRoute) as any);
	}, [isUiDisabled, ledgerRoute, lockNav, resolveSafeBackRoute, returnTo, router]);

	const onEdit = useCallback(() => {
		if (!optionSet || isUiDisabled) return;
		if (!lockNav()) return;
		const route =
			mode === "settings"
				? buildSettingsOptionEditRoute(optionSet.id, returnTo)
				: buildInventoryOptionEditRoute(optionSet.id, returnTo);
		router.push(route as any);
	}, [isUiDisabled, lockNav, mode, optionSet, returnTo, router]);

	const onArchive = useCallback(() => {
		if (!optionSet || isUiDisabled || !optionSet.isActive) return;
		if (!lockNav()) return;
		const route =
			mode === "settings"
				? buildSettingsOptionArchiveRoute(optionSet.id, returnTo)
				: buildInventoryOptionArchiveRoute(optionSet.id, returnTo);
		router.push(route as any);
	}, [isUiDisabled, lockNav, mode, optionSet, returnTo, router]);

	const onRestore = useCallback(() => {
		if (!optionSet || isUiDisabled || optionSet.isActive) return;
		if (!lockNav()) return;
		const route =
			mode === "settings"
				? buildSettingsOptionRestoreRoute(optionSet.id, returnTo)
				: buildInventoryOptionRestoreRoute(optionSet.id, returnTo);
		router.push(route as any);
	}, [isUiDisabled, lockNav, mode, optionSet, returnTo, router]);

	const appHeaderOptions = useAppHeader("detail", { title: "Option Details", disabled: isUiDisabled, onBack });
	const inventoryHeaderOptions = useInventoryHeader("detail", {
		title: "Option Details",
		disabled: isUiDisabled,
		onBack,
	});
	const headerOptions = mode === "settings" ? appHeaderOptions : inventoryHeaderOptions;

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIInlineHeaderMount options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false} scroll contentContainerStyle={styles.scrollContent}>
				<View style={styles.screen}>
					{query.isLoading ? (
						<BAISurface style={[styles.stateCard, { borderColor }]} padded bordered>
							<View style={styles.stateWrap}>
								<BAIActivityIndicator />
								<BAIText variant='caption' muted>
									Loading option set…
								</BAIText>
							</View>
						</BAISurface>
					) : query.isError ? (
						<BAISurface style={[styles.stateCard, { borderColor }]} padded bordered>
							<View style={styles.stateWrap}>
								<BAIText variant='subtitle'>Could not load option set.</BAIText>
								<BAIRetryButton variant='outline' onPress={() => query.refetch()} disabled={isUiDisabled}>
									Retry
								</BAIRetryButton>
							</View>
						</BAISurface>
					) : !optionSet ? (
						<BAISurface style={[styles.stateCard, { borderColor }]} padded bordered>
							<View style={styles.stateWrap}>
								<BAIText variant='subtitle'>Option set not found.</BAIText>
								<BAIButton variant='outline' shape='pill' widthPreset='standard' onPress={onBack} disabled={isUiDisabled}>
									Back
								</BAIButton>
							</View>
						</BAISurface>
					) : (
						<>
							<BAISurface style={[styles.summaryCard, { borderColor }]} padded bordered>
								<View style={styles.summaryHeader}>
									<View style={styles.summaryTitleRow}>
										<MaterialCommunityIcons
											name={optionSet.isActive ? "shape-outline" : "archive-outline"}
											size={18}
											color={optionSet.isActive ? theme.colors.onSurfaceVariant : theme.colors.error}
										/>
										<BAIText variant='subtitle' numberOfLines={1}>
											{optionSet.name}
										</BAIText>
									</View>
									<View
										style={[
											styles.statusPill,
											{
												borderColor,
												backgroundColor: optionSet.isActive
													? (theme.colors.primaryContainer ?? theme.colors.surface)
													: (theme.colors.errorContainer ?? theme.colors.surface),
											},
										]}
									>
										<BAIText
											variant='caption'
											style={{
												color: optionSet.isActive
													? (theme.colors.onPrimaryContainer ?? theme.colors.onSurface)
													: (theme.colors.onErrorContainer ?? theme.colors.onSurface),
											}}
										>
											{optionSet.isActive ? "Active" : "Archived"}
										</BAIText>
									</View>
								</View>

								<View style={[styles.divider, { backgroundColor: borderColor }]} />

								<BAIText variant='caption' muted>
									Display name
								</BAIText>
								<BAIText variant='body'>{optionSet.displayName}</BAIText>

								<View style={[styles.divider, { backgroundColor: borderColor }]} />

								<BAIText variant='caption' muted>
									Options
								</BAIText>
								{optionSet.values.length === 0 ? (
									<BAIText variant='body' muted>
										No options.
									</BAIText>
								) : (
									optionSet.values.map((value) => (
										<BAIText key={value.id} variant='body'>
											{value.name}
										</BAIText>
									))
								)}
							</BAISurface>

							<BAISurface style={[styles.actionsCard, { borderColor }]} padded bordered>
								<View style={styles.actionsRow}>
									<BAIButton
										variant='outline'
										intent='neutral'
										shape='pill'
										widthPreset='standard'
										onPress={onEdit}
										disabled={isUiDisabled}
									>
										Edit
									</BAIButton>
									{optionSet.isActive ? (
										<BAIButton
											variant='solid'
											intent='danger'
											shape='pill'
											widthPreset='standard'
											onPress={onArchive}
											disabled={isUiDisabled}
										>
											Archive
										</BAIButton>
									) : (
										<BAIButton
											variant='solid'
											intent='primary'
											shape='pill'
											widthPreset='standard'
											onPress={onRestore}
											disabled={isUiDisabled}
										>
											Restore
										</BAIButton>
									)}
								</View>
							</BAISurface>
						</>
					)}
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		paddingBottom: 10,
	},
	screen: {
		flex: 1,
		padding: 12,
		gap: 10,
	},
	stateCard: {
		borderRadius: 18,
	},
	stateWrap: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 24,
		gap: 10,
	},
	summaryCard: {
		borderRadius: 18,
		gap: 8,
	},
	summaryHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	summaryTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		flex: 1,
		minWidth: 0,
	},
	statusPill: {
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		width: "100%",
	},
	actionsCard: {
		borderRadius: 18,
	},
	actionsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 10,
	},
});
