// path: src/lib/storage/mediaLimits.ts
// Governance: hard cap for all media uploads (client-side preflight).
// Server enforces the same limit (source of truth), but we fail fast on-device when possible.
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const MEDIA_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMediaMimeType = (typeof MEDIA_ALLOWED_MIME_TYPES)[number];

/**
 * Best-effort preflight:
 * - Always enforce MIME type.
 * - Size may be unknown on some platforms (FileSystem.getInfoAsync may not return size).
 *   If size is unknown, do not fail here—uploadToSignedUrl() will enforce on actual bytes.
 */
export function assertUploadAllowed(args: { bytes?: number; mimeType: string }) {
	// MIME check always enforceable
	if (!MEDIA_ALLOWED_MIME_TYPES.includes(args.mimeType as any)) {
		const e: any = new Error("Unsupported file type. Use JPG, PNG, or WEBP.");
		e.code = "MEDIA_UNSUPPORTED_TYPE";
		throw e;
	}

	const bytes = args.bytes;
	if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
		return; // unknown size; defer to uploadToSignedUrl()
	}

	if (bytes > MEDIA_MAX_BYTES) {
		const e: any = new Error("That photo is too large. Maximum allowed is 10 MB.");
		e.code = "MEDIA_FILE_TOO_LARGE";
		throw e;
	}
}
