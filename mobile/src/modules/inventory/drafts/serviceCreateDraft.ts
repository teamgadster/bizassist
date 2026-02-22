// BizAssist_mobile
// path: src/modules/inventory/drafts/serviceCreateDraft.ts

export const DEFAULT_SERVICE_TOTAL_DURATION_MINUTES = 30;
export const DEFAULT_SERVICE_SEGMENT_DURATION_MINUTES = 10;

export type ServiceCreateDraft = {
	draftId: string;
	name: string;
	categoryId: string;
	categoryName: string;
	modifierGroupIds: string[];
	priceText: string;
	description: string;
	unitId: string;
	durationTotalMinutes: number;
	processingEnabled: boolean;
	durationInitialMinutes: number | null;
	durationProcessingMinutes: number | null;
	durationFinalMinutes: number | null;
};

const drafts = new Map<string, ServiceCreateDraft>();

function makeId() {
	return `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeDefaultDraft(draftId: string): ServiceCreateDraft {
	return {
		draftId,
		name: "",
		categoryId: "",
		categoryName: "",
		modifierGroupIds: [],
		priceText: "",
		description: "",
		unitId: "",
		durationTotalMinutes: DEFAULT_SERVICE_TOTAL_DURATION_MINUTES,
		processingEnabled: false,
		durationInitialMinutes: DEFAULT_SERVICE_SEGMENT_DURATION_MINUTES,
		durationProcessingMinutes: DEFAULT_SERVICE_SEGMENT_DURATION_MINUTES,
		durationFinalMinutes: DEFAULT_SERVICE_SEGMENT_DURATION_MINUTES,
	};
}

export function createServiceDraft(forcedDraftId?: string): ServiceCreateDraft {
	const draftId = (forcedDraftId ?? "").trim() || makeId();
	const draft = makeDefaultDraft(draftId);
	drafts.set(draftId, draft);
	return draft;
}

export function getServiceDraft(draftId: string): ServiceCreateDraft | null {
	const id = (draftId ?? "").trim();
	if (!id) return null;
	return drafts.get(id) ?? null;
}

export function upsertServiceDraft(draftId: string, next: Partial<ServiceCreateDraft>): ServiceCreateDraft {
	const id = (draftId ?? "").trim();
	const base = getServiceDraft(id) ?? createServiceDraft(id);

	const merged: ServiceCreateDraft = {
		...base,
		...next,
		draftId: base.draftId,
	};

	drafts.set(merged.draftId, merged);
	return merged;
}

export function clearServiceDraft(draftId: string) {
	const id = (draftId ?? "").trim();
	if (!id) return;
	drafts.delete(id);
}
