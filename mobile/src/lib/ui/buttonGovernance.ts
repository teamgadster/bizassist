import type { ViewStyle } from "react-native";

export type BAIButtonShape = "default" | "pill";

export type BAIButtonWidthPreset = "standard" | "cta" | "full";

export const CTA_WIDTH_PRESET: BAIButtonWidthPreset = "cta";

const WIDTH_PRESET_STYLE: Record<BAIButtonWidthPreset, ViewStyle> = {
	standard: { alignSelf: "center" },
	cta: { alignSelf: "stretch" },
	full: { alignSelf: "stretch" },
};

type WidthPresetInput = {
	widthPreset?: BAIButtonWidthPreset | null;
	width?: BAIButtonWidthPreset | null;
	fullWidth?: boolean;
	block?: boolean;
	stretch?: boolean;
};

export function resolveButtonWidthPreset({
	widthPreset,
	width,
	fullWidth,
	block,
	stretch,
}: WidthPresetInput): BAIButtonWidthPreset {
	if (widthPreset) return widthPreset;
	if (width) return width;
	if (fullWidth || block || stretch) return "full";
	return "full";
}

export function resolveButtonWidthStyle(preset: BAIButtonWidthPreset): ViewStyle {
	return WIDTH_PRESET_STYLE[preset];
}

export function isFullWidthPreset(preset: BAIButtonWidthPreset): boolean {
	return preset === "cta" || preset === "full";
}

export function resolveButtonShape({
	shape,
	isFullWidth: _isFullWidth,
}: {
	shape?: BAIButtonShape | null;
	isFullWidth: boolean;
}): BAIButtonShape {
	const requestedShape = shape ?? "default";
	return requestedShape;
}
