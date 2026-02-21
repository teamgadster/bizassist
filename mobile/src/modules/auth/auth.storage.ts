// path: src/modules/auth/auth.storage.ts
import { MMKVKeys, tokenStorage } from "@/lib/storage/mmkv";

const ACCESS_TOKEN_KEY = MMKVKeys.authAccessToken;
const REFRESH_TOKEN_KEY = MMKVKeys.authRefreshToken;

// Password reset ticket/session keys (auth-adjacent, keep in tokenStorage)
const RESET_EMAIL_KEY = "auth.passwordReset.email";
const RESET_TICKET_KEY = "auth.passwordReset.ticket";
const RESET_EXPIRES_AT_KEY = "auth.passwordReset.expiresAtMs";

// Post-verify display email (one-shot, auth-adjacent)
// IMPORTANT: store in tokenStorage so it follows auth lifecycle expectations.
const POST_VERIFY_EMAIL_KEY = "auth.postVerifyEmail";

/**
 * Internal helper: clear a key safely.
 * Prefer delete/remove if available in your MMKV wrapper; fall back to empty.
 */
function clearKey(
	kv: { delete?: (k: string) => void; remove?: (k: string) => void; set: (k: string, v: any) => void },
	key: string
) {
	if (typeof kv.delete === "function") {
		kv.delete(key);
		return;
	}
	if (typeof kv.remove === "function") {
		kv.remove(key);
		return;
	}
	kv.set(key, "");
}

/* =========================
   Auth token helpers
   ========================= */

export const saveAuthTokens = (accessToken: string, refreshToken: string): void => {
	tokenStorage.set(ACCESS_TOKEN_KEY, accessToken);
	tokenStorage.set(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAuthTokens = (): { accessToken: string | null; refreshToken: string | null } => {
	const accessToken = tokenStorage.getString(ACCESS_TOKEN_KEY) ?? null;
	const refreshToken = tokenStorage.getString(REFRESH_TOKEN_KEY) ?? null;
	return { accessToken, refreshToken };
};

/**
 * Clear ONLY auth tokens. Do NOT clearAll().
 * This prevents accidentally wiping unrelated sessions/state (e.g., password reset ticket).
 */
export const clearAuthTokens = (): void => {
	clearKey(tokenStorage as any, ACCESS_TOKEN_KEY);
	clearKey(tokenStorage as any, REFRESH_TOKEN_KEY);
};

/* =========================
   Password reset ticket/session helpers
   ========================= */

export type PasswordResetTicketSession = {
	email: string;
	resetTicket: string;
	expiresAtMs: number;
	expiresInSeconds: number;
};

export const savePasswordResetTicket = (input: {
	email: string;
	resetTicket: string;
	expiresInSeconds: number;
}): void => {
	const safeEmail = input.email.trim().toLowerCase();
	const ttl = Math.max(0, Math.floor(input.expiresInSeconds || 0));
	const expiresAtMs = Date.now() + ttl * 1000;

	tokenStorage.set(RESET_EMAIL_KEY, safeEmail);
	tokenStorage.set(RESET_TICKET_KEY, input.resetTicket);
	tokenStorage.set(RESET_EXPIRES_AT_KEY, String(expiresAtMs));
};

export const getPasswordResetTicket = (): PasswordResetTicketSession | null => {
	const email = tokenStorage.getString(RESET_EMAIL_KEY) ?? "";
	const resetTicket = tokenStorage.getString(RESET_TICKET_KEY) ?? "";
	const expiresAtRaw = tokenStorage.getString(RESET_EXPIRES_AT_KEY) ?? "";

	if (!email || !resetTicket || !expiresAtRaw) return null;

	const expiresAtMs = Number(expiresAtRaw);
	if (!Number.isFinite(expiresAtMs)) return null;

	if (Date.now() > expiresAtMs) {
		clearPasswordResetTicket();
		return null;
	}

	const secondsLeft = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

	return {
		email,
		resetTicket,
		expiresAtMs,
		expiresInSeconds: secondsLeft,
	};
};

export const clearPasswordResetTicket = (): void => {
	clearKey(tokenStorage as any, RESET_EMAIL_KEY);
	clearKey(tokenStorage as any, RESET_TICKET_KEY);
	clearKey(tokenStorage as any, RESET_EXPIRES_AT_KEY);
};

/* =========================
   Post-verify one-shot email (display only)
   ========================= */

export const setPostVerifyEmail = (email: string): void => {
	const safeEmail = email.trim().toLowerCase();
	if (!safeEmail) return;
	tokenStorage.set(POST_VERIFY_EMAIL_KEY, safeEmail);
};

export const getPostVerifyEmail = (): string | null => {
	const email = tokenStorage.getString(POST_VERIFY_EMAIL_KEY) ?? "";
	const safeEmail = email.trim();
	return safeEmail ? safeEmail : null;
};

export const clearPostVerifyEmail = (): void => {
	clearKey(tokenStorage as any, POST_VERIFY_EMAIL_KEY);
};
