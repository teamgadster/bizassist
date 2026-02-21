// BizAssist_mobile
// path: src/modules/media/media.api.ts

import apiClient from "@/lib/api/httpClient";
import { toMediaDomainError } from "@/modules/media/media.errors";
import type {
	ApiEnvelope,
	CommitUploadedObjectPayload,
	CommitUploadedObjectResponse,
	CreateSignedUploadUrlPayload,
	CreateSignedUploadUrlResponse,
	RemoveProductPrimaryImagePayload,
	RemoveProductPrimaryImageResponse,
} from "@/modules/media/media.types";

async function handle<T>(fn: () => Promise<T>) {
	try {
		return await fn();
	} catch (e) {
		throw toMediaDomainError(e);
	}
}

export const mediaApi = {
	async createSignedUploadUrl(payload: CreateSignedUploadUrlPayload): Promise<CreateSignedUploadUrlResponse> {
		return handle(async () => {
			const res = await apiClient.post<ApiEnvelope<CreateSignedUploadUrlResponse>>("/media/signed-upload", payload);
			return res.data.data;
		});
	},

	async commitUploadedObject(payload: CommitUploadedObjectPayload): Promise<CommitUploadedObjectResponse> {
		return handle(async () => {
			const res = await apiClient.post<ApiEnvelope<CommitUploadedObjectResponse>>("/media/commit", payload);
			return res.data.data;
		});
	},

	async removeProductPrimaryImage(
		payload: RemoveProductPrimaryImagePayload,
	): Promise<RemoveProductPrimaryImageResponse> {
		return handle(async () => {
			const res = await apiClient.post<ApiEnvelope<RemoveProductPrimaryImageResponse>>(
				"/media/product-image/remove",
				payload,
			);
			return res.data.data;
		});
	},
};
