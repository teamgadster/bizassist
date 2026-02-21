// path: src/lib/storage/signedUpload.ts

import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

import { MEDIA_ALLOWED_MIME_TYPES, MEDIA_MAX_BYTES } from "@/lib/storage/mediaLimits";
import { getSupabase, isSupabaseConfigured, SUPABASE_PUBLISHABLE_KEY, SUPABASE_REST_URL } from "@/lib/supabase/client";

/**
 * UploadToSignedUrlInput
 *
 * Governance:
 * - bucket + path must come from a trusted backend-issued signed URL
 * - localUri must be a file:// URI
 * - contentType must be explicitly validated (no sniffing)
 */
export type UploadToSignedUrlInput = {
	bucket: string;
	path: string;
	token: string;
	localUri: string; // file:// uri
	contentType: (typeof MEDIA_ALLOWED_MIME_TYPES)[number];
	upsert?: boolean;
	knownBytes?: number; // optional preflight hint
};

function assertMimeType(contentType: string) {
	if (!MEDIA_ALLOWED_MIME_TYPES.includes(contentType as any)) {
		const e: any = new Error("Unsupported file type. Use JPG, PNG, or WEBP.");
		e.code = "MEDIA_UNSUPPORTED_TYPE";
		throw e;
	}
}

function assertMaxBytes(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) {
		const e: any = new Error("Invalid file size.");
		e.code = "MEDIA_FILE_INFO_FAILED";
		throw e;
	}

	if (bytes > MEDIA_MAX_BYTES) {
		const e: any = new Error("That photo is too large. Maximum allowed is 10 MB.");
		e.code = "MEDIA_FILE_TOO_LARGE";
		throw e;
	}
}

function assertPath(path: string) {
	// Minimal safety check to avoid accidental root writes
	if (!path || !path.includes("/")) {
		const e: any = new Error("Invalid upload path.");
		e.code = "MEDIA_INVALID_PATH";
		throw e;
	}
}

/**
 * Upload bytes to Supabase Storage using a signed upload URL token.
 *
 * Technical notes:
 * - React Native uploads ArrayBuffer bytes (not multipart/FormData)
 * - Base64 decode is used due to Expo FileSystem constraints
 * - Size is enforced twice (preflight + actual bytes)
 *
 * Governance:
 * - NEVER upload if Supabase is not configured
 * - NEVER bypass MIME or byte-size enforcement
 */
export async function uploadToSignedUrl({
	bucket,
	path,
	token,
	localUri,
	contentType,
	upsert = true,
	knownBytes,
}: UploadToSignedUrlInput): Promise<void> {
	// --- Hard gate: Supabase must be configured
	if (!isSupabaseConfigured) {
		const e: any = new Error("Media uploads are disabled. Supabase is not configured.");
		e.code = "SUPABASE_NOT_CONFIGURED";
		throw e;
	}

	assertMimeType(contentType);
	assertPath(path);

	if (typeof knownBytes === "number") {
		assertMaxBytes(knownBytes);
	}

	// Expo FileSystem typing drift: EncodingType may not exist in some builds
	const base64Encoding: any = (FileSystem as any).EncodingType?.Base64 ?? "base64";

	const base64 = await FileSystem.readAsStringAsync(localUri, {
		encoding: base64Encoding,
	});

	const body = decode(base64);

	// Enforce actual byte size (authoritative)
	assertMaxBytes(body.byteLength);

	const supabase = getSupabase();

	// Supabase JS has `uploadToSignedUrl` in modern versions, but some RN builds/version skews
	// can ship without it. We prefer the SDK path first, then fall back to a deterministic
	// REST upload via FileSystem.uploadAsync.
	const fromBucket: any = (supabase as any).storage?.from?.(bucket);
	const sdkFn: any = fromBucket?.uploadToSignedUrl;

	if (typeof sdkFn === "function") {
		const { error } = await fromBucket.uploadToSignedUrl(path, token, body, {
			contentType,
			upsert,
		});

		if (error) {
			const e: any = new Error(error.message ?? "Upload failed.");
			e.code = "SUPABASE_UPLOAD_FAILED";
			throw e;
		}
		return;
	}

	// ---- Fallback: REST upload (POS-grade reliability)
	await uploadToSignedUrlRest({ bucket, path, token, localUri, contentType, upsert });
}

function encodePathPreserveSlashes(path: string) {
	return path
		.split("/")
		.map((seg) => encodeURIComponent(seg))
		.join("/");
}

async function uploadToSignedUrlRest(args: {
	bucket: string;
	path: string;
	token: string;
	localUri: string;
	contentType: string;
	upsert: boolean;
}) {
	if (!SUPABASE_REST_URL || !SUPABASE_PUBLISHABLE_KEY) {
		const e: any = new Error("Supabase is not configured.");
		e.code = "SUPABASE_NOT_CONFIGURED";
		throw e;
	}

	// Supabase Storage signed upload endpoint
	// POST /storage/v1/object/upload/sign/:bucket/:path?token=...
	const url = `${SUPABASE_REST_URL.replace(/\/$/, "")}/storage/v1/object/upload/sign/${encodeURIComponent(
		args.bucket,
	)}/${encodePathPreserveSlashes(args.path)}?token=${encodeURIComponent(args.token)}`;

	try {
		const res = await FileSystem.uploadAsync(url, args.localUri, {
			httpMethod: "POST",
			uploadType: (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ?? 0,
			headers: {
				"content-type": args.contentType,
				// Supabase REST requires apikey; Authorization is accepted in many setups.
				apikey: SUPABASE_PUBLISHABLE_KEY,
				authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
				"x-upsert": args.upsert ? "true" : "false",
			},
		});

		if (!res || typeof (res as any).status !== "number") {
			const e: any = new Error("Upload failed.");
			e.code = "SUPABASE_UPLOAD_FAILED";
			throw e;
		}

		const status = (res as any).status as number;
		if (status < 200 || status >= 300) {
			const e: any = new Error(`Upload failed (${status}).`);
			e.code = "SUPABASE_UPLOAD_FAILED";
			e.status = status;
			e.body = (res as any).body;
			throw e;
		}
	} catch (err: any) {
		// Normalize to a domain-friendly shape
		const e: any = err instanceof Error ? err : new Error(String(err?.message ?? "Upload failed."));
		e.code = err?.code ?? "SUPABASE_UPLOAD_FAILED";
		if (typeof err?.status === "number") e.status = err.status;
		throw e;
	}
}
