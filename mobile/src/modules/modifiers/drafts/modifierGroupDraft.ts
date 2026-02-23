import type { ModifierSelectionType } from "@/modules/modifiers/modifiers.types";

export type ModifierOptionDraft = {
	key: string;
	id?: string;
	name: string;
	priceText: string;
	isSoldOut: boolean;
	removed?: boolean;
};

export type ModifierGroupDraft = {
	draftId: string;
	mode: "settings" | "inventory";
	intent: "create" | "edit";
	groupId: string;
	name: string;
	selectionType: ModifierSelectionType;
	isRequired: boolean;
	minSelected: string;
	maxSelected: string;
	options: ModifierOptionDraft[];
	appliedProductIds: string[];
	hydratedFromServer: boolean;
};

const drafts = new Map<string, ModifierGroupDraft>();
type ModifierGroupDraftListener = (draft: ModifierGroupDraft | null) => void;
const draftListeners = new Map<string, Set<ModifierGroupDraftListener>>();

function notifyDraftListeners(draftId: string) {
	const listeners = draftListeners.get(draftId);
	if (!listeners || listeners.size === 0) return;
	const current = drafts.get(draftId) ?? null;
	for (const listener of listeners) {
		listener(current);
	}
}

function makeOptionKey() {
	return `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultDraft(
	draftId: string,
	mode: "settings" | "inventory",
	intent: "create" | "edit",
	groupId: string,
): ModifierGroupDraft {
	return {
		draftId,
		mode,
		intent,
		groupId,
		name: "",
		selectionType: "MULTI",
		isRequired: false,
		minSelected: "0",
		maxSelected: "1",
		options: [{ key: makeOptionKey(), name: "", priceText: "0.00", isSoldOut: false }],
		appliedProductIds: [],
		hydratedFromServer: intent === "create",
	};
}

export function buildModifierGroupDraftId(mode: "settings" | "inventory", intent: "create" | "edit", groupId: string) {
	return `modifier_group:${mode}:${intent}:${groupId || "new"}`;
}

export function createModifierGroupDraft(
	draftId: string,
	mode: "settings" | "inventory",
	intent: "create" | "edit",
	groupId: string,
): ModifierGroupDraft {
	const id = draftId.trim();
	const draft = makeDefaultDraft(id, mode, intent, groupId);
	drafts.set(id, draft);
	notifyDraftListeners(id);
	return draft;
}

export function getModifierGroupDraft(draftId: string): ModifierGroupDraft | null {
	const id = draftId.trim();
	if (!id) return null;
	return drafts.get(id) ?? null;
}

export function upsertModifierGroupDraft(draftId: string, next: Partial<ModifierGroupDraft>): ModifierGroupDraft {
	const id = draftId.trim();
	const base = drafts.get(id);
	if (!base) {
		throw new Error("Modifier group draft does not exist.");
	}

	const merged: ModifierGroupDraft = {
		...base,
		...next,
		draftId: base.draftId,
	};

	drafts.set(merged.draftId, merged);
	notifyDraftListeners(merged.draftId);
	return merged;
}

export function subscribeModifierGroupDraft(draftId: string, listener: ModifierGroupDraftListener) {
	const id = draftId.trim();
	if (!id) return () => {};

	const listeners = draftListeners.get(id) ?? new Set<ModifierGroupDraftListener>();
	listeners.add(listener);
	draftListeners.set(id, listeners);

	return () => {
		const current = draftListeners.get(id);
		if (!current) return;
		current.delete(listener);
		if (current.size === 0) {
			draftListeners.delete(id);
		}
	};
}

export function clearModifierGroupDraft(draftId: string) {
	const id = draftId.trim();
	if (!id) return;
	drafts.delete(id);
	notifyDraftListeners(id);
}
