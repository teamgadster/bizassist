// path: app/(app)/(tabs)/inventory/index.tsx
import React from "react";
import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import InventoryTablet from "./inventory.tablet";
import InventoryPhone from "./inventory.phone";



export default function InventoryIndex() {
	const { isTablet } = useResponsiveLayout();
	return isTablet ? <InventoryTablet /> : <InventoryPhone />;
}
