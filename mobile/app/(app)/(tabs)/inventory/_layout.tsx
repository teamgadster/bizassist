// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/_layout.tsx

import React, { useMemo } from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "react-native-paper";

export default function InventoryStackLayout() {
	const theme = useTheme();

	const headerStyle = useMemo(
		() => ({
			backgroundColor: theme.colors.background,
			...(Platform.OS === "android" ? { elevation: 0, borderBottomWidth: 0 } : {}),
		}),
		[theme.colors.background]
	);

	const headerTintColor = useMemo(() => theme.colors.onBackground, [theme.colors.onBackground]);

	const headerTitleStyle = useMemo(
		() => ({
			color: theme.colors.onBackground,
			fontSize: 18,
			fontWeight: "600" as const,
		}),
		[theme.colors.onBackground]
	);

	// Smaller + muted back button title
	const headerBackTitleStyle = useMemo(
		() => ({
			fontSize: 14,
			fontWeight: "500" as const,
			color: theme.colors.onSurfaceVariant ?? theme.colors.onBackground,
		}),
		[theme.colors.onSurfaceVariant, theme.colors.onBackground]
	);

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerTitleAlign: "center",

				// Default: hide back title everywhere
				headerBackTitle: "",

				headerStyle,
				headerTintColor,
				headerTitleStyle,
				headerBackTitleStyle,
				headerShadowVisible: false,
			}}
		>
			<Stack.Screen name='index' options={{ headerShown: false }} />
			<Stack.Screen name='scan' options={{ title: "Scan" }} />

			{/* Add Item */}
			<Stack.Screen
				name='add-item'
				options={{
					title: "Add Items",
					headerBackTitle: "Inventory",
				}}
			/>

			<Stack.Screen name='products/create' options={{ title: "Add Items" }} />
			<Stack.Screen name='categories/category.ledger' options={{ title: "Categories" }} />
			<Stack.Screen name='categories/create' options={{ title: "Create Category" }} />
			<Stack.Screen name='categories/[id]/index' options={{ title: "Category Details" }} />
			<Stack.Screen name='categories/[id]/edit' options={{ title: "Edit Category" }} />
			<Stack.Screen name='categories/[id]/archive' options={{ title: "Archive Category" }} />
			<Stack.Screen name='categories/[id]/restore' options={{ title: "Restore Category" }} />
			<Stack.Screen name='categories/picker' options={{ title: "Select Categories" }} />
			<Stack.Screen name='discounts/discount.ledger' options={{ title: "Discounts" }} />
			<Stack.Screen name='discounts/create' options={{ title: "Create Discount" }} />
			<Stack.Screen name='discounts/[id]/index' options={{ title: "Discount" }} />
			<Stack.Screen name='discounts/[id]/edit' options={{ title: "Edit Discount" }} />
			<Stack.Screen name='options/index' options={{ title: "Options" }} />
			<Stack.Screen name='options/create' options={{ title: "Create Option" }} />
			<Stack.Screen name='options/[id]/index' options={{ title: "Option Details" }} />
			<Stack.Screen name='options/[id]/edit' options={{ title: "Edit Option" }} />
			<Stack.Screen name='options/[id]/archive' options={{ title: "Archive Option" }} />
			<Stack.Screen name='options/[id]/restore' options={{ title: "Restore Option" }} />
			<Stack.Screen name='units/add' options={{ title: "Unit Category", headerBackTitle: "Unit Type" }} />
			<Stack.Screen name='units/select' options={{ title: "Add Unit", headerBackTitle: "Add Unit" }} />
			<Stack.Screen name='units/custom-create' options={{ title: "Create Custom Unit", headerBackTitle: "Custom Unit" }} />
			<Stack.Screen name='units/[id]/archive' options={{ title: "Archive Unit" }} />
			<Stack.Screen name='units/[id]/restore' options={{ title: "Restore Unit" }} />
			<Stack.Screen name='products/options/select' options={{ title: "Select Options" }} />
			<Stack.Screen name='products/options/values' options={{ title: "Option Values" }} />
			<Stack.Screen name='products/options/create-variations' options={{ title: "Create Variations" }} />
			<Stack.Screen name='products/options/add-variation' options={{ title: "Adjust Stock" }} />
			<Stack.Screen name='products/options/stock-received' options={{ title: "Stock received" }} />

			{/* ✅ Item Details Overview — explicit back title */}
			<Stack.Screen
				name='products/[id]/index'
				options={{
					title: "Item Details Overview",
					headerBackTitle: "Inventory",
				}}
			/>
			<Stack.Screen name='products/[id]/edit' options={{ title: "Edit Item" }} />
			<Stack.Screen name='products/[id]/archive' options={{ title: "Archive Item" }} />

			<Stack.Screen
				name='products/[id]/activity/index'
				options={{ title: "Item Activity", headerBackTitle: "Item Details" }}
			/>
			<Stack.Screen name='products/[id]/adjust' options={{ title: "Adjust Stocks" }} />
			<Stack.Screen name='products/[id]/activity/[movementId]' options={{ title: "Activity Details" }} />
		</Stack>
	);
}
