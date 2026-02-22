// BizAssist_mobile
// path: app/(app)/(tabs)/settings/units/create.tsx
//
// Create Unit (Category selection) — custom units
// - Exit cancels intent without committing selection
// - Next advances to custom unit details

import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIInlineHeaderMount } from "@/components/ui/BAIInlineHeaderMount";
import { useAppHeader } from "@/modules/navigation/useAppHeader";

import { useAppBusy } from "@/hooks/useAppBusy";
import type { UnitCategory } from "@/modules/units/units.types";
import {
	DRAFT_ID_KEY,
	RETURN_TO_KEY,
	UNIT_CONTEXT_PRODUCT_TYPE_KEY,
	type UnitProductType,
	parseUnitSelectionParams,
	buildOpenUnitCustomCreateParams,
	UNIT_CREATE_CATEGORY_KEY,
	UNIT_SELECTED_ID_KEY,
} from "@/modules/units/unitPicker.contract";
import {
	SETTINGS_UNITS_ROUTE,
	clearUnitSelectionParams,
	resolveReturnTo,
} from "@/modules/units/units.navigation";
import { useUnitFlowBackGuard } from "@/modules/units/useUnitFlowBackGuard";

const CUSTOM_CATEGORY: UnitCategory = "CUSTOM";
const SETTINGS_UNIT_SELECT_ROUTE = "/(app)/(tabs)/settings/units/select" as const;
const SETTINGS_UNIT_CUSTOM_CREATE_ROUTE = "/(app)/(tabs)/settings/units/custom-create" as const;

function normalize(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

function toProductType(raw: unknown): UnitProductType {
	return normalize(raw) === "SERVICE" ? "SERVICE" : "PHYSICAL";
}

export default function UnitsCreateCategoryScreen() {
	const router = useRouter();
	const navigation = useNavigation();
	const params = useLocalSearchParams();
	const { withBusy, busy } = useAppBusy();

	const inbound = useMemo(() => parseUnitSelectionParams(params as any), [params]);

	const resolvedReturnTo = resolveReturnTo(params as Record<string, unknown>);
	const returnTo = resolvedReturnTo === SETTINGS_UNITS_ROUTE ? resolvedReturnTo : SETTINGS_UNITS_ROUTE;
	const draftId = inbound.draftId || normalize((params as any)[DRAFT_ID_KEY]) || "";

	const productType = useMemo(() => toProductType((params as any)[UNIT_CONTEXT_PRODUCT_TYPE_KEY]), [params]);
	const [category] = useState<UnitCategory>(CUSTOM_CATEGORY);

	const exitRef = useRef(false);

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

	const isUiDisabled = busy.isBusy || isNavLocked;

	const onCancel = useCallback(() => {
		if (isUiDisabled) return;
		if (!lockNav()) return;

		exitRef.current = true;
		clearUnitSelectionParams(router as any);

		if (inbound.createUnitCategory) {
			router.replace({
				pathname: SETTINGS_UNIT_SELECT_ROUTE as any,
				params: {
					[RETURN_TO_KEY]: returnTo,
					[DRAFT_ID_KEY]: draftId || undefined,
					[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
					[UNIT_CREATE_CATEGORY_KEY]: inbound.createUnitCategory,
				} as any,
			});
			return;
		}

		if (!inbound.hasSelectionKey) {
			router.replace(returnTo as any);
			return;
		}

		router.replace({
			pathname: SETTINGS_UNITS_ROUTE as any,
			params: {
				[RETURN_TO_KEY]: returnTo,
				[DRAFT_ID_KEY]: draftId || undefined,
				[UNIT_CONTEXT_PRODUCT_TYPE_KEY]: productType,
				...(inbound.selectedUnitId ? { [UNIT_SELECTED_ID_KEY]: inbound.selectedUnitId } : {}),
			} as any,
		});
	}, [
		draftId,
		inbound.createUnitCategory,
		inbound.hasSelectionKey,
		inbound.selectedUnitId,
		isUiDisabled,
		lockNav,
		productType,
		returnTo,
		router,
	]);

	const headerOptions = useAppHeader("process", {
		title: "Create Custom Unit",
		disabled: isUiDisabled,
		onExit: onCancel,
	});

	const onNext = useCallback(async () => {
		if (isUiDisabled || !lockNav()) return;

		await withBusy("Saving unit…", async () => {
			exitRef.current = true;
			router.replace({
				pathname: SETTINGS_UNIT_CUSTOM_CREATE_ROUTE as any,
				params: buildOpenUnitCustomCreateParams({
					returnTo,
					draftId: draftId || undefined,
					productType,
					initialCategory: CUSTOM_CATEGORY,
					selectedUnitId: inbound.selectedUnitId || undefined,
				}),
			});
		});
	}, [draftId, inbound.selectedUnitId, isUiDisabled, lockNav, productType, returnTo, router, withBusy]);

	useUnitFlowBackGuard(navigation, exitRef, onCancel);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShadowVisible: false,
				}}
			/>
			<BAIInlineHeaderMount options={headerOptions} />

			<BAIScreen padded={false} safeTop={false} safeBottom={false} style={{ flex: 1 }}>
				<BAISurface style={styles.card} padded>
					<View style={styles.titleRow}>
						<View style={{ flex: 1 }}>
							<BAIText variant='title'>Create Custom Unit</BAIText>
							<BAIText variant='caption' muted>
								Custom units are created under the Custom category.
							</BAIText>
						</View>
					</View>

					<View style={{ height: 12 }} />

					<View style={styles.actionsRow}>
						<BAIButton
							variant='outline'
							compact
							onPress={onCancel}
							disabled={isUiDisabled}
							style={styles.inlineCancel}
							shape='pill'
							widthPreset='standard'
							intent='neutral'
						>
							Cancel
						</BAIButton>

						<BAICTAPillButton
							intent='primary'
							variant='solid'
							compact
							onPress={onNext}
							disabled={isUiDisabled}
							style={styles.inlineNext}
						>
							Next
						</BAICTAPillButton>
					</View>

					<View style={{ height: 16 }} />

					<BAIText variant='caption' muted>
						Category: {category}
					</BAIText>

					<View style={{ height: 24 }} />
				</BAISurface>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	card: {
		marginHorizontal: 16,
		marginTop: 0,
		borderRadius: 24,
		paddingBottom: 0,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	inlineCancel: { flex: 1 },
	inlineNext: { flex: 1 },
});
