// path: src/modules/pos/pos.api.ts
import apiClient from "@/lib/api/httpClient";
import { CheckoutInput, CheckoutResult } from "./pos.types";

export const posApi = {
	async checkout(input: CheckoutInput) {
		const res = await apiClient.post<{ success: true; data: CheckoutResult }>("/pos/checkout", input);
		return res.data.data;
	},
};
