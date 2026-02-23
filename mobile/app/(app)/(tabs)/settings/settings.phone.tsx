// BizAssist_mobile
// path: app/(app)/(tabs)/settings/settings.phone.tsx

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

import { ConfirmActionModal } from "@/components/settings/ConfirmActionModal";
import { useColorSchemeController } from "@/hooks/use-color-scheme";
import { useAppBusy } from "@/hooks/useAppBusy";
import { useAuth } from "@/modules/auth/AuthContext";

type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type SettingsRowBase = {
	key: string;
	title: string;
	subtitle?: string;
	onPress?: () => void;
	disabled?: boolean;
};

type SettingsRow = SettingsRowBase & { icon: MaterialIconName };

function Row({
	item,
	borderColor,
	onSurface,
	onSurfaceVariant,
	iconTint,
}: {
	item: SettingsRow;
	borderColor: string;
	onSurface: string;
	onSurfaceVariant: string;
	iconTint: string;
}) {
	const chevronVisible = !!item.onPress && !item.disabled;

	return (
		<Pressable
			onPress={item.onPress}
			disabled={!item.onPress || item.disabled}
			style={({ pressed }) => [
				styles.row,
				{ borderBottomColor: borderColor, opacity: item.disabled ? 0.55 : 1 },
				pressed && item.onPress ? styles.rowPressed : null,
			]}
		>
			<View style={styles.rowLeft}>
				<View style={[styles.iconCircle, { borderColor }]}>
					<MaterialCommunityIcons name={item.icon} size={20} color={iconTint} />
				</View>

				<View style={styles.rowText}>
					<BAIText variant='body' style={{ color: onSurface }}>
						{item.title}
					</BAIText>
					{item.subtitle ? (
						<BAIText variant='caption' style={{ color: onSurfaceVariant }}>
							{item.subtitle}
						</BAIText>
					) : null}
				</View>
			</View>

			{chevronVisible ? (
				<View style={styles.rowRight}>
					<MaterialCommunityIcons name='chevron-right' size={30} color={iconTint} />
				</View>
			) : null}
		</Pressable>
	);
}

function modeLabel(mode: "system" | "light" | "dark") {
	if (mode === "system") return "System";
	if (mode === "light") return "Light";
	return "Dark";
}

export default function SettingsPhoneScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { logout } = useAuth();
	const { withBusy, busy } = useAppBusy();
	const { mode } = useColorSchemeController();

	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const [logoutBusy, setLogoutBusy] = useState(false);

	// Idempotency guard (prevents double confirms / re-entrancy)
	const logoutInFlightRef = useRef(false);

	const isBusy = busy.isBusy || logoutBusy;

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const onSurface = theme.colors.onSurface;
	const onSurfaceVariant = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;
	const iconTint = onSurfaceVariant;

	const rows: SettingsRow[] = useMemo(
		() => [
			{
				key: "displayMode",
				title: "Display Mode",
				subtitle: modeLabel(mode),
				icon: "circle-half-full",
				onPress: () => router.push("/(app)/(tabs)/settings/display-mode"),
			},
			{
				key: "items",
				title: "Items",
				subtitle: "All items, services, and catalog definitions",
				icon: "package-variant-closed",
				onPress: () => router.push("/(app)/(tabs)/settings/items"),
			},
			{
				key: "devices",
				title: "Devices",
				subtitle: "Connected devices (v1: placeholder)",
				icon: "cellphone",
				onPress: () => {},
				disabled: true,
			},
			{
				key: "about",
				title: "About",
				subtitle: "Version, legal, and support",
				icon: "information-outline",
				onPress: () => {},
				disabled: true,
			},
		],
		[mode, router],
	);

	const handleLogoutPress = useCallback(() => {
		if (isBusy) return;
		setShowLogoutConfirm(true);
	}, [isBusy]);

	const handleDismissLogout = useCallback(() => {
		if (isBusy) return;
		setShowLogoutConfirm(false);
	}, [isBusy]);

	const handleConfirmLogout = useCallback(async () => {
		if (logoutInFlightRef.current) return;

		// Close modal immediately to avoid any tap-through/race
		setShowLogoutConfirm(false);

		logoutInFlightRef.current = true;
		setLogoutBusy(true);

		try {
			/**
			 * Correct logout governance:
			 * - Settings must NOT route to /(system)/bootstrap first (race condition).
			 * - AuthContext.logout() is the single source of truth:
			 *   clears tokens/state, then router.replace("/(auth)/index").
			 */
			await withBusy("Logging out…", async () => {
				await Promise.resolve(logout());
			});
		} finally {
			logoutInFlightRef.current = false;
			setLogoutBusy(false);
		}
	}, [logout, withBusy]);

	return (
		<BAIScreen tabbed>
			<View style={styles.screen}>
				<BAIText variant='title' style={styles.title}>
					Settings
				</BAIText>

				<BAISurface style={styles.card} padded={false}>
					{rows.map((item) => (
						<Row
							key={item.key}
							item={item}
							borderColor={borderColor}
							onSurface={onSurface}
							onSurfaceVariant={onSurfaceVariant}
							iconTint={iconTint}
						/>
					))}
				</BAISurface>

				<BAISurface style={styles.footer} padded>
					<BAIButton intent='neutral' variant='outline' onPress={handleLogoutPress} disabled={isBusy}>
						Log Out
					</BAIButton>

					<BAIText variant='caption' style={[styles.hint, { color: onSurfaceVariant }]}>
						Settings are intentionally minimal in v1.
					</BAIText>
				</BAISurface>
			</View>

			<ConfirmActionModal
				visible={showLogoutConfirm}
				title='Log out?'
				message='Are you sure you want to log out?'
				confirmLabel='Log Out'
				cancelLabel='Cancel'
				confirmIntent='danger'
				onDismiss={handleDismissLogout}
				onConfirm={handleConfirmLogout}
				disabled={isBusy}
			/>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, gap: 12, padding: 12 },
	title: { marginTop: 2 },

	card: { borderRadius: 18, overflow: "hidden" },

	row: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	rowPressed: { opacity: 0.85 },

	rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 10 },
	iconCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	rowText: { flex: 1, gap: 2 },
	rowRight: { alignItems: "center", justifyContent: "center" },

	footer: { borderRadius: 18, gap: 10 },
	hint: { opacity: 0.9 },
});
