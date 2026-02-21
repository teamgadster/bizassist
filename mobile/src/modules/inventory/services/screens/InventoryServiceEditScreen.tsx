// BizAssist_mobile
// path: src/modules/inventory/services/screens/InventoryServiceEditScreen.tsx
//
// Header governance:
// - Edit Service is a PROCESS screen -> use EXIT.
// - Exit cancels and returns deterministically to service detail.

import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

import { ServiceUpsertScreen } from "@/modules/inventory/services/ServiceUpsertScreen";
import { type InventoryRouteScope } from "@/modules/inventory/navigation.scope";

const INVENTORY_DETAIL_BASE = "/(app)/(tabs)/inventory/services" as const;
const SETTINGS_DETAIL_BASE = "/(app)/(tabs)/settings/items-services/services" as const;

export default function InventoryServiceEditScreen({ routeScope = "inventory" }: { routeScope?: InventoryRouteScope }) {
	const { id } = useLocalSearchParams<{ id: string }>();
	const serviceId = useMemo(() => String(id ?? "").trim(), [id]);
	const detailBase = routeScope === "settings-items-services" ? SETTINGS_DETAIL_BASE : INVENTORY_DETAIL_BASE;
	const encodedId = useMemo(() => encodeURIComponent(serviceId), [serviceId]);
	const detailRoute = useMemo(() => `${detailBase}/${encodedId}`, [detailBase, encodedId]);
	const thisRoute = useMemo(() => `${detailRoute}/edit`, [detailRoute]);

	return (
		<ServiceUpsertScreen
			mode='edit'
			headerTitle='Edit Service'
			thisRoute={thisRoute}
			exitRoute={detailRoute}
			serviceId={serviceId}
			routeScope={routeScope}
		/>
	);
}
