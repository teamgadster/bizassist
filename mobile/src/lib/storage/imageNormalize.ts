// path: src/lib/storage/imageNormalize.ts

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export type NormalizeImageOptions = {
	maxSize: number; // e.g. 1200
	compress: number; // initial quality e.g. 0.85
	format?: ImageManipulator.SaveFormat; // default JPEG
};

export type NormalizedImageResult = {
	uri: string;
	width: number;
	height: number;
	contentType: string; // "image/jpeg"
};

export async function normalizeImageAsync(
	localUri: string,
	options: NormalizeImageOptions,
): Promise<NormalizedImageResult> {
	const format = options.format ?? ImageManipulator.SaveFormat.JPEG;

	// Resize to maxSize bounding box (your cropper should already be square; this keeps it deterministic)
	const result = await ImageManipulator.manipulateAsync(
		localUri,
		[{ resize: { width: options.maxSize, height: options.maxSize } }],
		{ compress: options.compress, format },
	);

	return {
		uri: result.uri,
		width: result.width ?? options.maxSize,
		height: result.height ?? options.maxSize,
		contentType: format === ImageManipulator.SaveFormat.PNG ? "image/png" : "image/jpeg",
	};
}

/**
 * Recompress JPEG until it fits under maxBytes (best-effort).
 * - Never upscales.
 * - Keeps dimensions fixed; only adjusts quality.
 */
export async function recompressJpegToMaxBytes(
	uri: string,
	maxBytes: number,
	opts?: { start?: number; min?: number; step?: number },
): Promise<{ uri: string; bytes?: number; quality: number }> {
	const start = opts?.start ?? 0.85;
	const min = opts?.min ?? 0.72;
	const step = opts?.step ?? 0.03;

	let quality = start;
	let currentUri = uri;

	// Hard safety limit
	for (let i = 0; i < 8; i++) {
		const info = (await FileSystem.getInfoAsync(currentUri)) as any;
		const size = typeof info?.size === "number" ? (info.size as number) : undefined;

		if (typeof size === "number" && size <= maxBytes) {
			return { uri: currentUri, bytes: size, quality };
		}

		const nextQuality = quality - step;
		if (nextQuality < min) {
			return { uri: currentUri, bytes: size, quality };
		}

		quality = nextQuality;

		const recompressed = await ImageManipulator.manipulateAsync(currentUri, [], {
			compress: quality,
			format: ImageManipulator.SaveFormat.JPEG,
		});

		currentUri = recompressed.uri;
	}

	// Return best attempt
	const finalInfo = (await FileSystem.getInfoAsync(currentUri)) as any;
	const finalBytes = typeof finalInfo?.size === "number" ? (finalInfo.size as number) : undefined;
	return { uri: currentUri, bytes: finalBytes, quality };
}
