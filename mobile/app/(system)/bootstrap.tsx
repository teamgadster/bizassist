// path: app/(system)/bootstrap.tsx

import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";

import { useAppBackground } from "@/lib/theme/appBackground";
import { useAuth } from "@/modules/auth/AuthContext";
import { clearPostVerifyEmail, getPostVerifyEmail } from "@/modules/auth/auth.storage";
import { businessApi } from "@/modules/business/business.api";

const ROUTES = {
	// ✅ Auth cover (intent gate)
	cover: "/(auth)",

	// Existing screens remain valid routes
	login: "/(auth)/login",
	register: "/(auth)/register",
	onboarding: "/(onboarding)/welcome",

	// Canonical: tab node so Bottom Tabs render
	appHome: "/(app)/(tabs)/home",

	// Success screen should be a stable route; do NOT pass email via query param
	verifySuccess: "/(auth)/verify-success",
} as const satisfies Record<string, Href>;

export default function BootstrapScreen() {
	const bg = useAppBackground();
	const { isAuthenticated, isBootstrapping } = useAuth();

	// Prevent double-runs and stale async completions
	const runIdRef = useRef(0);
	const sessionFenceRef = useRef(0);

	const safeReplace = useMemo(() => {
		return (path: Href, runId: number) => {
			// Only the latest run may route
			if (runId !== runIdRef.current) return;
			router.replace(path);
		};
	}, []);

	useEffect(() => {
		// While auth is bootstrapping, do nothing.
		if (isBootstrapping) return;

		// New "session fence" tick every time we enter the bootstrap decision cycle
		sessionFenceRef.current += 1;
		const fenceTick = sessionFenceRef.current;

		const runId = ++runIdRef.current;
		let isActive = true;

		(async () => {
			const guardedReplace = (path: Href) => {
				if (!isActive) return;
				if (fenceTick !== sessionFenceRef.current) return;
				safeReplace(path, runId);
			};

			// 1) Not logged in → ✅ go to cover (NOT login)
			if (!isAuthenticated) {
				guardedReplace(ROUTES.cover);
				return;
			}

			// 2) Post-verify success should render once before business routing.
			// IMPORTANT: do NOT leak email via URL. The verify-success screen can read the stored value.
			const pendingEmail = getPostVerifyEmail();
			if (pendingEmail) {
				// Clear immediately so it is truly one-shot and cannot loop
				clearPostVerifyEmail();
				guardedReplace(ROUTES.verifySuccess);
				return;
			}

			// 3) Logged in → check if an active business exists
			try {
				const res = await businessApi.getActiveBusiness();

				// ✅ Defensive typing: businessApi may be typed as {} in this snapshot.
				const activeBusiness = (res as any)?.data?.activeBusiness ?? null;

				const hasBusiness = Boolean(activeBusiness?.id && String(activeBusiness.id).trim().length > 0);

				guardedReplace(hasBusiness ? ROUTES.appHome : ROUTES.onboarding);
			} catch {
				// Network/API failure → drive onboarding funnel (safe default)
				guardedReplace(ROUTES.onboarding);
			}
		})();

		return () => {
			isActive = false;
		};
	}, [isAuthenticated, isBootstrapping, safeReplace]);

	// Never return null from a system gate — return a stable themed surface
	return <View style={{ flex: 1, backgroundColor: bg }} />;
}
