// path: src/modules/meta/meta.api.ts

import apiClient from "@/lib/api/httpClient";
import type { ApiEnvelope, CountryMeta } from "@/modules/meta/meta.types";

export const metaApi = {
	async getCountries(): Promise<ApiEnvelope<CountryMeta[]>> {
		const res = await apiClient.get<ApiEnvelope<CountryMeta[]>>("/meta/countries");
		return res.data;
	},
};
