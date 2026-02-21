import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

import { resolveProcessExitRoute } from "@/modules/inventory/navigation.governance";
import { ServiceUpsertScreen } from "@/modules/inventory/services/ServiceUpsertScreen";
import { RETURN_TO_KEY } from "@/modules/units/unitPicker.contract";

const THIS_ROUTE = "/(app)/(tabs)/settings/items-services/services/create" as const;
const SETTINGS_SERVICES_ROUTE = "/(app)/(tabs)/settings/items-services?type=SERVICES" as const;

export default function SettingsItemsServicesCreateServiceRoute() {
	const params = useLocalSearchParams();
	const exitRoute = useMemo(
		() => resolveProcessExitRoute((params as any)?.[RETURN_TO_KEY], SETTINGS_SERVICES_ROUTE),
		[params],
	);

	return (
		<ServiceUpsertScreen
			mode='create'
			headerTitle='Create Service'
			thisRoute={THIS_ROUTE}
			exitRoute={exitRoute}
			routeScope='settings-items-services'
		/>
	);
}
