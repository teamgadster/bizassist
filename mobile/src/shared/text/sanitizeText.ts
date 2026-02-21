// BizAssist_mobile
// path: src/shared/text/sanitizeText.ts

export type SanitizeTextOptions = {
	allowNewlines?: boolean;
	allowTabs?: boolean;
	normalizeWhitespace?: boolean;
};

export type NormalizeWhitespaceOptions = {
	preserveNewlines?: boolean;
};

const ASCII_CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function stripControlChars(
	input: string,
	opts?: { allowNewlines?: boolean; allowTabs?: boolean }
): string {
	if (!input) return "";

	const allowNewlines = !!opts?.allowNewlines;
	const allowTabs = opts?.allowTabs ?? allowNewlines;

	let value = input.replace(ASCII_CONTROL_RE, "");

	if (allowNewlines) {
		value = value.replace(/\r\n?/g, "\n");
	} else {
		value = value.replace(/[\r\n]+/g, " ");
	}

	if (!allowTabs) {
		value = value.replace(/\t+/g, " ");
	}

	return value;
}

export function normalizeWhitespace(input: string, opts?: NormalizeWhitespaceOptions): string {
	if (!input) return "";

	if (opts?.preserveNewlines) {
		const withCollapsedInlineSpaces = input.replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n");
		return withCollapsedInlineSpaces.replace(/\n{3,}/g, "\n\n").trim();
	}

	return input.replace(/\s+/g, " ").trim();
}

export function sanitizeTextInput(input: string, opts?: SanitizeTextOptions): string {
	if (!input) return "";

	const allowNewlines = !!opts?.allowNewlines;
	const allowTabs = opts?.allowTabs ?? allowNewlines;
	const shouldNormalizeWhitespace = opts?.normalizeWhitespace ?? true;

	const stripped = stripControlChars(input, { allowNewlines, allowTabs });

	if (!shouldNormalizeWhitespace) {
		return stripped.trim();
	}

	return normalizeWhitespace(stripped, { preserveNewlines: allowNewlines });
}
