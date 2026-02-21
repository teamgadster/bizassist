// path: src/modules/media/media.analytics.ts
type MediaUploadEvent =
	| { name: "media_upload_failed"; code?: string; status?: number; context?: string }
	| {
			name: "media_upload_succeeded";
			context?: string;
			imageId?: string;
			publicUrl?: string;
			bytes?: number;
			width?: number;
			height?: number;
	  };

export function trackMediaEvent(evt: MediaUploadEvent) {
	// v1: console only (swap later to PostHog/Amplitude/etc.)
	// Governance: never log secrets/URLs/tokens.
	const mediaDebug = __DEV__ && process.env.EXPO_PUBLIC_MEDIA_DEBUG === "true";
	if (evt.name === "media_upload_succeeded" && !mediaDebug) return;

	const payload: Record<string, unknown> = { context: (evt as any).context };
	if ((evt as any).code !== undefined) payload.code = (evt as any).code;
	if ((evt as any).status !== undefined) payload.status = (evt as any).status;

	if (mediaDebug) {
		if ((evt as any).imageId !== undefined) payload.imageId = (evt as any).imageId;
		if ((evt as any).publicUrl !== undefined) payload.publicUrl = (evt as any).publicUrl;
		if ((evt as any).bytes !== undefined) payload.bytes = (evt as any).bytes;
		if ((evt as any).width !== undefined) payload.width = (evt as any).width;
		if ((evt as any).height !== undefined) payload.height = (evt as any).height;
	}

	console.log(`[media] ${evt.name}`, payload);
}
