// path: src/modules/onboarding/businessSettingsDraft.storage.ts

import { mmkv, MMKVKeys } from "@/lib/storage/mmkv";
import type { BusinessSettingsDraft } from "./businessSettingsDraft.types";

export function getBusinessSettingsDraft(): BusinessSettingsDraft | null {
	const raw = mmkv.getString(MMKVKeys.businessSettingsDraft);
	if (!raw) return null;

	try {
		return JSON.parse(raw) as BusinessSettingsDraft;
	} catch {
		return null;
	}
}

export function setBusinessSettingsDraft(draft: BusinessSettingsDraft): void {
	mmkv.set(MMKVKeys.businessSettingsDraft, JSON.stringify(draft));
}

export function clearBusinessSettingsDraft(): void {
	mmkv.remove(MMKVKeys.businessSettingsDraft);
}
