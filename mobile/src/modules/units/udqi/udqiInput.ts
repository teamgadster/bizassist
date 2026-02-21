// BizAssist_mobile
// path: src/modules/units/udqi/udqiInput.ts

const UDQI_INT_MAX_DIGITS = 12;
const UDQI_MAX_CHARS = 18;

export function sanitizeUdiqInput(raw: string, precisionScale: number): string {
	const s = (raw ?? "").replace(/[^\d.]/g, ""); // digits + dot only
	if (!s) return "";

	// Keep only the first dot.
	const firstDot = s.indexOf(".");
	let cleaned = s;
	if (firstDot !== -1) {
		cleaned = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
	}

	const [intPartRaw, fracRaw = ""] = cleaned.split(".");
	const intPart = trimLeadingZeros(intPartRaw).slice(0, UDQI_INT_MAX_DIGITS);

	if (precisionScale <= 0) {
		// integer-only
		return intPart.slice(0, UDQI_MAX_CHARS);
	}

	const fracPart = fracRaw.slice(0, precisionScale);
	const out = fracPart.length > 0 ? `${intPart}.${fracPart}` : `${intPart}.`; // allow typing dot
	return out.slice(0, UDQI_MAX_CHARS);
}

export function normalizeUdiqOnSubmit(value: string, precisionScale: number): string | null {
	const v = (value ?? "").trim();
	if (!v) return null;

	// If user left a trailing dot, drop it.
	const safe = v.endsWith(".") ? v.slice(0, -1) : v;

	// Reject "." or empty after cleanup.
	if (!safe || safe === ".") return null;

	// Sanitize again to enforce caps.
	const sanitized = sanitizeUdiqInput(safe, precisionScale);

	// If sanitized ends with ".", drop it for canonical.
	const canonical = sanitized.endsWith(".") ? sanitized.slice(0, -1) : sanitized;

	// Final guard: must be a valid numeric string.
	if (!isValidDecimalString(canonical, precisionScale)) return null;

	return canonical;
}

function trimLeadingZeros(intPart: string): string {
	// Keep a single "0" if all zeros
	const t = (intPart ?? "").replace(/^0+(?=\d)/, "");
	return t.length ? t : "0";
}

function isValidDecimalString(v: string, precisionScale: number): boolean {
	if (!v) return false;
	if (precisionScale <= 0) return /^\d+$/.test(v);
	// allow "0", "0.5", "12.34"
	const re = new RegExp(`^\\d+(\\.\\d{0,${precisionScale}})?$`);
	return re.test(v);
}
