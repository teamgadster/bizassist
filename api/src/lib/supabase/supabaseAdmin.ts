// path: src/lib/supabase/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/core/config/env";

/**
 * Server-only Supabase admin client (service role).
 *
 * Governance:
 * - Service role key is server-only.
 * - Lazily initialized to avoid crashing the whole API on boot when disabled/misconfigured.
 */
let _admin: SupabaseClient | null = null;

function requireSupabaseServerCreds() {
	if (!env.supabaseEnabled) throw new Error("Supabase is disabled (SUPABASE_ENABLED=false).");
	if (!env.supabaseUrl) throw new Error("Missing SUPABASE_URL.");
	if (!env.supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
	return { url: env.supabaseUrl, serviceRoleKey: env.supabaseServiceRoleKey };
}

export function getSupabaseAdmin(): SupabaseClient {
	if (_admin) return _admin;

	const { url, serviceRoleKey } = requireSupabaseServerCreds();
	_admin = createClient(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	return _admin;
}
