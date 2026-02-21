// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/products/pos-tile-crop.phone.tsx
//
// POS Tile crop (pre-create): shared cropper screen wrapper.

import React from "react";

import MediaCropperScreen from "@/modules/media/components/MediaCropperScreen";

export default function PosTileCropPhone() {
	return <MediaCropperScreen frameMax={320} frameMin={240} />;
}
