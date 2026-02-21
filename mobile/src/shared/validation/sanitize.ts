// BizAssist_mobile
// path: src/shared/validation/sanitize.ts

import { sanitizeTextInput, stripControlChars } from "@/shared/text/sanitizeText";

export function sanitizeSkuInput(raw: string): string {
	if (!raw) return "";
	const base = sanitizeTextInput(raw, { normalizeWhitespace: false });
	return base.replace(/[^A-Za-z0-9._-]/g, "");
}

export function sanitizeBarcodeInput(raw: string): string {
	if (!raw) return "";
	const base = sanitizeTextInput(raw, { normalizeWhitespace: false });
	return base.replace(/[^0-9A-Za-z._:-]/g, "");
}

export function sanitizeEmailInput(raw: string): string {
	if (!raw) return "";
	const base = sanitizeTextInput(raw, { normalizeWhitespace: false });
	return base.replace(/\s+/g, "").toLowerCase();
}

export function sanitizeNameInput(raw: string): string {
	if (!raw) return "";
	const base = sanitizeTextInput(raw, { normalizeWhitespace: true });
	const cleaned = base.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "");
	return cleaned.replace(/\s{2,}/g, " ");
}

export function sanitizeLabelInput(raw: string): string {
	if (!raw) return "";
	const base = sanitizeTextInput(raw, { normalizeWhitespace: true });
	const cleaned = base.replace(/[^A-Za-z0-9À-ÖØ-öø-ÿ'&().,\/\- ]/g, "");
	return cleaned.replace(/\s{2,}/g, " ");
}

export function sanitizeLabelDraftInput(raw: string): string {
	if (!raw) return "";
	const withoutControlChars = stripControlChars(raw, {
		allowNewlines: false,
		allowTabs: false,
	});
	const cleaned = withoutControlChars.replace(/[^A-Za-z0-9À-ÖØ-öø-ÿ'&().,\/\- ]/g, "");
	return cleaned.replace(/\s{2,}/g, " ");
}

/**
 * Product/Service name draft sanitizer (masterplan):
 * - broad character support (no strict regex rejection)
 * - strip control chars
 * - single-line field (no newlines/tabs)
 * - preserve user spaces while typing
 */
export function sanitizeProductNameDraftInput(raw: string): string {
	if (!raw) return "";
	const withoutControlChars = stripControlChars(raw, {
		allowNewlines: false,
		allowTabs: false,
	});
	return withoutControlChars;
}

/**
 * Product/Service name final sanitizer (masterplan):
 * - broad character support (no strict regex rejection)
 * - normalize whitespace and trim on blur/save
 */
export function sanitizeProductNameInput(raw: string): string {
	if (!raw) return "";
	return sanitizeTextInput(raw, {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: true,
	});
}

// Generic alias for non-format-specific entity names (category/discount/unit/etc.)
export const sanitizeEntityNameDraftInput = sanitizeProductNameDraftInput;
export const sanitizeEntityNameInput = sanitizeProductNameInput;

export function sanitizeUnitAbbreviationInput(raw: string): string {
	if (!raw) return "";
	const base = sanitizeTextInput(raw, { normalizeWhitespace: true });
	const cleaned = base.replace(/[^A-Za-z0-9 .\/\-]/g, "");
	return cleaned.replace(/\s{2,}/g, " ");
}

export function sanitizeSearchInput(raw: string): string {
	return sanitizeLabelInput(raw);
}

export function sanitizeNoteInput(raw: string): string {
	if (!raw) return "";
	return sanitizeTextInput(raw, {
		allowNewlines: true,
		allowTabs: false,
		normalizeWhitespace: true,
	});
}

export function sanitizeNoteDraftInput(raw: string): string {
	if (!raw) return "";
	// Draft/live typing:
	// - Preserve ALL user-entered whitespace (including trailing spaces) and line breaks.
	// - Only remove control characters and disallow tabs.
	//
	// IMPORTANT: We intentionally do NOT call sanitizeTextInput here because some
	// sanitizers may trim/collapse whitespace as a side effect (which breaks typing spaces).
	const withoutControlChars = stripControlChars(raw, {
		allowNewlines: true,
		allowTabs: false,
	});

	// Normalize Windows newlines to \n while preserving line breaks and spaces.
	return withoutControlChars.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Description draft sanitizer:
 * - preserves spaces and newlines exactly while typing
 * - strips control chars
 * - disallows tabs
 */
export function sanitizeDescriptionDraftInput(raw: string): string {
	if (!raw) return "";
	const withoutControlChars = stripControlChars(raw, {
		allowNewlines: true,
		allowTabs: false,
	});
	// Normalize Windows newlines to \n while preserving line breaks.
	return withoutControlChars.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Description final sanitizer:
 * - preserves user line breaks
 * - normalizes per-line whitespace (no trailing spaces, collapse repeated spaces)
 * - prevents excessive blank-line spam (3+ -> 2)
 */
export function sanitizeDescriptionInput(raw: string): string {
	if (!raw) return "";
	const draft = sanitizeDescriptionDraftInput(raw);

	const lines = draft.split("\n").map((line) => line.replace(/\s+$/g, "").replace(/ {2,}/g, " "));

	const joined = lines.join("\n");
	return joined.replace(/\n{3,}/g, "\n\n");
}

export function sanitizeMoneyInput(raw: string, maxDecimals = 2): string {
	if (!raw) return "";

	const withoutControlChars = stripControlChars(raw, {
		allowNewlines: false,
		allowTabs: false,
	});

	let cleaned = withoutControlChars.replace(/[^0-9.,]/g, "").replace(/,/g, "");

	const parts = cleaned.split(".");
	if (parts.length > 2) {
		cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
	}

	if (cleaned.includes(".")) {
		const [int, dec = ""] = cleaned.split(".");
		cleaned = `${int}.${dec.slice(0, Math.max(0, maxDecimals))}`;
	}

	return cleaned;
}
