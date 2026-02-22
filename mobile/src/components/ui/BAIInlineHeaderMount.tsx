import React from "react";

import { BAIHeader, type BAIHeaderProps } from "@/components/ui/BAIHeader";

type BAIInlineHeaderMeta = Pick<
	BAIHeaderProps,
	"title" | "variant" | "onLeftPress" | "disabled" | "hideLeftAction" | "rightSlot" | "rightSlotDisabled"
>;

type BAIInlineHeaderMountOptions = {
	__baiHeader?: BAIInlineHeaderMeta;
	[key: string]: unknown;
};

type BAIInlineHeaderMountProps = {
	options?: BAIInlineHeaderMountOptions;
};

export function BAIInlineHeaderMount({ options }: BAIInlineHeaderMountProps) {
	const meta = options?.__baiHeader;
	if (!meta) return null;

	return (
		<BAIHeader
			title={meta.title}
			variant={meta.variant}
			onLeftPress={meta.onLeftPress}
			disabled={meta.disabled}
			hideLeftAction={meta.hideLeftAction}
			rightSlot={meta.rightSlot}
			rightSlotDisabled={meta.rightSlotDisabled}
		/>
	);
}
