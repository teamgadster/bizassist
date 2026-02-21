import React from "react";

import { CTA_WIDTH_PRESET } from "@/lib/ui/buttonGovernance";

import { BAIButton } from "./BAIButton";

type Props = Omit<React.ComponentProps<typeof BAIButton>, "widthPreset" | "width"> & {
	widthPreset?: never;
	width?: never;
};

export function BAICTAButton(props: Props) {
	return <BAIButton {...props} widthPreset={CTA_WIDTH_PRESET} />;
}

export function BAICTAPillButton(props: Props) {
	return <BAIButton {...props} widthPreset='standard' shape="pill" />;
}
