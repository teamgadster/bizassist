// BizAssist_mobile
// path: src/lib/api/baseUrl.ts

import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

type ExtraConfig = {
	API_BASE_URL?: string; // app.json extra (optional legacy)
	EXPO_PUBLIC_API_BASE_URL?: string; // optional extra fallback

	API_BASE_URL_DEV?: string;
	API_BASE_URL_PROD?: string;

	EXPO_PUBLIC_API_BASE_URL_DEV?: string;
	EXPO_PUBLIC_API_BASE_URL_PROD?: string;

	APP_ENV?: string;
	EXPO_PUBLIC_APP_ENV?: string;
};

const API_PORT = 4000;
const API_BASE_PATH = "/api/v1";

type RuntimeEnvironment = "development" | "production";

function readExpoExtraConfig(): ExtraConfig {
	const extraFromExpoConfig = (Constants.expoConfig?.extra ?? null) as ExtraConfig | null;
	if (extraFromExpoConfig) return extraFromExpoConfig;

	// Expo Go / updates fallback shapes.
	const maybeConstants = Constants as any;
	const extraFromManifest = (maybeConstants?.manifest?.extra ?? null) as ExtraConfig | null;
	if (extraFromManifest) return extraFromManifest;

	const extraFromManifest2 = (maybeConstants?.manifest2?.extra?.expoClient?.extra ?? null) as ExtraConfig | null;
	if (extraFromManifest2) return extraFromManifest2;

	return {};
}

function normalizeBaseUrl(input: string): string {
	return String(input ?? "")
		.trim()
		.replace(/\/$/, "");
}

function withBasePath(base: string): string {
	const b = normalizeBaseUrl(base);
	if (!b) return b;
	return b.endsWith(API_BASE_PATH) ? b : `${b}${API_BASE_PATH}`;
}

function normalizeRuntimeEnvironment(value: unknown): RuntimeEnvironment {
	const raw = String(value ?? "")
		.trim()
		.toLowerCase();
	if (raw === "production" || raw === "prod") return "production";
	return "development";
}

function readEnvBaseUrl(env: RuntimeEnvironment, extra: ExtraConfig): string {
	if (env === "production") {
		const fromPublic = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_PROD ?? "");
		if (fromPublic) return fromPublic;

		const fromExtraPublic = normalizeBaseUrl(extra.EXPO_PUBLIC_API_BASE_URL_PROD ?? "");
		if (fromExtraPublic) return fromExtraPublic;

		const fromExtraLegacy = normalizeBaseUrl(extra.API_BASE_URL_PROD ?? "");
		if (fromExtraLegacy) return fromExtraLegacy;

		return "";
	}

	const fromPublic = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_DEV ?? "");
	if (fromPublic) return fromPublic;

	const fromExtraPublic = normalizeBaseUrl(extra.EXPO_PUBLIC_API_BASE_URL_DEV ?? "");
	if (fromExtraPublic) return fromExtraPublic;

	const fromExtraLegacy = normalizeBaseUrl(extra.API_BASE_URL_DEV ?? "");
	if (fromExtraLegacy) return fromExtraLegacy;

	return "";
}

export function resolveRuntimeEnvironment(): RuntimeEnvironment {
	const extra = readExpoExtraConfig();

	const explicitEnv = String(
		process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? extra.EXPO_PUBLIC_APP_ENV ?? extra.APP_ENV ?? "",
	).trim();
	if (explicitEnv) return normalizeRuntimeEnvironment(explicitEnv);

	// Fallback inference when env flags are unavailable at runtime:
	// If an explicit base URL is non-localhost, treat it as production.
	const explicitBaseUrl = normalizeBaseUrl(
		process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.EXPO_PUBLIC_API_BASE_URL ?? extra.API_BASE_URL ?? "",
	);
	if (explicitBaseUrl) {
		const lower = explicitBaseUrl.toLowerCase();
		const isLocal = lower.includes("://localhost") || lower.includes("://127.0.0.1") || lower.includes("://10.0.2.2");
		return isLocal ? "development" : "production";
	}

	return "development";
}

/**
 * Prefer EXPO_PUBLIC_* because it works across:
 * - dev-client
 * - EAS builds
 * - production
 *
 * Determinism rules:
 * - If EXPO_PUBLIC_APP_ENV=production => MUST resolve to a prod base URL (or explicit override).
 * - In production mode, NEVER fall back to hostUri-derived IP.
 */
function getConfiguredBaseUrl(runtimeEnv: RuntimeEnvironment): string {
	const extra = readExpoExtraConfig();

	// 1) single explicit URL (hard override)
	// If set, it wins in both dev and prod. Use sparingly.
	const hardOverride = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? "");
	if (hardOverride) return hardOverride;

	// 2) env-aware URLs (dev/prod switch)
	const fromRuntimeEnv = readEnvBaseUrl(runtimeEnv, extra);
	if (fromRuntimeEnv) return fromRuntimeEnv;

	// 3) app config extra fallback
	const ex1 = normalizeBaseUrl(extra.EXPO_PUBLIC_API_BASE_URL ?? "");
	if (ex1) return ex1;

	const legacy = normalizeBaseUrl(extra.API_BASE_URL ?? "");
	if (legacy) return legacy;

	return "";
}

function isSimulatorOnlyHost(url: string): boolean {
	const u = String(url ?? "").toLowerCase();
	return u.includes("://localhost") || u.includes("://127.0.0.1") || u.includes("://10.0.2.2");
}

function simulatorBaseUrl(): string {
	if (Platform.OS === "android") return `http://10.0.2.2:${API_PORT}${API_BASE_PATH}`;
	return `http://localhost:${API_PORT}${API_BASE_PATH}`;
}

function getDevHostIp(): string | null {
	/**
	 * Host IP discovery for DEV only.
	 * - hostUri may be missing in dev-client / prod
	 * - when present, it may be "192.168.x.x:8081" or "localhost:8081"
	 */
	const hostUri = Constants.expoConfig?.hostUri;
	if (!hostUri) return null;

	const host = hostUri.split(":")[0]?.trim();
	if (!host || host === "localhost" || host === "127.0.0.1") return null;

	return host;
}

function deviceBaseUrl(configured: string): string {
	// 1) If configured and not localhost/10.0.2.2, trust it (prod/dev device)
	const cfg = normalizeBaseUrl(configured);
	if (cfg && !isSimulatorOnlyHost(cfg)) return withBasePath(cfg);

	// 2) Dev convenience: derive from Expo host IP when available
	const ip = getDevHostIp();
	if (ip) return `http://${ip}:${API_PORT}${API_BASE_PATH}`;

	// 3) Last resort: simulator mapping (won't work on real device, but avoids empty baseURL)
	return simulatorBaseUrl();
}

export function resolveBaseUrl(): string {
	const runtimeEnv = resolveRuntimeEnvironment();
	const configured = getConfiguredBaseUrl(runtimeEnv);
	const configuredWithPath = withBasePath(configured);

	// A) If a non-localhost URL is explicitly configured, always prefer it.
	// Works for prod AND dev device testing.
	if (configuredWithPath && !isSimulatorOnlyHost(configuredWithPath)) {
		return configuredWithPath;
	}

	// B) Production mode must be explicit + stable.
	// If we are in prod mode but only have simulator-only hosts, we must still return
	// the configured (with base path) if present, otherwise fall back to PROD env var.
	// DO NOT use hostUri IP in production mode.
	if (runtimeEnv === "production") {
		if (configuredWithPath) return configuredWithPath;

		// Absolute last fallback: attempt prod env var again (defensive)
		const prod = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_PROD ?? "");
		return withBasePath(prod);
	}

	// C) Development mode behavior:
	// - physical device may use hostUri IP
	// - simulators use deterministic localhost/10.0.2.2 mapping
	if (Device.isDevice) return deviceBaseUrl(configured);

	return simulatorBaseUrl();
}
