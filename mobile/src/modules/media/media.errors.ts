// path: src/modules/media/media.errors.ts

export type MediaDomainError = {
	code: string;
	message: string;
	raw?: any;
};

/**
 * Normalize any thrown value (Error, Axios/Supabase error, string, plain object) into a stable domain error.
 * Goal: UI should always have a deterministic user-facing message.
 */
export function toMediaDomainError(err: any): MediaDomainError {
	const code = getMediaErrorCode(err) || "MEDIA_UPLOAD_FAILED";
	return {
		code,
		message: mapMediaErrorToMessage(code, err),
		raw: err,
	};
}

function getMediaErrorCode(err: any): string | undefined {
	// Domain errors we throw ourselves
	if (typeof err?.code === "string" && err.code.trim()) return err.code;

	// API error shape: { error: { code } } or { errorCode }
	const apiCode =
		err?.response?.data?.error?.code ??
		err?.response?.data?.code ??
		err?.response?.data?.errorCode ??
		err?.data?.error?.code ??
		err?.data?.code;

	if (typeof apiCode === "string" && apiCode.trim()) return apiCode;

	// Fallback: some libs throw { status, message } w/out response
	if (typeof err?.error?.code === "string" && err.error.code.trim()) return err.error.code;

	return undefined;
}

export function mapMediaErrorToMessage(code: string, err: any): string {
	const message = String(err?.message ?? "").toLowerCase();

	// Network/offline detection (Expo fetch / Axios / RN)
	if (
		code === "ERR_NETWORK" ||
		code === "ECONNABORTED" ||
		message.includes("network request failed") ||
		message.includes("network error") ||
		message.includes("failed to fetch") ||
		message.includes("offline") ||
		message.includes("timeout")
	) {
		return "You appear to be offline. Connect to the internet and try again.";
	}

	switch (code) {
		case "MEDIA_LIMIT_REACHED":
			return "Limit Reached: This item has reached the supported photo limit. Remove an existing photo and try again.";
		case "MEDIA_FILE_TOO_LARGE":
			return "That photo is too large. POS tile photos must be 800 KB or less (other photos may allow up to 10 MB).";
		case "MEDIA_UNSUPPORTED_TYPE":
			return "Unsupported file type. Use JPG, PNG, or WEBP.";
		case "MEDIA_INVALID_IMAGE":
			return "That photo doesn’t meet POS tile requirements. Use a square photo at least 1200×1200.";
		case "SUPABASE_DISABLED":
			return "Uploads are temporarily unavailable. Please try again later.";
		case "MEDIA_FILE_INFO_FAILED":
			return "We couldn't read the photo details. Please try a different photo.";
		default:
			return "Upload failed. Please try again.";
	}
}
