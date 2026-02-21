// path: src/modules/media/media.resolve.ts
import { env } from "@/core/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";

function isLikelyUrl(value: string): boolean {
	const v = value.toLowerCase();
	return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:");
}

function extractBucketAndPathFromStorageUrl(value: string): { bucket: string; path: string } | null {
	// Supported Supabase Storage URL patterns:
	// - /storage/v1/object/public/<bucket>/<path>
	// - /storage/v1/object/sign/<bucket>/<path>?token=...
	const publicMarker = "/storage/v1/object/public/";
	const signMarker = "/storage/v1/object/sign/";

	let idx = value.indexOf(publicMarker);
	let markerLen = publicMarker.length;
	if (idx < 0) {
		idx = value.indexOf(signMarker);
		markerLen = signMarker.length;
	}
	if (idx < 0) return null;

	const rest = value.slice(idx + markerLen); // <bucket>/<path>[?...] 
	const q = rest.indexOf("?");
	const noQuery = q >= 0 ? rest.slice(0, q) : rest;
	const slash = noQuery.indexOf("/");
	if (slash <= 0) return null;

	return {
		bucket: noQuery.slice(0, slash),
		path: noQuery.slice(slash + 1),
	};
}

function getPublicUrl(bucket: string, path: string): string | null {
	try {
		const supabaseAdmin = getSupabaseAdmin();
		const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
		return data?.publicUrl ?? null;
	} catch {
		return null;
	}
}

export async function resolveProductImageUrl(input: string | null | undefined): Promise<string | null> {
	if (!input) return null;
	const value = input.trim();
	if (!value) return null;

	const productBucket = env.supabaseStorageProductBucket;
	if (!productBucket) {
		// Keep legacy/custom URLs functional when storage bucket config is absent.
		return isLikelyUrl(value) ? value : null;
	}

	// ✅ Option 1 delivery policy: product-media is PUBLIC.
	// Always return a stable public URL (no token query params) to maximize CDN + client cache hit rate.
	if (isLikelyUrl(value)) {
		// If this is a Supabase storage URL for the product bucket, normalize to the public URL.
		const parsed = extractBucketAndPathFromStorageUrl(value);
		if (parsed && parsed.bucket === productBucket) {
			return getPublicUrl(parsed.bucket, parsed.path);
		}
		// Legacy public URL or custom CDN: return as-is.
		return value;
	}

	// Treat as a storage path in the product bucket.
	return getPublicUrl(productBucket, value);
}
