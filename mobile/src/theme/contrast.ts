// path: src/theme/contrast.ts
/**
 * WCAG-aligned contrast utilities.
 * Enforces readable foreground colors against any background.
 */

const DARK_TEXT = "#1A1A1A";
const LIGHT_TEXT = "#FFFFFF";

// Relative luminance per WCAG
function luminance(hex: string): number {
	const c = hex.replace("#", "");
	if (c.length !== 6) return 1;

	const rgb = [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)].map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});

	return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// Contrast ratio between two colors
function contrastRatio(bg: string, fg: string): number {
	const l1 = luminance(bg);
	const l2 = luminance(fg);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns a text color that meets a minimum contrast ratio against the background.
 *
 * Backwards-compatible signatures:
 * - getAccessibleTextColor(bg)
 * - getAccessibleTextColor(bg, minRatio)
 * - getAccessibleTextColor(bg, preferredText)
 * - getAccessibleTextColor(bg, preferredText, minRatio)
 */
export function getAccessibleTextColor(
	backgroundHex: string,
	preferredTextOrMinRatio?: string | number,
	minRatioMaybe?: number
): string {
	const preferredText = typeof preferredTextOrMinRatio === "string" ? preferredTextOrMinRatio : undefined;
	const minRatio = typeof preferredTextOrMinRatio === "number" ? preferredTextOrMinRatio : minRatioMaybe ?? 4.5;

	// If caller provides a preferred semantic color, keep it when it passes contrast.
	if (preferredText) {
		const preferredContrast = contrastRatio(backgroundHex, preferredText);
		if (preferredContrast >= minRatio) return preferredText;
	}

	const darkContrast = contrastRatio(backgroundHex, DARK_TEXT);
	const lightContrast = contrastRatio(backgroundHex, LIGHT_TEXT);

	if (lightContrast >= minRatio && lightContrast >= darkContrast) {
		return LIGHT_TEXT;
	}

	if (darkContrast >= minRatio) {
		return DARK_TEXT;
	}

	// Fallback: whichever is better
	return lightContrast > darkContrast ? LIGHT_TEXT : DARK_TEXT;
}
