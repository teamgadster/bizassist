// BizAssist_mobile path: src/lib/supabase/client.ts
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * BizAssist governance:
 * - Centralize Supabase client creation (single source of truth).
 * - NEVER crash the app if env vars are missing.
 * - Storage uploads in RN must use ArrayBuffer bytes (not Blob/File/FormData).
 *
 * Contract:
 * - `isSupabaseConfigured` lets the app gate Supabase features.
 * - `getSupabase()` lazily creates and memoizes the client (only when configured).
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

// Supabase now emphasizes a publishable key; we allow legacy anon fallback.
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Low-level REST endpoints require the Supabase URL + publishable key.
 * We intentionally expose these as read-only values for Storage fallbacks.
 */
export const SUPABASE_REST_URL = supabaseUrl;
export const SUPABASE_PUBLISHABLE_KEY = supabaseKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

function warnIfMissingOnce() {
	if (!isSupabaseConfigured) {
		console.warn(
			"[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Supabase features are disabled.",
		);
	}
}

// Non-fatal warning at module load
warnIfMissingOnce();

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (!isSupabaseConfigured) {
		// Fail fast for callers that forgot to gate.
		throw new Error("Supabase is not configured. Missing EXPO_PUBLIC_SUPABASE_URL or publishable/anon key.");
	}

	if (cachedClient) return cachedClient;

	cachedClient = createClient(supabaseUrl, supabaseKey, {
		auth: {
			storage: AsyncStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	});

	return cachedClient;
}
