// path: app/(app)/(tabs)/home/index.tsx
import { Redirect, useRouter } from "expo-router";
import { useCallback } from "react";

import { useResponsiveLayout } from "@/lib/layout/useResponsiveLayout";
import { useAuth } from "@/modules/auth/AuthContext";

import type { InventoryHealthFilter } from "@/modules/inventory/inventory.filters";

import HomePhone from "./home.phone";
import HomeTablet from "./home.tablet";

export default function HomeScreen() {
	const router = useRouter();
	const { isAuthenticated } = useAuth();
	const { isTablet } = useResponsiveLayout();

	const onOpenPOS = useCallback(() => {
		router.push("/(app)/(tabs)/pos");
	}, [router]);

	const onOpenInventory = useCallback(
		(filter?: InventoryHealthFilter) => {
			if (filter) {
				router.push({
					pathname: "/(app)/(tabs)/inventory",
					params: { filter },
				});
				return;
			}
			router.push("/(app)/(tabs)/inventory");
		},
		[router]
	);

	if (!isAuthenticated) {
		return <Redirect href='/(auth)/login' />;
	}

	return isTablet ? (
		<HomeTablet onOpenPOS={onOpenPOS} onOpenInventory={onOpenInventory} />
	) : (
		<HomePhone onOpenPOS={onOpenPOS} onOpenInventory={onOpenInventory} />
	);
}
