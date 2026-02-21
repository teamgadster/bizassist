// BizAssist_mobile path: app/(app)/(tabs)/pos/discounts/enter-value.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAIButton } from "@/components/ui/BAIButton";
import { BAIMoneyInput } from "@/components/ui/BAIMoneyInput";
import { BAITextInput } from "@/components/ui/BAITextInput";

import { useActiveBusinessMeta } from "@/modules/business/useActiveBusinessMeta";
import { setDiscountSelection } from "@/modules/discounts/discounts.selectionStore";
import type { DiscountApplyTarget, DiscountType } from "@/modules/discounts/discounts.types";
import { parseDecimalString, validateValueByType } from "@/modules/discounts/discounts.validators";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeMoneyInput } from "@/shared/validation/sanitize";

export default function PosDiscountEnterValueScreen() {
	const router = useRouter();
	const { currencyCode } = useActiveBusinessMeta();
	const params = useLocalSearchParams<{
		target?: DiscountApplyTarget;
		lineItemId?: string;
		discountId?: string;
		nameSnapshot?: string;
		typeSnapshot?: DiscountType;
		targetSubtotal?: string;
	}>();

	const target: DiscountApplyTarget = (params.target as DiscountApplyTarget) ?? "SALE";
	const lineItemId = params.lineItemId ? String(params.lineItemId) : undefined;

	const discountId = String(params.discountId ?? "");
	const nameSnapshot = String(params.nameSnapshot ?? "");
	const typeSnapshot = (params.typeSnapshot as DiscountType) ?? "FIXED";
	const targetSubtotal = Number(params.targetSubtotal ?? "0") || 0;

	const [raw, setRaw] = useState("");
	const [errorText, setErrorText] = useState("");

	const parsed = useMemo(() => parseDecimalString(raw), [raw]);

	const canApply = useMemo(() => {
		if (!discountId || !nameSnapshot) return false;
		if (!parsed.ok) return false;

		const v = Number(parsed.value);
		if (!Number.isFinite(v) || v <= 0) return false;
		if (typeSnapshot === "PERCENT" && v > 100) return false;
		return true;
	}, [discountId, nameSnapshot, parsed.ok, parsed.value, typeSnapshot]);

	const helper = useMemo(() => {
		if (typeSnapshot === "PERCENT") return "Enter a percentage (1–100).";
		return targetSubtotal > 0 ? `Enter an amount (max ${targetSubtotal}).` : "Enter an amount.";
	}, [targetSubtotal, typeSnapshot]);

	const onApply = useCallback(() => {
		setErrorText("");

		if (!discountId || !nameSnapshot) {
			setErrorText("Missing discount context.");
			return;
		}

		if (!parsed.ok) {
			setErrorText(parsed.message);
			return;
		}

		const v = parsed.value;
		const valueCheck = validateValueByType(typeSnapshot, v);
		if (!valueCheck.ok) {
			setErrorText(valueCheck.message);
			return;
		}
		const num = Number(valueCheck.value);

		setDiscountSelection({
			target,
			lineItemId,
			discountId,
			nameSnapshot,
			typeSnapshot,
			valueSnapshot: num,
			targetSubtotal,
		});

		router.back();
	}, [discountId, lineItemId, nameSnapshot, parsed, router, target, targetSubtotal, typeSnapshot]);

	return (
		<BAIScreen>
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
				<BAISurface style={styles.container} padded>
					<BAIText variant='title'>Enter discount</BAIText>
					<BAIText variant='caption' muted>
						{nameSnapshot}
					</BAIText>

					{!!errorText && (
						<View style={styles.errorBox}>
							<BAIText variant='caption' style={styles.errorText}>
								{errorText}
							</BAIText>
						</View>
					)}

					{typeSnapshot === "PERCENT" ? (
						<BAITextInput
							label='Percentage'
							value={raw}
							onChangeText={(v) => {
								const cleaned = sanitizeMoneyInput(v);
								setRaw(cleaned.length > FIELD_LIMITS.price ? cleaned.slice(0, FIELD_LIMITS.price) : cleaned);
							}}
							keyboardType='decimal-pad'
							maxLength={FIELD_LIMITS.price}
							style={styles.input}
						/>
					) : (
						<BAIMoneyInput
							label='Amount'
							value={raw}
							onChangeText={(value) =>
								setRaw(value.length > FIELD_LIMITS.price ? value.slice(0, FIELD_LIMITS.price) : value)
							}
							currencyCode={currencyCode}
							maxLength={FIELD_LIMITS.price}
							style={styles.input}
						/>
					)}

					<BAIText variant='caption' muted style={styles.helper}>
						{helper}
					</BAIText>

					<View style={styles.actions}>
						<BAIButton mode='outlined' onPress={() => router.back()} shape="pill">
							Cancel
						</BAIButton>
						<Button mode='contained' onPress={onApply} disabled={!canApply}>
							Apply
						</Button>
					</View>
				</BAISurface>
			</KeyboardAvoidingView>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, gap: 10 },
	errorBox: { paddingVertical: 4 },
	errorText: { color: "#B00020" }, // conservative fallback; Paper theme error can be wired later
	input: { marginBottom: 0 },
	helper: { marginTop: 4 },
	actions: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
