// path: src/modules/media/media.retry.ts
export function isTransientUploadError(err: any): boolean {
	const msg = String(err?.message ?? "").toLowerCase();

	// Practical heuristics (network / timeouts / 5xx style failures)
	return (
		msg.includes("network") ||
		msg.includes("timeout") ||
		msg.includes("timed out") ||
		msg.includes("fetch") ||
		msg.includes("econnreset") ||
		msg.includes("503") ||
		msg.includes("502") ||
		msg.includes("gateway")
	);
}

export async function retry<T>(fn: () => Promise<T>, opts: { retries: number; baseDelayMs: number }): Promise<T> {
	let attempt = 0;
	let lastErr: any;

	while (attempt <= opts.retries) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			if (attempt === opts.retries) break;

			const delay = opts.baseDelayMs * Math.pow(2, attempt);
			await new Promise((r) => setTimeout(r, delay));
			attempt += 1;
		}
	}

	throw lastErr;
}
