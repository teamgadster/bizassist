// path: src/modules/media/media.constants.ts
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const MEDIA_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"] as const;
export type MediaExt = (typeof MEDIA_ALLOWED_EXT)[number];

export const MEDIA_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type MediaMimeType = (typeof MEDIA_ALLOWED_MIME_TYPES)[number];

export type MediaKind = "product-image" | "user-avatar" | "user-cover" | "business-logo" | "business-cover";

export const EXT_TO_MIME: Record<MediaExt, MediaMimeType> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

export const MIME_TO_EXT: Record<MediaMimeType, MediaExt> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};
