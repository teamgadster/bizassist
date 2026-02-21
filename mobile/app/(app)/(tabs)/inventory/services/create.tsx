// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/services/create.tsx

import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

import { ServiceUpsertScreen } from "@/modules/inventory/services/ServiceUpsertScreen";
import { resolveProcessExitRoute } from "@/modules/inventory/navigation.governance";
import { RETURN_TO_KEY } from "@/modules/units/unitPicker.contract";

const THIS_ROUTE = "/(app)/(tabs)/inventory/services/create" as const;
const INVENTORY_SERVICES_ROUTE = "/(app)/(tabs)/inventory?type=SERVICES" as const;

export default function CreateServiceScreen() {
	const params = useLocalSearchParams();
	const exitRoute = useMemo(
		() => resolveProcessExitRoute((params as any)?.[RETURN_TO_KEY], INVENTORY_SERVICES_ROUTE),
		[params],
	);

	return (
		<ServiceUpsertScreen
			mode='create'
			headerTitle='Create Service'
			thisRoute={THIS_ROUTE}
			exitRoute={exitRoute}
		/>
	);
}
