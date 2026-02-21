// path: src/modules/media/media.service.ts
import { StorageProvider } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { env } from "@/core/config/env";

import type {
	CreateSignedUploadDto,
	CommitUploadedObjectDto,
	RemoveProductPrimaryImageDto,
} from "@/modules/media/media.validators";
import {
	MEDIA_MAX_BYTES,
	MEDIA_ALLOWED_MIME_TYPES,
	type MediaKind,
	type MediaExt,
} from "@/modules/media/media.constants";
import { MediaErrors } from "@/modules/media/media.errors";
import { verifyUploadedObject } from "@/modules/media/media.verify";
import { resolveProductImageUrl } from "@/modules/media/media.resolve";
import { MAX_PRODUCT_IMAGES } from "@/shared/catalogLimits";

type RequestUser = {
	id: string;
	activeBusinessId: string | null;
};

function assertActiveBusiness(user: RequestUser): string {
	if (!user.activeBusinessId) throw MediaErrors.noActiveBusiness();
	return user.activeBusinessId;
}

function assertSupabaseEnabled(): void {
	if (!env.supabaseEnabled || !env.supabaseUrl || !env.supabaseServiceRoleKey) {
		throw MediaErrors.supabaseDisabled();
	}
}

function assertMediaConstraints(args: { bytes?: number; mimeType?: string }) {
	if (typeof args.bytes === "number" && args.bytes > MEDIA_MAX_BYTES) {
		throw MediaErrors.fileTooLarge(MEDIA_MAX_BYTES);
	}
	if (args.mimeType && !MEDIA_ALLOWED_MIME_TYPES.includes(args.mimeType as any)) {
		throw MediaErrors.unsupportedType(args.mimeType);
	}
}

function requireStorageBucket(bucket: string | undefined, key: string): string {
	if (!bucket) {
		throw MediaErrors.supabaseSignedUploadFailed(`Missing storage bucket configuration: ${key}`);
	}
	return bucket;
}

function cryptoRandomId(): string {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { randomUUID } = require("crypto") as typeof import("crypto");
	return typeof randomUUID === "function" ? randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveBucketAndPath(args: {
	user: RequestUser;
	kind: MediaKind;
	ext: MediaExt;
	productId?: string;
	userId?: string;
	isPrimary?: boolean;
}): { bucket: string; path: string } {
	const { user, kind, ext } = args;
	const id = cryptoRandomId();

	if (kind === "product-image") {
		const businessId = assertActiveBusiness(user);
		const productId = args.productId;
		if (!productId) throw MediaErrors.invalidPath("Missing productId for product-image");

		const isPrimary = args.isPrimary ?? true;
		const filename = isPrimary ? `primary_${id}.${ext}` : `${id}.${ext}`;

		return {
			bucket: requireStorageBucket(env.supabaseStorageProductBucket, "SUPABASE_STORAGE_PRODUCT_BUCKET"),
			path: `business/${businessId}/products/${productId}/${filename}`,
		};
	}

	if (kind === "user-avatar" || kind === "user-cover") {
		const uid = args.userId ?? user.id;
		return {
			bucket: requireStorageBucket(env.supabaseStorageUserBucket, "SUPABASE_STORAGE_USER_BUCKET"),
			path: `user/${uid}/${kind}/${id}.${ext}`,
		};
	}

	const businessId = assertActiveBusiness(user);
	return {
		bucket: requireStorageBucket(env.supabaseStorageBusinessBucket, "SUPABASE_STORAGE_BUSINESS_BUCKET"),
		path: `business/${businessId}/${kind}/${id}.${ext}`,
	};
}

export async function createSignedUploadUrl(user: RequestUser, dto: CreateSignedUploadDto) {
	assertSupabaseEnabled();
	assertMediaConstraints({ bytes: dto.bytes, mimeType: dto.contentType });

	const kind = dto.kind as MediaKind;
	if (!kind) throw MediaErrors.invalidPath("Missing kind");

	if (kind === "product-image") {
		const bid = assertActiveBusiness(user);
		if (!dto.productId) throw MediaErrors.invalidPath("Missing productId for product-image");

		const product = await prisma.product.findFirst({
			where: { id: dto.productId, businessId: bid },
			select: { id: true },
		});
		if (!product) throw MediaErrors.productNotFound();

		if (dto.isPrimary === false) {
			const imageCount = await prisma.productImage.count({
				where: { businessId: bid, productId: dto.productId },
			});
			if (imageCount >= MAX_PRODUCT_IMAGES) {
				throw MediaErrors.mediaLimitReached(MAX_PRODUCT_IMAGES);
			}
		}
	}

	const { bucket, path } = resolveBucketAndPath({
		user,
		kind,
		ext: dto.ext as MediaExt,
		productId: dto.productId,
		userId: dto.userId,
		isPrimary: dto.kind === "product-image" ? dto.isPrimary ?? true : undefined,
	});

	const supabaseAdmin = getSupabaseAdmin();
	const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);

	if (error || !data?.token) {
		throw MediaErrors.supabaseSignedUploadFailed(error?.message);
	}

	return {
		bucket,
		path,
		token: data.token,
		expiresInSeconds: 2 * 60 * 60,
		policy: {
			maxBytes: MEDIA_MAX_BYTES,
			allowedMimeTypes: MEDIA_ALLOWED_MIME_TYPES,
		},
	};
}

export async function commitUploadedObject(user: RequestUser, dto: CommitUploadedObjectDto) {
	assertSupabaseEnabled();

	const businessId = assertActiveBusiness(user);

	const expectedBucket = requireStorageBucket(
		env.supabaseStorageProductBucket,
		"SUPABASE_STORAGE_PRODUCT_BUCKET"
	);
	if (dto.bucket !== expectedBucket) throw MediaErrors.invalidBucket(dto.bucket);

	const expectedPrefix = `business/${businessId}/products/${dto.productId}/`;
	if (!dto.path.startsWith(expectedPrefix)) throw MediaErrors.invalidPath(dto.path);

	const verified = await verifyUploadedObject({ bucket: dto.bucket, path: dto.path });

	assertMediaConstraints({
		bytes: verified.contentLength ?? dto.bytes,
		mimeType: verified.contentType ?? dto.mimeType,
	});

	const product = await prisma.product.findFirst({
		where: { id: dto.productId, businessId },
		select: { id: true, primaryImageUrl: true },
	});
	if (!product) throw MediaErrors.productNotFound();

	const isPrimary = dto.isPrimary ?? false;
	const sortOrder = dto.sortOrder ?? 0;

	const supabaseAdmin = getSupabaseAdmin();
	const publicResult = supabaseAdmin.storage.from(dto.bucket).getPublicUrl(dto.path);
	const publicUrl = publicResult?.data?.publicUrl;
	if (!publicUrl) throw MediaErrors.supabasePublicUrlFailed();

	const upserted = await prisma.$transaction(async (tx) => {
		const existing = await tx.productImage.findFirst({
			where: { businessId, productId: dto.productId, bucket: dto.bucket, path: dto.path },
			select: { id: true },
		});

		const data = {
			businessId,
			productId: dto.productId,
			provider: StorageProvider.SUPABASE,
			bucket: dto.bucket,
			path: dto.path,
			publicUrl,

			mimeType: verified.contentType ?? dto.mimeType,
			bytes: verified.contentLength ?? dto.bytes,
			width: dto.width,
			height: dto.height,

			isPrimary,
			sortOrder,
		};

		let record: { id: string; isPrimary: boolean };
		if (existing) {
			record = await tx.productImage.update({
				where: { id: existing.id },
				data,
				select: { id: true, isPrimary: true },
			});
		} else if (isPrimary) {
			const existingPrimary = await tx.productImage.findFirst({
				where: { businessId, productId: dto.productId, isPrimary: true },
				select: { id: true },
			});

			if (existingPrimary) {
				// Primary replacement should not grow image row count.
				record = await tx.productImage.update({
					where: { id: existingPrimary.id },
					data,
					select: { id: true, isPrimary: true },
				});
			} else {
				const imageCount = await tx.productImage.count({
					where: { businessId, productId: dto.productId },
				});
				if (imageCount >= MAX_PRODUCT_IMAGES) {
					throw MediaErrors.mediaLimitReached(MAX_PRODUCT_IMAGES);
				}

				record = await tx.productImage.create({
					data,
					select: { id: true, isPrimary: true },
				});
			}
		} else {
			const imageCount = await tx.productImage.count({
				where: { businessId, productId: dto.productId },
			});
			if (imageCount >= MAX_PRODUCT_IMAGES) {
				throw MediaErrors.mediaLimitReached(MAX_PRODUCT_IMAGES);
			}

			record = await tx.productImage.create({
				data,
				select: { id: true, isPrimary: true },
			});
		}

		if (record.isPrimary) {
			await tx.productImage.updateMany({
				where: { productId: dto.productId, businessId, id: { not: record.id } },
				data: { isPrimary: false },
			});
			await tx.product.update({
				where: { id: dto.productId },
				data: { primaryImageUrl: dto.path },
			});
		} else if (!product.primaryImageUrl) {
			await tx.product.update({
				where: { id: dto.productId },
				data: { primaryImageUrl: dto.path },
			});
		}

		return record;
	});

	const resolvedUrl = await resolveProductImageUrl(dto.path);

	return { ok: true as const, imageId: upserted.id, publicUrl: resolvedUrl ?? publicUrl };
}

/**
 * Remove Product Primary Image (v1)
 * Governance:
 * - Clears Product.primaryImageUrl
 * - De-primary existing ProductImage rows (keeps history; no hard delete required)
 * - Best-effort storage delete for the current primary object (do not fail if delete fails)
 */
export async function removeProductPrimaryImage(user: RequestUser, dto: RemoveProductPrimaryImageDto) {
	assertSupabaseEnabled();

	const businessId = assertActiveBusiness(user);

	const product = await prisma.product.findFirst({
		where: { id: dto.productId, businessId },
		select: { id: true, primaryImageUrl: true },
	});
	if (!product) throw MediaErrors.productNotFound();

	// Best-effort: find current primary image record so we can attempt object deletion
	const currentPrimary = await prisma.productImage.findFirst({
		where: { productId: dto.productId, businessId, isPrimary: true },
		select: { id: true, bucket: true, path: true },
	});

	await prisma.$transaction(async (tx) => {
		await tx.productImage.updateMany({
			where: { productId: dto.productId, businessId, isPrimary: true },
			data: { isPrimary: false },
		});

		await tx.product.update({
			where: { id: dto.productId },
			data: { primaryImageUrl: null },
		});
	});

	// Best-effort delete (do not fail request)
	if (currentPrimary?.bucket && currentPrimary?.path) {
		try {
			const supabaseAdmin = getSupabaseAdmin();
			await supabaseAdmin.storage.from(currentPrimary.bucket).remove([currentPrimary.path]);
		} catch {
			// swallow
		}
	}

	return { ok: true as const };
}
