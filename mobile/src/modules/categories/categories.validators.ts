// BizAssist_mobile
// path: src/modules/categories/categories.validators.ts

export type CategoryApiErrorMeta = {
	code?: string;
	message?: string;
	limit?: number;
};

export function extractCategoryApiError(err: unknown): CategoryApiErrorMeta {
	const data = (err as any)?.response?.data;
	const error = data?.error ?? {};
	const code = typeof error?.code === "string" ? error.code : typeof data?.code === "string" ? data.code : undefined;
	const message =
		typeof error?.message === "string"
			? error.message
			: typeof data?.message === "string"
			  ? data.message
			  : typeof (err as any)?.message === "string"
			    ? (err as any).message
			    : undefined;
	const limitRaw = data?.data?.limit ?? error?.limit;
	const limit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? limitRaw : undefined;
	return { code, message, limit };
}

export function toSafeCategoryParamString(v: unknown): string {
	return typeof v === "string" ? v : String(v ?? "");
}
