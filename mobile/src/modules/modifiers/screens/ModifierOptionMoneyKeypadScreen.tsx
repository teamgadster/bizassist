import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIHeader } from "@/components/ui/BAIHeader";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { runGovernedBack } from "@/modules/inventory/navigation.governance";
import {
	MONEY_DELTA_MINOR_KEY,
	MONEY_DRAFT_ID_KEY,
	MONEY_OPTION_KEY,
	parseMoneyKeypadParams,
} from "@/modules/modifiers/moneyKeypad.contract";
import { MONEY_MAX_MINOR_DIGITS, formatMoneyFromMinor, moneyOps } from "@/shared/money/money.minor";

const KEY_ROWS: readonly (readonly ("1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "0" | "back")[])[] = [
	["1", "2", "3"],
	["4", "5", "6"],
	["7", "8", "9"],
	["00", "0", "back"],
];

export default function ModifierOptionMoneyKeypadScreen() {
	const router = useRouter();
	const theme = useTheme();
	const params = useLocalSearchParams();
	const { currencyCode } = useActiveBusinessMeta();

	const { returnTo, draftId, optionKey, deltaMinor } = useMemo(() => parseMoneyKeypadParams(params as any), [params]);
	const [valueMinor, setValueMinor] = useState(deltaMinor);

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

	const onCancel = useCallback(() => {
		runGovernedBack(
			{
				router: router as any,
				lockNav,
				disabled: isNavLocked,
			},
			returnTo || undefined,
		);
	}, [isNavLocked, lockNav, returnTo, router]);

	const onDone = useCallback(() => {
		if (!returnTo || !optionKey) return;
		if (!lockNav()) return;
		router.replace({
			pathname: returnTo as any,
			params: {
				[MONEY_DRAFT_ID_KEY]: draftId || undefined,
				[MONEY_OPTION_KEY]: optionKey,
				[MONEY_DELTA_MINOR_KEY]: String(valueMinor),
			} as any,
		});
	}, [draftId, lockNav, optionKey, returnTo, router, valueMinor]);

	const formattedValue = useMemo(
		() => formatMoneyFromMinor({ minorUnits: valueMinor, currencyCode }),
		[currencyCode, valueMinor],
	);

	const onPressDigit = useCallback((digit: number) => {
		setValueMinor((prev) => moneyOps.appendDigit(prev, digit, MONEY_MAX_MINOR_DIGITS));
	}, []);

	const onPressDoubleZero = useCallback(() => {
		setValueMinor((prev) => moneyOps.appendDoubleZero(prev, MONEY_MAX_MINOR_DIGITS));
	}, []);

	const onBackspace = useCallback(() => {
		setValueMinor((prev) => moneyOps.backspace(prev));
	}, []);

	const onClear = useCallback(() => {
		setValueMinor(moneyOps.clear());
	}, []);

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	return (
		<>
			<Stack.Screen options={{ headerShown: false, animation: "slide_from_bottom" }} />
			<BAIScreen safeTop={false} safeBottom={false} style={styles.root}>
				<BAIHeader
					title='Price'
					variant='exit'
					onLeftPress={onCancel}
					onRightPress={onDone}
					rightDisabled={isNavLocked || !returnTo || !optionKey}
					rightSlot={({ disabled }) => (
						<View
							style={[
								styles.donePill,
								{ backgroundColor: disabled ? theme.colors.surfaceDisabled : theme.colors.primary },
							]}
						>
							<BAIText
								variant='body'
								style={{ color: disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimary }}
							>
								Done
							</BAIText>
						</View>
					)}
				/>

				<View style={styles.contentWrap}>
					<BAISurface bordered style={[styles.card, { borderColor }]}>
						<BAIText variant='title' style={styles.valueText}>
							{formattedValue}
						</BAIText>

						<View style={styles.grid}>
							{KEY_ROWS.map((row, rowIdx) => (
								<View key={`row-${rowIdx}`} style={styles.gridRow}>
									{row.map((cell) => (
										<Pressable
											key={cell}
											onPress={() => {
												if (cell === "back") {
													onBackspace();
													return;
												}
												if (cell === "00") {
													onPressDoubleZero();
													return;
												}
												onPressDigit(Number(cell));
											}}
											style={({ pressed }) => [
												styles.key,
												{ borderColor, backgroundColor: theme.colors.surface },
												pressed ? { opacity: 0.82 } : null,
											]}
											disabled={isNavLocked}
										>
											{cell === "back" ? (
												<MaterialCommunityIcons name='backspace-outline' size={22} color={theme.colors.onSurface} />
											) : (
												<BAIText variant='title'>{cell}</BAIText>
											)}
										</Pressable>
									))}
								</View>
							))}
						</View>

						<View style={styles.actions}>
							<BAIButton
								variant='outline'
								intent='neutral'
								shape='pill'
								widthPreset='standard'
								onPress={onClear}
								disabled={isNavLocked || valueMinor === 0}
								style={styles.actionBtn}
							>
								Clear
							</BAIButton>
							<BAIButton
								variant='outline'
								intent='neutral'
								shape='pill'
								widthPreset='standard'
								onPress={onCancel}
								disabled={isNavLocked}
								style={styles.actionBtn}
							>
								Cancel
							</BAIButton>
						</View>
					</BAISurface>
				</View>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	contentWrap: { flex: 1, padding: 16, width: "100%", maxWidth: 720, alignSelf: "center" },
	card: { borderRadius: 20, padding: 16, gap: 14 },
	valueText: { textAlign: "center", minHeight: 38 },
	grid: { gap: 10 },
	gridRow: { flexDirection: "row", gap: 10 },
	key: {
		flex: 1,
		height: 64,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	actions: { flexDirection: "row", gap: 10, marginTop: 4 },
	actionBtn: { flex: 1 },
	donePill: {
		minWidth: 76,
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
});
