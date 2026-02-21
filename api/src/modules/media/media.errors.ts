// path: src/modules/media/media.errors.ts (API)
import { StatusCodes } from "http-status-codes";

type CodedError = Error & { status?: number; code?: string };

function coded(status: number, code: string, message: string): CodedError {
	const err: CodedError = new Error(message);
	err.status = status;
	err.code = code;
	return err;
}

export const MediaErrors = {
	noActiveBusiness: () => coded(StatusCodes.BAD_REQUEST, "NO_ACTIVE_BUSINESS", "No active business selected."),
	productNotFound: () => coded(StatusCodes.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found for active business."),
	mediaLimitReached: (limit: number) =>
		coded(StatusCodes.CONFLICT, "MEDIA_LIMIT_REACHED", `Maximum product images reached (${limit}).`),

	supabaseDisabled: () =>
		coded(StatusCodes.SERVICE_UNAVAILABLE, "SUPABASE_DISABLED", "Uploads are temporarily unavailable."),

	// 413 Payload Too Large
	fileTooLarge: (maxBytes: number) =>
		coded(413, "MEDIA_FILE_TOO_LARGE", `File exceeds maximum size (${maxBytes} bytes).`),

	unsupportedType: (mimeType: string) =>
		coded(StatusCodes.UNSUPPORTED_MEDIA_TYPE, "MEDIA_UNSUPPORTED_TYPE", `Unsupported file type: ${mimeType}`),

	invalidBucket: (bucket: string) =>
		coded(StatusCodes.BAD_REQUEST, "MEDIA_INVALID_BUCKET", `Invalid bucket: ${bucket}`),

	invalidPath: (path: string) => coded(StatusCodes.BAD_REQUEST, "MEDIA_INVALID_PATH", `Invalid object path: ${path}`),

	objectNotFound: () => coded(StatusCodes.NOT_FOUND, "MEDIA_OBJECT_NOT_FOUND", "Uploaded object not found in storage."),

	supabaseSignedUploadFailed: (msg?: string) =>
		coded(StatusCodes.BAD_GATEWAY, "SUPABASE_SIGNED_UPLOAD_FAILED", msg ?? "Failed to create signed upload URL."),

	supabasePublicUrlFailed: () =>
		coded(StatusCodes.BAD_GATEWAY, "SUPABASE_PUBLIC_URL_FAILED", "Failed to derive public URL."),
};
