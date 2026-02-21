import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeTextInput, stripControlChars } from "./sanitizeText";

test("stripControlChars removes ASCII control characters", () => {
	const input = `hello\x00world\x1F!\x7F`;
	const output = stripControlChars(input, { allowNewlines: false, allowTabs: false });
	assert.equal(output, "helloworld!");
});

test("sanitizeTextInput preserves emoji and non-ASCII characters", () => {
	const input = "Mabuhay 😄 café 日本";
	const output = sanitizeTextInput(input, { allowNewlines: false, normalizeWhitespace: true });
	assert.equal(output, "Mabuhay 😄 café 日本");
});

test("sanitizeTextInput preserves newline only when allowNewlines=true", () => {
	const input = "Line 1\nLine 2";
	const multiline = sanitizeTextInput(input, { allowNewlines: true, normalizeWhitespace: true });
	const singleLine = sanitizeTextInput(input, { allowNewlines: false, normalizeWhitespace: true });

	assert.equal(multiline, "Line 1\nLine 2");
	assert.equal(singleLine, "Line 1 Line 2");
});

test("sanitizeTextInput strips tab by default and preserves when allowTabs=true", () => {
	const input = "A\tB";
	const stripped = sanitizeTextInput(input, {
		allowNewlines: false,
		allowTabs: false,
		normalizeWhitespace: false,
	});
	const preserved = sanitizeTextInput(input, {
		allowNewlines: true,
		allowTabs: true,
		normalizeWhitespace: false,
	});

	assert.equal(stripped, "A B");
	assert.equal(preserved, "A\tB");
});
