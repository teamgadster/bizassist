// BizAssist_mobile
// path: src/modules/navigation/useAppHeader.ts
//
// Header SSOT (flat stack header + Back vs Exit governance)
// - Back is history navigation only (router.back()).
// - Exit is intent-cancel (close icon), optionally deterministic via onExit.
// - Screen classes: workspace | detail | picker | process.

import React, { useMemo } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

import type { BAIHeaderProps } from "@/components/ui/BAIHeader";

export type AppScreenClass = "workspace" | "detail" | "picker" | "process";

export type UseAppHeaderOptions = {
	title?: string;
	headerBackTitle?: string;
	backLabel?: string;
	disabled?: boolean;
	onBack?: () => void;
	onExit?: () => void;
};

export type AppHeaderOptions = {
	title?: string;
	headerBackTitle?: string;
	headerBackVisible?: boolean;
	header?: (props?: unknown) => React.ReactNode;
	headerLeft?: (props?: unknown) => React.ReactNode;
	headerStyle?: Record<string, unknown>;
	headerTintColor?: string;
	headerTitleStyle?: Record<string, unknown>;
	headerBackTitleStyle?: Record<string, unknown>;
	headerShown?: boolean;
	headerShadowVisible?: boolean;
	headerTitleAlign?: "center" | "left";
	__baiHeader?: Pick<
		BAIHeaderProps,
		"title" | "variant" | "onLeftPress" | "disabled" | "hideLeftAction" | "rightSlot" | "rightSlotDisabled"
	>;
	[key: string]: unknown;
};

export function useAppHeader(screenClass: AppScreenClass, options?: UseAppHeaderOptions): AppHeaderOptions {
	const router = useRouter();
	const theme = useTheme();

	const title = options?.title;
	const headerBackTitle = options?.headerBackTitle ?? options?.backLabel;
	const disabled = !!options?.disabled;
	const onBack = options?.onBack;
	const onExit = options?.onExit;

	const headerBackTitleStyle = useMemo(
		() => ({
			fontSize: 14,
			fontWeight: "500" as const,
			color: theme.colors.onSurfaceVariant ?? theme.colors.onBackground,
		}),
		[theme.colors.onSurfaceVariant, theme.colors.onBackground],
	);

	const sharedBase = useMemo<AppHeaderOptions>(
		() => ({
			headerTitleAlign: "center",
			headerShadowVisible: false,
			headerStyle: {
				backgroundColor: theme.colors.background,
				...(Platform.OS === "android" ? { elevation: 0, borderBottomWidth: 0 } : {}),
			},
			headerTintColor: theme.colors.onBackground,
			headerTitleStyle: {
				color: theme.colors.onBackground,
				fontSize: 18,
				fontWeight: "600",
			},
			headerBackTitleStyle,
		}),
		[headerBackTitleStyle, theme.colors.background, theme.colors.onBackground],
	);

	return useMemo<AppHeaderOptions>(() => {
		const base: AppHeaderOptions = { ...sharedBase };
		if (title) base.title = title;
		if (headerBackTitle) base.headerBackTitle = headerBackTitle;

		const onLeftPress = () => {
			if (disabled) return;
			if (screenClass === "process") {
				if (onExit) return onExit();
				router.back();
				return;
			}
			if (onBack) return onBack();
			router.back();
		};

		const variant = screenClass === "process" ? "exit" : "back";
		const hideLeftAction = screenClass === "workspace";
		const headerTitle = title ?? "";

		return {
			...base,
			headerShown: false,
			__baiHeader: {
				title: headerTitle,
				variant,
				onLeftPress,
				disabled,
				hideLeftAction,
			},
		};
	}, [disabled, headerBackTitle, onBack, onExit, router, screenClass, sharedBase, title]);
}
