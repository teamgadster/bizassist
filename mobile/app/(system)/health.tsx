// BizAssist_mobile path: app/(system)/health.tsx
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIButton } from "@/components/ui/BAIButton";
import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAICard } from "@/components/ui/BAICard";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAIText } from "@/components/ui/BAIText";
import apiClient from "@/lib/api/httpClient";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type HealthResponse = {
	status?: string;
	message?: string;
	version?: string;
	env?: string;
	uptime?: number;
	timestamp?: string;
	[key: string]: any;
};

const fetchHealth = async (): Promise<HealthResponse> => {
	const res = await apiClient.get("/health");
	return res.data;
};

type SupabaseStorageStatus = {
	ok: boolean;
	message: string;
	buckets?: string[];
};

const fetchSupabaseStorageStatus = async (): Promise<SupabaseStorageStatus> => {
	if (!isSupabaseConfigured) {
		return {
			ok: false,
			message: "not configured (missing EXPO_PUBLIC_SUPABASE_URL / key)",
		};
	}

	try {
		const supabase = getSupabase();
		const { data, error } = await supabase.storage.listBuckets();

		if (error) {
			return { ok: false, message: error.message };
		}

		return {
			ok: true,
			message: "reachable",
			buckets: (data ?? []).map((b) => b.name),
		};
	} catch (e: any) {
		return { ok: false, message: e?.message ?? "unknown error" };
	}
};

export default function HealthScreen() {
	const theme = useTheme();

	const { data, isLoading, isError, refetch, isFetching } = useQuery<HealthResponse>({
		queryKey: ["health"],
		queryFn: fetchHealth,
		staleTime: 60_000,
	});

	const supa = useQuery<SupabaseStorageStatus>({
		queryKey: ["supabase", "storage"],
		queryFn: fetchSupabaseStorageStatus,
		enabled: isSupabaseConfigured,
		retry: false,
		staleTime: 60_000,
	});

	const apiStatus = data?.status?.toLowerCase();
	const isApiHealthy = apiStatus === "ok" || apiStatus === "healthy";

	const statusColor = isApiHealthy ? theme.colors.primary : theme.colors.error;

	const supaOk = Boolean(supa.data?.ok);
	const supaStatusText = !isSupabaseConfigured ? "not configured" : supaOk ? "reachable" : "unreachable";

	const supaStatusColor = !isSupabaseConfigured
		? theme.colors.onSurfaceVariant
		: supaOk
			? theme.colors.primary
			: theme.colors.error;

	return (
		<BAIScreen>
			<View style={styles.header}>
				<BAIText variant='title'>API Health</BAIText>
				<BAIText variant='subtitle' muted>
					Live status of the BizAssist API connection.
				</BAIText>
			</View>

			{/* API HEALTH */}
			<BAICard>
				<View style={styles.cardRow}>
					<BAIText variant='subtitle'>Status</BAIText>
					{isLoading || isFetching ? (
						<BAIActivityIndicator />
					) : (
						<BAIText variant='subtitle' style={{ color: statusColor }}>
							{data?.status ?? (isError ? "unreachable" : "unknown")}
						</BAIText>
					)}
				</View>

				<View style={styles.cardRow}>
					<BAIText variant='body' muted>
						Message
					</BAIText>
					<BAIText variant='body'>{data?.message ?? (isError ? "Failed to reach API" : "—")}</BAIText>
				</View>

				<View style={styles.actionsRow}>
					<BAIButton variant='ghost' onPress={() => refetch()} disabled={isFetching}>
						{isFetching ? "Refreshing..." : "Refresh"}
					</BAIButton>
				</View>
			</BAICard>

			{/* SUPABASE STORAGE */}
			<BAICard>
				<View style={styles.cardRow}>
					<BAIText variant='subtitle'>Supabase Storage</BAIText>
					{supa.isFetching ? (
						<BAIActivityIndicator />
					) : (
						<BAIText variant='subtitle' style={{ color: supaStatusColor }}>
							{supaStatusText}
						</BAIText>
					)}
				</View>

				<View style={styles.cardRow}>
					<BAIText variant='body' muted>
						Buckets
					</BAIText>
					<BAIText variant='body'>{!isSupabaseConfigured ? "—" : (supa.data?.buckets ?? []).join(", ") || "—"}</BAIText>
				</View>
			</BAICard>

			{/* RAW PAYLOAD */}
			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
				<BAICard>
					<BAIText variant='caption' muted>
						{JSON.stringify(data ?? {}, null, 2)}
					</BAIText>
				</BAICard>
			</ScrollView>
		</BAIScreen>
	);
}

const styles = StyleSheet.create({
	header: {
		marginBottom: 16,
	},
	cardRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	actionsRow: {
		marginTop: 12,
		flexDirection: "row",
		justifyContent: "flex-end",
	},
	scroll: {
		marginTop: 8,
	},
	scrollContent: {
		paddingBottom: 24,
	},
});
