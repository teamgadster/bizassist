// BizAssist_mobile
// path: src/modules/inventory/drafts/useServiceCreateDraft.ts

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	clearServiceDraft,
	createServiceDraft,
	getServiceDraft,
	type ServiceCreateDraft,
	upsertServiceDraft,
} from "./serviceCreateDraft";

type DraftPatch = Partial<ServiceCreateDraft> | ((current: ServiceCreateDraft) => Partial<ServiceCreateDraft>);

export function useServiceCreateDraft(paramDraftId?: string) {
	const [draftId] = useState(() => (paramDraftId ?? "").trim() || createServiceDraft().draftId);

	const [draft, setDraft] = useState<ServiceCreateDraft>(() => getServiceDraft(draftId) ?? createServiceDraft(draftId));

	useEffect(() => {
		const current = getServiceDraft(draftId);
		if (current) setDraft(current);
	}, [draftId]);

	const patch = useCallback(
		(next: DraftPatch) => {
			setDraft((current) => {
				const resolved = typeof next === "function" ? next(current) : next;
				return upsertServiceDraft(draftId, resolved);
			});
		},
		[draftId],
	);

	const clear = useCallback(() => {
		clearServiceDraft(draftId);
	}, [draftId]);

	const reset = useCallback(
		(seed?: Partial<ServiceCreateDraft>) => {
			clearServiceDraft(draftId);
			const fresh = createServiceDraft(draftId);
			const next = seed ? upsertServiceDraft(draftId, seed) : fresh;
			setDraft(next);
		},
		[draftId],
	);

	return useMemo(
		() => ({
			draftId,
			draft,
			patch,
			clear,
			reset,
		}),
		[draftId, draft, patch, clear, reset],
	);
}
