// path: src/modules/media/media.upload.ts

import * as FileSystem from "expo-file-system/legacy";

import { normalizeImageAsync, recompressJpegToMaxBytes } from "@/lib/storage/imageNormalize";
import { assertUploadAllowed } from "@/lib/storage/mediaLimits";
import { uploadToSignedUrl } from "@/lib/storage/signedUpload";
import { trackMediaEvent } from "@/modules/media/media.analytics";
import { mediaApi } from "@/modules/media/media.api";
import {
	MIME_TO_EXT,
	POS_TILE_MIN_SIZE_PX,
	type MediaMimeType,
	type ProductImageKind,
} from "@/modules/media/media.constants";
import { toMediaDomainError } from "@/modules/media/media.errors";
import { isTransientUploadError, retry } from "@/modules/media/media.retry";

export type UploadProductImageInput = {
	localUri: string;
	productId: string;
	imageKind?: ProductImageKind;
	isPrimary?: boolean;
	sortOrder?: number;
	onStage?: (stage: UploadProductImageStage) => void;
};

export type UploadProductImageStage = "normalizing" | "uploading" | "committing" | "success";

const POS_TILE_HARD_MAX_BYTES = 800 * 1024;

function throwDomain(code: string, message: string) {
	throw { code, message };
}

function throwInvalidTileImage() {
	throwDomain(
		"MEDIA_INVALID_IMAGE",
		`POS tile photo must be a square photo at least ${POS_TILE_MIN_SIZE_PX}×${POS_TILE_MIN_SIZE_PX}.`,
	);
}

function throwUnsupportedType(mimeType: unknown) {
	throwDomain(
		"MEDIA_UNSUPPORTED_TYPE",
		`Unsupported file type: ${String(mimeType ?? "unknown")}. Use JPG, PNG, or WEBP.`,
	);
}

async function tryGetFileBytes(uri: string): Promise<number | undefined> {
	try {
		const info = (await FileSystem.getInfoAsync(uri)) as any;
		const mediaDebug = __DEV__ && process.env.EXPO_PUBLIC_MEDIA_DEBUG === "true";
		if (mediaDebug) {
			console.log("[media] getInfoAsync", { exists: info?.exists, size: info?.size });
		}
		if (info?.exists === false) return undefined;
		return typeof info?.size === "number" ? (info.size as number) : undefined;
	} catch (err) {
		console.warn("[media] getInfoAsync_failed", { err });
		return undefined;
	}
}

export async function uploadProductImage(input: UploadProductImageInput) {
	const context = "product-image";

	try {
		input.onStage?.("normalizing");

		const imageKind: ProductImageKind = input.imageKind ?? "PRIMARY_POS_TILE";
		const normalizeMaxSize = imageKind === "PRIMARY_POS_TILE" ? POS_TILE_MIN_SIZE_PX : 1600;

		let normalized = await normalizeImageAsync(input.localUri, {
			maxSize: normalizeMaxSize,
			compress: 0.85,
		});

		// IQA for tile
		if (imageKind === "PRIMARY_POS_TILE") {
			const w = normalized.width ?? 0;
			const h = normalized.height ?? 0;
			if (!w || !h || w !== h || w < POS_TILE_MIN_SIZE_PX || h < POS_TILE_MIN_SIZE_PX) {
				throwInvalidTileImage();
			}
		}

		const mimeType = normalized.contentType as MediaMimeType;
		const ext = MIME_TO_EXT[mimeType];
		if (!ext) throwUnsupportedType(mimeType);

		// If tile: recompress until <= 600KB (or fail)
		if (imageKind === "PRIMARY_POS_TILE" && mimeType === "image/jpeg") {
			const attempt = await recompressJpegToMaxBytes(normalized.uri, POS_TILE_HARD_MAX_BYTES, {
				start: 0.85,
				min: 0.72,
				step: 0.03,
			});

			// If recompression produced a smaller file, use it
			if (attempt.uri !== normalized.uri) {
				normalized = { ...normalized, uri: attempt.uri };
			}

			const finalBytes = attempt.bytes ?? (await tryGetFileBytes(normalized.uri));
			if (typeof finalBytes === "number" && finalBytes > POS_TILE_HARD_MAX_BYTES) {
				throwDomain(
					"MEDIA_FILE_TOO_LARGE",
					`POS tile photo must be ≤ ${Math.round(POS_TILE_HARD_MAX_BYTES / 1024)} KB.`,
				);
			}
		}

		const bytes = await tryGetFileBytes(normalized.uri);

		// Canonical policy layer (still applies)
		assertUploadAllowed({ bytes, mimeType });

		const signed = await retry(
			() =>
				mediaApi.createSignedUploadUrl({
					kind: "product-image",
					ext,
					contentType: mimeType,
					productId: input.productId,
					imageKind,
					isPrimary: input.isPrimary ?? true,
					bytes,
				}),
			{ retries: 2, baseDelayMs: 400 },
		);

		input.onStage?.("uploading");
		await retry(
			() =>
				uploadToSignedUrl({
					bucket: signed.bucket,
					path: signed.path,
					token: signed.token,
					localUri: normalized.uri,
					contentType: mimeType,
					upsert: true,
					knownBytes: bytes,
				}),
			{ retries: 2, baseDelayMs: 500 },
		);

		input.onStage?.("committing");
		const committed = await retry(
			() =>
				mediaApi.commitUploadedObject({
					kind: "product-image",
					bucket: signed.bucket,
					path: signed.path,
					productId: input.productId,
					imageKind,
					mimeType,
					bytes,
					width: normalized.width,
					height: normalized.height,
					isPrimary: input.isPrimary ?? true,
					sortOrder: input.sortOrder ?? 0,
				}),
			{ retries: 2, baseDelayMs: 400 },
		);

		input.onStage?.("success");
		trackMediaEvent({
			name: "media_upload_succeeded",
			context,
			imageId: committed.imageId,
			publicUrl: committed.publicUrl,
			bytes: bytes,
			width: normalized.width,
			height: normalized.height,
		});

		return {
			bucket: signed.bucket,
			path: signed.path,
			imageId: committed.imageId,
			publicUrl: committed.publicUrl,
		};
	} catch (e) {
		const de = toMediaDomainError(e);
		const transient = isTransientUploadError(de.raw);

		trackMediaEvent({
			name: "media_upload_failed",
			code: de.code,
			status: (de.raw as any)?.status ?? (de.raw as any)?.response?.status,
			context: transient ? `${context}:transient` : context,
		});

		throw de;
	}
}
