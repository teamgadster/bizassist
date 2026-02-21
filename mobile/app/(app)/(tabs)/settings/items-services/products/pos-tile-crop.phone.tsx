import React from "react";

import MediaCropperScreen from "@/modules/media/components/MediaCropperScreen";

export default function SettingsItemsServicesPosTileCropPhoneRoute() {
	return <MediaCropperScreen frameMax={320} frameMin={240} routeScope='settings-items-services' />;
}
