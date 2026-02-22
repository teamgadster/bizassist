// BizAssist_mobile
// path: app/(app)/(tabs)/inventory/_layout.tsx

import React from "react";
import { Stack } from "expo-router";

export default function InventoryStackLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name='index' />
			<Stack.Screen name='scan' />
			<Stack.Screen name='add-item' />
			<Stack.Screen name='products/create' />
			<Stack.Screen name='categories/category.ledger' />
			<Stack.Screen name='categories/create' />
			<Stack.Screen name='categories/[id]/index' />
			<Stack.Screen name='categories/[id]/edit' />
			<Stack.Screen name='categories/[id]/archive' />
			<Stack.Screen name='categories/[id]/restore' />
			<Stack.Screen name='categories/picker' />
			<Stack.Screen name='discounts/discount.ledger' />
			<Stack.Screen name='discounts/create' />
			<Stack.Screen name='discounts/[id]/index' />
			<Stack.Screen name='discounts/[id]/edit' />
			<Stack.Screen name='modifiers/index' />
			<Stack.Screen name='modifiers/create' />
			<Stack.Screen name='modifiers/[id]/index' />
			<Stack.Screen name='modifiers/[id]/edit' />
			<Stack.Screen name='modifiers/[id]/archive' />
			<Stack.Screen name='modifiers/[id]/restore' />
			<Stack.Screen name='units/add' />
			<Stack.Screen name='units/select' />
			<Stack.Screen name='units/custom-create' />
			<Stack.Screen name='units/[id]/archive' />
			<Stack.Screen name='units/[id]/restore' />
			<Stack.Screen name='products/modifiers/select' />
			<Stack.Screen name='products/modifiers/values' />
			<Stack.Screen name='products/[id]/index' />
			<Stack.Screen name='products/[id]/edit' />
			<Stack.Screen name='products/[id]/archive' />
			<Stack.Screen name='products/[id]/activity/index' />
			<Stack.Screen name='products/[id]/adjust' />
			<Stack.Screen name='products/[id]/activity/[movementId]' />
		</Stack>
	);
}
