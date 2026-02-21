// path: src/modules/media/media.paths.ts
/**
 * NOTE: This file is intentionally GOVERNED.
 * - It must never accept businessId for routing.
 * - Business scope must be derived from activeBusinessId (server-side).
 *
 * Authoritative mapping remains in media.service.ts, but this helper is safe if
 * any legacy code still imports it.
 */

import { env } from "@/core/config/env";
import type { MediaKind, MediaExt } from "@/modules/media/media.constants";

type ResolveArgs = {
	kind: MediaKind;
	ext: MediaExt;

	// Server-derived context (never trust client input for routing)
	activeBusinessId?: string | null;
	authedUserId: string;

	// Targets
	productId?: string;
	userId?: string; // optional; defaults to authedUserId
	isPrimary?: boolean;
};

function cryptoRandomId(): string {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { randomUUID } = require("crypto") as typeof import("crypto");
	return typeof randomUUID === "function" ? randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function requireStorageBucket(bucket: string | undefined, key: string): string {
	if (!bucket) throw new Error(`Missing storage bucket configuration: ${key}`);
	return bucket;
}

export function resolveBucketAndPath(args: ResolveArgs): { bucket: string; path: string } {
	const id = cryptoRandomId();

	if (args.kind === "product-image") {
		if (!args.activeBusinessId) throw new Error("Missing activeBusinessId");
		if (!args.productId) throw new Error("Missing productId");
		const isPrimary = args.isPrimary ?? true;
		const filename = isPrimary ? `primary_${id}.${args.ext}` : `${id}.${args.ext}`;
		return {
			bucket: requireStorageBucket(env.supabaseStorageProductBucket, "SUPABASE_STORAGE_PRODUCT_BUCKET"),
			path: `business/${args.activeBusinessId}/products/${args.productId}/${filename}`,
		};
	}

	if (args.kind === "user-avatar" || args.kind === "user-cover") {
		const uid = args.userId ?? args.authedUserId;
		return {
			bucket: requireStorageBucket(env.supabaseStorageUserBucket, "SUPABASE_STORAGE_USER_BUCKET"),
			path: `user/${uid}/${args.kind}/${id}.${args.ext}`,
		};
	}

	// business-logo | business-cover
	if (!args.activeBusinessId) throw new Error("Missing activeBusinessId");
	return {
		bucket: requireStorageBucket(env.supabaseStorageBusinessBucket, "SUPABASE_STORAGE_BUSINESS_BUCKET"),
		path: `business/${args.activeBusinessId}/${args.kind}/${id}.${args.ext}`,
	};
}
