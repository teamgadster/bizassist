import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useAppHeader } from "@/modules/navigation/useAppHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";
import { useArchiveSalesTax, useSalesTaxById } from "@/modules/taxes/taxes.queries";

function extractErrorMessage(error: unknown): string {
	const data = (error as any)?.response?.data;
	const message = data?.message ?? data?.error?.message ?? (error as any)?.message ?? "Could not archive sales tax.";
	return String(message);
}

export default function SalesTaxArchiveScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ taxId?: string | string[] }>();
	const theme = useTheme();
	const { withBusy, busy } = useAppBusy();
	const [error, setError] = useState<string | null>(null);

	const taxIdParam = params.taxId;
	const taxId = Array.isArray(taxIdParam) ? taxIdParam[0] ?? "" : taxIdParam ?? "";

	const taxQuery = useSalesTaxById(taxId || null);
	const archiveSalesTax = useArchiveSalesTax();
	const isUiDisabled = !!busy?.isBusy || archiveSalesTax.isPending;

	const onExit = useCallback(() => {
		if (isUiDisabled) return;
		if (taxId) {
			router.replace({
				pathname: "/(app)/(tabs)/settings/checkout/sales-taxes/create" as any,
				params: { taxId },
			});
			return;
		}
		router.replace("/(app)/(tabs)/settings/checkout/sales-taxes" as any);
	}, [isUiDisabled, router, taxId]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const onConfirmArchive = useCallback(async () => {
		if (!taxId) return;
		setError(null);
		await withBusy("Archiving sales tax...", async () => {
			try {
				await archiveSalesTax.mutateAsync(taxId);
				router.replace("/(app)/(tabs)/settings/checkout/sales-taxes" as any);
			} catch (e) {
				setError(extractErrorMessage(e));
			}
		});
	}, [archiveSalesTax, router, taxId, withBusy]);

	const canArchive = useMemo(() => !!taxQuery.data && !taxQuery.data.archivedAt, [taxQuery.data]);
	const headerOptions = useAppHeader("process", {
		title: "Archive Tax",
		disabled: isUiDisabled,
		onExit: guardedOnExit,
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false}>
				<View style={styles.screen}>
					<BAISurface bordered padded style={styles.card}>
						<BAIText variant='caption' muted>
							Archived taxes remain in your records and are removed from active checkout calculations.
						</BAIText>

						<View style={{ height: 10 }} />

						{taxQuery.isLoading ? (
							<BAIText variant='caption' muted>
								Loading tax...
							</BAIText>
						) : taxQuery.isError ? (
							<BAIText variant='caption' style={{ color: theme.colors.error }}>
								Could not load this tax.
							</BAIText>
						) : !taxQuery.data ? (
							<BAIText variant='caption' muted>
								Tax not found.
							</BAIText>
						) : !canArchive ? (
							<BAIText variant='caption' muted>
								This tax is already archived.
							</BAIText>
						) : (
							<BAIText variant='body'>This action will archive “{taxQuery.data.name}”.</BAIText>
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
								variant='outline'
								intent='neutral'
								onPress={guardedOnExit}
								disabled={isUiDisabled}
								shape='pill'
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>
							<BAIButton
								variant='solid'
								intent='danger'
								onPress={onConfirmArchive}
								disabled={!canArchive || isUiDisabled}
								shape='pill'
								style={styles.actionBtn}
							>
								Archive
							</BAIButton>
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
		borderRadius: 16,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 12,
	},
	actionBtn: {
		flex: 1,
	},
});
