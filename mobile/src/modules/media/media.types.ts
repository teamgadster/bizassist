// path: src/modules/media/media.types.ts
import type { MediaExt, MediaMimeType, ProductImageKind } from "@/modules/media/media.constants";

export type ApiEnvelope<T> = {
	success: boolean;
	data: T;
	message?: string;
};

/**
 * MediaKind is the *only* client input that influences where media lands in Storage.
 * Bucket + path are resolved server-side from kind (+ scoped ids).
 */
export type CreateSignedUploadUrlPayload = {
	kind: "product-image" | "user-avatar" | "user-cover" | "business-logo" | "business-cover";
	ext: MediaExt;
	contentType: MediaMimeType;

	// Optional preflight hint
	bytes?: number;

	// product-image
	productId?: string;
	isPrimary?: boolean;
	imageKind?: ProductImageKind;

	// user-avatar/user-cover
	userId?: string;
};

export type CreateSignedUploadUrlResponse = {
	ok: true;
	bucket: string;
	path: string;
	token: string;
	expiresIn: number;
};

export type CommitUploadedObjectPayload = {
	kind: "product-image";
	bucket: string;
	path: string;
	productId: string;

	// Optional hints (service will validate from verified headers)
	mimeType?: MediaMimeType;
	bytes?: number;
	width?: number;
	height?: number;

	isPrimary?: boolean;
	imageKind?: ProductImageKind;
	sortOrder?: number;
};

export type CommitUploadedObjectResponse = {
	ok: true;
	imageId: string;
	publicUrl: string;
};

export type RemoveProductPrimaryImagePayload = {
	productId: string;
};

export type RemoveProductPrimaryImageResponse = {
	ok: true;
};
