// BizAssist_mobile
// path: src/modules/categories/categoryColors.ts

export type CategoryColorValue = string | null;

/**
 * Governance:
 * - Category color is DATA (not theme).
 * - Preset palette only (no custom picker).
 * - null = "No Color" (default).
 *
 * Keep the palette small and stable to preserve visual consistency,
 * and avoid semantic system colors where possible.
 */
export const CATEGORY_COLOR_PRESETS: readonly string[] = [
	"#1565C0", // blue
	"#6A1B9A", // purple
	"#C2185B", // magenta
	"#D32F2F", // red
	"#F57C00", // orange
	"#FBC02D", // yellow
	"#AFB42B", // olive
	"#2E7D32", // green
	"#00796B", // teal
	"#0097A7", // cyan
	"#616161", // gray
];

export function isValidHexColor(input: unknown): input is string {
	if (typeof input !== "string") return false;
	return /^#[0-9A-Fa-f]{6}$/.test(input.trim());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	if (!isValidHexColor(hex)) return null;
	const h = hex.replace("#", "");
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	if (![r, g, b].every((n) => Number.isFinite(n))) return null;
	return { r, g, b };
}

/**
 * Simple luminance heuristic so checkmarks stay legible.
 */
export function isDarkColor(hex: string): boolean {
	const rgb = hexToRgb(hex);
	if (!rgb) return false;

	// perceived luminance (0..255)
	const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
	return lum < 140;
}
