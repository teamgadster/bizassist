import crypto from "crypto";

export function buildWeakEtagFromJson(value: unknown): string {
	const json = JSON.stringify(value);
	const hash = crypto.createHash("sha1").update(json).digest("hex");
	return `W/"${hash}"`;
}

export function isIfNoneMatchHit(ifNoneMatch: string | undefined, etag: string): boolean {
	if (!ifNoneMatch) return false;

	// can be comma-separated list
	const candidates = ifNoneMatch
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	return candidates.includes(etag) || candidates.includes("*");
}
