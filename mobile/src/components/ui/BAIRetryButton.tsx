import React from "react";

import { CTA_WIDTH_PRESET } from "@/lib/ui/buttonGovernance";

import { BAIButton } from "./BAIButton";

type Props = Omit<React.ComponentProps<typeof BAIButton>, "children" | "widthPreset" | "width"> & {
	children?: React.ReactNode;
	label?: string;
	widthPreset?: never;
	width?: never;
};

export function BAIRetryButton({ children, label = "Try Again", ...rest }: Props) {
	return <BAIButton {...rest} widthPreset={CTA_WIDTH_PRESET}>{children ?? label}</BAIButton>;
}
