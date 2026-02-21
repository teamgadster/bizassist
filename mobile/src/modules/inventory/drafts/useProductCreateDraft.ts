// BizAssist_mobile
// path: src/modules/inventory/drafts/useProductCreateDraft.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	clearProductDraft,
	createProductDraft,
	getProductDraft,
	upsertProductDraft,
	type ProductCreateDraft,
} from "./productCreateDraft";

export function useProductCreateDraft(paramDraftId?: string) {
	const [draftId] = useState(() => (paramDraftId ?? "").trim() || createProductDraft().draftId);

	const [draft, setDraft] = useState<ProductCreateDraft>(() => getProductDraft(draftId) ?? createProductDraft(draftId));

	// Rehydrate if store already has a draft (covers remount cases)
	useEffect(() => {
		const current = getProductDraft(draftId);
		if (current) setDraft(current);
	}, [draftId]);

	const patch = useCallback(
		(next: Partial<ProductCreateDraft>) => {
			const updated = upsertProductDraft(draftId, next);
			setDraft(updated);
		},
		[draftId],
	);

	const clear = useCallback(() => {
		clearProductDraft(draftId);
	}, [draftId]);

	const reset = useCallback(() => {
		clearProductDraft(draftId);
		const fresh = createProductDraft(draftId);
		setDraft(fresh);
	}, [draftId]);

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
