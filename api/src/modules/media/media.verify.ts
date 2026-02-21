// path: src/modules/media/media.verify.ts
import { MEDIA_MAX_BYTES, MEDIA_ALLOWED_MIME_TYPES } from "@/modules/media/media.constants";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { MediaErrors } from "@/modules/media/media.errors";

type VerifiedObject = {
	contentType?: string;
	contentLength?: number;
};

function parseIntSafe(v: string | null): number | undefined {
	if (!v) return undefined;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(input, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(t);
	}
}

export async function verifyUploadedObject(args: {
	bucket: string;
	path: string;
	maxBytes?: number;
	allowedMimeTypes?: readonly string[];
	timeoutMs?: number;
}): Promise<VerifiedObject> {
	const maxBytes = args.maxBytes ?? MEDIA_MAX_BYTES;
	const allowed = args.allowedMimeTypes ?? MEDIA_ALLOWED_MIME_TYPES;
	const timeoutMs = args.timeoutMs ?? 5000;

	const supabaseAdmin = getSupabaseAdmin();
	const { data, error } = await supabaseAdmin.storage.from(args.bucket).createSignedUrl(args.path, 10);

	if (error || !data?.signedUrl) throw MediaErrors.objectNotFound();

	let res: Response | undefined;
	try {
		res = await fetchWithTimeout(data.signedUrl, { method: "HEAD" }, timeoutMs);
	} catch {
		res = undefined;
	}

	if (!res || !res.ok) {
		res = await fetchWithTimeout(data.signedUrl, { method: "GET" }, timeoutMs);
	}
	if (!res.ok) throw MediaErrors.objectNotFound();

	const contentType = res.headers.get("content-type") ?? undefined;
	const contentLength = parseIntSafe(res.headers.get("content-length"));

	if (contentType && !allowed.includes(contentType)) throw MediaErrors.unsupportedType(contentType);
	if (typeof contentLength === "number" && contentLength > maxBytes) throw MediaErrors.fileTooLarge(maxBytes);

	return { contentType, contentLength };
}
