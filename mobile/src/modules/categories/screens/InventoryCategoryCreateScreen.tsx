// BizAssist_mobile
// path: src/modules/categories/screens/InventoryCategoryCreateScreen.tsx
//
// Header governance:
// - This is a PROCESS screen (intent to create category).
// - Exit cancels intent.
// - If opened from picker flow, cancel returns to picker deterministically.

import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { useAppBusy } from "@/hooks/useAppBusy";
import { categoriesApi } from "@/modules/categories/categories.api";
import { syncCategoryCaches } from "@/modules/categories/categories.cache";
import {
	buildCategorySelectionParams,
	CATEGORY_PICKER_ROUTE,
	DRAFT_ID_KEY,
	INITIAL_NAME_KEY,
	normalizeReturnTo,
	RETURN_TO_KEY,
	type CategoryCreateInboundParams,
} from "@/modules/categories/categoryPicker.contract";
import { categoryKeys } from "@/modules/categories/categories.queryKeys";
import { extractCategoryApiError, toSafeCategoryParamString } from "@/modules/categories/categories.validators";
import { CategoryForm } from "@/modules/categories/components/CategoryForm";
import { useInventoryHeader } from "@/modules/inventory/useInventoryHeader";
import { useProcessExitGuard } from "@/modules/navigation/useProcessExitGuard";

const INVENTORY_CATEGORIES_ROUTE = "/(app)/(tabs)/inventory/categories/category.ledger" as const;
const CATEGORY_LIMIT_FALLBACK = 200;

export default function InventoryCategoryCreateScreen() {
	const router = useRouter();
	const theme = useTheme();
	const qc = useQueryClient();
	const { withBusy } = useAppBusy();
	const params = useLocalSearchParams<CategoryCreateInboundParams>();

	const returnTo = normalizeReturnTo(params[RETURN_TO_KEY]);
	const initialName = toSafeCategoryParamString(params[INITIAL_NAME_KEY]).trim();
	const draftId = toSafeCategoryParamString(params[DRAFT_ID_KEY]).trim();

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	const isHeaderDisabled = isSubmitting || isNavLocked;
	const onExit = useCallback(() => {
		if (isHeaderDisabled) return;
		if (!lockNav()) return;

		if (returnTo) {
			router.replace({
				pathname: CATEGORY_PICKER_ROUTE as any,
				params: {
					[RETURN_TO_KEY]: returnTo,
					[DRAFT_ID_KEY]: draftId || undefined,
				} as any,
			});
			return;
		}

		router.replace(INVENTORY_CATEGORIES_ROUTE as any);
	}, [draftId, isHeaderDisabled, lockNav, returnTo, router]);
	const guardedOnExit = useProcessExitGuard(onExit);

	const submit = useCallback(
		async (v: { name: string; color: string | null }) => {
			if (isSubmitting || isNavLocked) return;
			if (!lockNav()) return;

			setError(null);
			setIsSubmitting(true);

			await withBusy("Creating category...", async () => {
				try {
					const created = await categoriesApi.create({ name: v.name, color: v.color });
					syncCategoryCaches(qc, created);
					void qc.invalidateQueries({ queryKey: categoryKeys.root() });

					if (returnTo) {
						router.replace({
							pathname: CATEGORY_PICKER_ROUTE as any,
							params: {
								[RETURN_TO_KEY]: returnTo,
								...buildCategorySelectionParams({
									selectedCategoryId: created.id,
									selectedCategoryName: created.name,
									selectionSource: "created",
									draftId: draftId || undefined,
								}),
							} as any,
						});
						return;
					}

					router.replace(INVENTORY_CATEGORIES_ROUTE as any);
				} catch (e: any) {
					const { code, message, limit } = extractCategoryApiError(e);
					if (code === "CATEGORY_LIMIT_REACHED") {
						const cap = limit ?? CATEGORY_LIMIT_FALLBACK;
						setError(`You've reached the maximum of ${cap} categories.`);
						return;
					}
					setError(message ?? "Could not create category. Please try again.");
				} finally {
					setIsSubmitting(false);
				}
			});
		},
		[draftId, isNavLocked, isSubmitting, lockNav, qc, returnTo, router, withBusy],
	);

	const dividerColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const headerOptions = useInventoryHeader("process", {
		title: "Create Category",
		disabled: isHeaderDisabled,
		onExit: guardedOnExit,
		exitFallbackRoute: "/(app)/(tabs)/inventory",
	});

	return (
		<>
			<Stack.Screen options={headerOptions} />
			<BAIScreen tabbed padded={false} safeTop={false} style={styles.root}>
				<KeyboardAvoidingView
					style={styles.keyboardAvoider}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={0}
				>
					<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
						<View style={styles.keyboardContent}>
							<View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
								<BAISurface style={[styles.card, { borderColor: dividerColor }]} padded bordered>
									<BAIText variant='caption' muted>
										Add a category to organize items and services.
									</BAIText>

									<View style={{ height: 10 }} />

									<CategoryForm
										mode='create'
										initial={{ name: initialName || "", color: null }}
										onSubmit={submit}
										submitLabel='Create'
										onCancel={guardedOnExit}
										disabled={isSubmitting || isNavLocked}
										error={error}
									/>
								</BAISurface>
							</View>
						</View>
					</TouchableWithoutFeedback>
				</KeyboardAvoidingView>
			</BAIScreen>
		</>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	keyboardAvoider: { flex: 1 },
	keyboardContent: { flex: 1 },
	screen: { flex: 1, padding: 12 },
	card: { borderRadius: 24 },
});
