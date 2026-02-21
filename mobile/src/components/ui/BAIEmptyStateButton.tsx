import React from "react";

import { CTA_WIDTH_PRESET } from "@/lib/ui/buttonGovernance";

import { BAIButton } from "./BAIButton";

type Props = Omit<React.ComponentProps<typeof BAIButton>, "children" | "widthPreset" | "width"> & {
	children?: React.ReactNode;
	label?: string;
	widthPreset?: never;
	width?: never;
};

export function BAIEmptyStateButton({ children, label, ...rest }: Props) {
	const widthPreset = rest.shape === "pill" ? "standard" : CTA_WIDTH_PRESET;
	return <BAIButton {...rest} widthPreset={widthPreset}>{children ?? label}</BAIButton>;
}
