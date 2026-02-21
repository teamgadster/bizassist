// BizAssist_mobile
// path: src/modules/categories/components/CategoryForm.tsx
//
// Governance:
// - Form owns ONLY editable fields (name + color).
// - Lifecycle (Archive/Restore) must NOT be editable inside the form.
//   Those actions live in Category Details / Manage Categories with explicit confirmation.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";
import { FIELD_LIMITS } from "@/shared/fieldLimits";
import { sanitizeEntityNameDraftInput, sanitizeEntityNameInput } from "@/shared/validation/sanitize";

import type { CategoryColorValue } from "@/modules/categories/categoryColors";
import { CategoryColorSelector } from "@/modules/categories/components/CategoryColorSelector";

type CreateInitial = { name?: string; color?: CategoryColorValue | null };
type EditInitial = { name?: string; color?: CategoryColorValue | null };

type SubmitValue = { name: string; color: CategoryColorValue };

type BaseProps = {
	submitLabel: string;
	onCancel?: () => void;
	showCancel?: boolean;
	disabled?: boolean;
	error?: string | null;
};

type Props =
	| ({
			mode: "create";
			initial?: CreateInitial;
			onSubmit: (v: SubmitValue) => void | Promise<void>;
	  } & BaseProps)
	| ({
			mode: "edit";
			initial?: EditInitial;
			onSubmit: (v: SubmitValue) => void | Promise<void>;
	  } & BaseProps);

const NAME_INPUT_HEIGHT = 56;

export function CategoryForm(props: Props) {
	const { submitLabel, onCancel, disabled = false, error, showCancel = true } = props;

	/**
	 * Defensive guard:
	 * - Prevents runtime crash if a caller temporarily passes initial={undefined}
	 * - Supports split-pane selection changes (tablet) by providing stable defaults
	 */
	const safeInitial = useMemo(
		() => ({
			name: props.initial?.name ?? "",
			color: (props.initial?.color ?? null) as CategoryColorValue | null,
		}),
		[props.initial?.name, props.initial?.color],
	);

	/**
	 * IMPORTANT:
	 * This component is used in the tablet split-pane view.
	 * Selection changes must update the form, so we sync local state
	 * whenever initial changes (async fetch or selection swap).
	 */
	const [name, setName] = useState<string>(safeInitial.name);
	const [color, setColor] = useState<CategoryColorValue>(safeInitial.color ?? null);

	useEffect(() => {
		setName(safeInitial.name);
		setColor(safeInitial.color ?? null);
	}, [safeInitial.name, safeInitial.color]);

	const trimmedName = useMemo(() => sanitizeEntityNameInput(name).trim(), [name]);
	const normalizedInitialName = useMemo(
		() => sanitizeEntityNameInput(safeInitial.name).trim(),
		[safeInitial.name],
	);
	const normalizedColor = useMemo(
		() => (typeof color === "string" ? color.trim().toUpperCase() : null),
		[color],
	);
	const normalizedInitialColor = useMemo(
		() => (typeof safeInitial.color === "string" ? safeInitial.color.trim().toUpperCase() : null),
		[safeInitial.color],
	);
	const hasChanges = useMemo(() => {
		if (props.mode === "create") return true;
		return trimmedName !== normalizedInitialName || normalizedColor !== normalizedInitialColor;
	}, [normalizedColor, normalizedInitialColor, normalizedInitialName, props.mode, trimmedName]);

	const canSubmit = useMemo(() => {
		if (disabled) return false;
		if (trimmedName.length === 0) return false;
		if (props.mode === "edit" && !hasChanges) return false;
		return true;
	}, [disabled, hasChanges, props.mode, trimmedName.length]);

	const onSubmit = useCallback(() => {
		if (!canSubmit) return;
		// Color is required by SubmitValue; default to null-safe handling.
		// If your business rule requires non-null, enforce it here.
		props.onSubmit({ name: trimmedName, color });
	}, [canSubmit, color, props, trimmedName]);

	const onChangeName = useCallback((text: string) => {
		// Hard single-line enforcement: no newlines/tabs
		const cleaned = text.replace(/\r?\n/g, " ").replace(/\t/g, " ");
		setName(sanitizeEntityNameDraftInput(cleaned));
	}, []);

	return (
		<View style={styles.root}>
			<BAITextInput
				label='Category name'
				value={name}
				onChangeText={onChangeName}
				onBlur={() => setName((prev) => sanitizeEntityNameInput(prev))}
				placeholder='e.g. Beverages'
				maxLength={FIELD_LIMITS.categoryName}
				disabled={disabled}
				inputMode='text'
				returnKeyType='done'
				blurOnSubmit
				multiline={false}
				numberOfLines={1}
				textAlignVertical='center'
				contentStyle={{ paddingVertical: 0 }}
				// “Hide overflow” behavior for a TextInput = do NOT allow it to grow/wrap.
				// True ellipsis is not supported while editing.
				style={{ height: NAME_INPUT_HEIGHT, justifyContent: 'center' }}
			/>

			<CategoryColorSelector value={color} onChange={setColor} disabled={disabled} />

			{error ? (
				<BAIText variant='caption' style={styles.error}>
					{error}
				</BAIText>
			) : null}

			<View style={styles.actions}>
				{showCancel && onCancel ? (
					<BAIButton
						variant='outline'
						mode='outlined'
						onPress={onCancel}
						disabled={disabled}
						style={{ flex: 1 }}
						shape='pill'
						widthPreset='standard'
						intent='neutral'
					>
						Cancel
					</BAIButton>
				) : null}

				{/* Governance: Save = Primary solid */}
				<BAICTAPillButton mode='contained' onPress={onSubmit} disabled={!canSubmit} style={{ flex: 1 }}>
					{submitLabel}
				</BAICTAPillButton>
			</View>
		</View>
	);
}

// Compatibility: support both import styles
export default CategoryForm;

const styles = StyleSheet.create({
	root: {
		gap: 20,
	},
	error: {
		marginTop: 10,
	},
	actions: {
		flexDirection: "row",
		gap: 10,
		marginTop: 2,
	},
});
