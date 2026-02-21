import { describe, expect, test } from "@jest/globals";

import { sanitizeTextInput, stripControlChars } from "./sanitizeText";

describe("sanitizeText", () => {
	test("stripControlChars removes ASCII control characters", () => {
		const input = `hello\x00world\x1F!\x7F`;
		const output = stripControlChars(input, { allowNewlines: false, allowTabs: false });
		expect(output).toBe("helloworld!");
	});

	test("sanitizeTextInput preserves emoji and non-ASCII characters", () => {
		const input = "Mabuhay 😄 café 日本";
		const output = sanitizeTextInput(input, { allowNewlines: false, normalizeWhitespace: true });
		expect(output).toBe("Mabuhay 😄 café 日本");
	});

	test("sanitizeTextInput preserves newline only when allowNewlines=true", () => {
		const input = "Line 1\nLine 2";
		const multiline = sanitizeTextInput(input, { allowNewlines: true, normalizeWhitespace: true });
		const singleLine = sanitizeTextInput(input, { allowNewlines: false, normalizeWhitespace: true });

		expect(multiline).toBe("Line 1\nLine 2");
		expect(singleLine).toBe("Line 1 Line 2");
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

		expect(stripped).toBe("A B");
		expect(preserved).toBe("A\tB");
	});
});
