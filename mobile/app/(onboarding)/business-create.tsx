// BizAssist_mobile path: app/(onboarding)/business-create.tsx
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
} from "react-native";
import { Modal, Portal, useTheme } from "react-native-paper";

import { BAICTAButton, BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAIActivityIndicator } from "@/components/system/BAIActivityIndicator";
import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISearchBar } from "@/components/ui/BAISearchBar";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import { BAITextInput } from "@/components/ui/BAITextInput";

import { useAppBusy } from "@/hooks/useAppBusy";

import { metaApi } from "@/modules/meta/meta.api";
import type { CountryMeta } from "@/modules/meta/meta.types";

import { businessApi } from "@/modules/business/business.api";
import type { CreateBusinessPayload } from "@/modules/business/business.types";

import { deriveDraftFromCountry, getDeviceTimeZone } from "@/modules/onboarding/businessSettingsDraft.derive";
import {
	clearBusinessSettingsDraft,
	getBusinessSettingsDraft,
	setBusinessSettingsDraft,
} from "@/modules/onboarding/businessSettingsDraft.storage";
import type { BusinessSettingsDraft } from "@/modules/onboarding/businessSettingsDraft.types";

import { mmkv, MMKVKeys } from "@/lib/storage/mmkv";
import { markOnboardingCompleted } from "@/modules/onboarding/onboarding.storage";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

type ApiErrorEnvelope = {
	success: false;
	message: string;
	code?: string;
	data?: {
		fields?: Record<string, string[] | string>;
	};
};

function getErrorEnvelope(e: unknown): ApiErrorEnvelope | null {
	const anyErr = e as any;
	const data = anyErr?.response?.data;
	if (!data || typeof data !== "object") return null;
	if (data.success !== false) return null;
	return data as ApiErrorEnvelope;
}

function normalizeSearch(s: string): string {
	return s.trim().toLowerCase();
}

type DefaultCountryPick = {
	country: CountryMeta | null;
	reason: "TIMEZONE_MATCH" | "PH_FALLBACK" | "FIRST_FALLBACK" | "NONE";
};

function pickDefaultCountry(countries: CountryMeta[]): DefaultCountryPick {
	if (!countries.length) return { country: null, reason: "NONE" };

	const deviceTz = getDeviceTimeZone();
	if (deviceTz) {
		const match = countries.find((c) => (c.timezones ?? []).includes(deviceTz));
		if (match) return { country: match, reason: "TIMEZONE_MATCH" };
	}

	const ph = countries.find((c) => c.countryCode === "PH");
	if (ph) return { country: ph, reason: "PH_FALLBACK" };

	return { country: countries[0] ?? null, reason: "FIRST_FALLBACK" };
}

function isTimezoneConfident(country: CountryMeta | null, tz: string | null | undefined): boolean {
	if (!country || !tz) return false;
	const deviceTz = getDeviceTimeZone();
	if (!deviceTz) return false;
	return tz === deviceTz && (country.timezones ?? []).includes(deviceTz);
}

/**
 * Extract business id from varying response shapes.
 * This avoids brittle coupling while still enforcing the invariant:
 * activeBusinessId MUST be set after successful creation.
 */
function extractCreatedBusinessId(result: unknown): string | null {
	// businessApi.createBusiness might return:
	// - { data: { id } }
	// - { data: { business: { id } } }
	// - { id }
	// - { business: { id } }
	// - { activeBusinessId }
	const r: any = result as any;

	const candidates = [
		r?.data?.activeBusinessId,
		r?.activeBusinessId,
		r?.data?.business?.id,
		r?.data?.id,
		r?.business?.id,
		r?.id,
	];

	for (const c of candidates) {
		if (typeof c === "string" && c.trim().length > 0) return c.trim();
	}

	return null;
}

export default function BusinessCreateScreen() {
	const theme = useTheme();
	const { withBusy, busy } = useAppBusy();

	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	// Persisted onboarding draft (country/currency/timezone)
	const [draft, setDraft] = useState<BusinessSettingsDraft | null>(null);

	// Country picker modal
	const [countryModalOpen, setCountryModalOpen] = useState(false);
	const [countrySearch, setCountrySearch] = useState("");

	// Timezone picker modal
	const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
	const [timezoneSearch, setTimezoneSearch] = useState("");

	/**
	 * One-shot confirm prompts:
	 * - Country: only if we couldn't confidently detect country by timezone.
	 * - Timezone: only if derived timezone fell back to first/UTC (i.e., not a device match).
	 */
	const didAutoPromptCountryConfirm = useRef(false);
	const didAutoPromptTimezoneConfirm = useRef(false);

	const countriesQuery = useQuery({
		queryKey: ["meta", "countries"],
		queryFn: async () => {
			const res = await metaApi.getCountries();
			return res.data ?? [];
		},
		staleTime: 24 * 60 * 60 * 1000,
	});

	const countries = useMemo<CountryMeta[]>(() => countriesQuery.data ?? [], [countriesQuery.data]);

	const selectedCountry: CountryMeta | null = useMemo(() => {
		if (!draft) return null;
		return countries.find((c) => c.countryCode === draft.countryCode) ?? null;
	}, [countries, draft]);

	// Hydrate draft on mount
	useEffect(() => {
		const saved = getBusinessSettingsDraft();
		if (saved) setDraft(saved);
	}, []);

	// If no saved draft, derive once countries load
	useEffect(() => {
		if (draft) return;
		if (!countriesQuery.isSuccess) return;

		const { country: def, reason } = pickDefaultCountry(countries);
		if (!def) return;

		const derived = deriveDraftFromCountry(def);
		setDraft(derived);
		setBusinessSettingsDraft(derived);

		// Auto-prompt confirm only if we didn't confidently detect via timezone
		if (reason !== "TIMEZONE_MATCH" && !didAutoPromptCountryConfirm.current) {
			didAutoPromptCountryConfirm.current = true;
			setCountryModalOpen(true);
		}
	}, [countriesQuery.isSuccess, countries, draft]);

	/**
	 * Timezone confirm (one-shot):
	 * If timezone was NOT confidently detected (device match), force a one-time confirm.
	 * Avoid opening on top of the country modal to reduce modal-stacking friction.
	 */
	useEffect(() => {
		if (!draft) return;
		if (!selectedCountry) return;
		if (countryModalOpen) return;
		if (timezoneModalOpen) return;
		if (didAutoPromptTimezoneConfirm.current) return;

		const confident = isTimezoneConfident(selectedCountry, draft.timezone);
		if (!confident) {
			didAutoPromptTimezoneConfirm.current = true;
			setTimezoneModalOpen(true);
		}
	}, [draft, selectedCountry, countryModalOpen, timezoneModalOpen]);

	const canSubmit = useMemo(() => {
		return (
			name.trim().length >= FIELD_LIMITS.businessNameMin &&
			!!draft?.countryCode &&
			!!draft?.currencyCode &&
			!!draft?.timezone
		);
	}, [name, draft]);

	const filteredCountries = useMemo(() => {
		const q = normalizeSearch(countrySearch);
		if (!q) return countries;
		return countries.filter((c) => {
			return (
				c.countryCode.toLowerCase().includes(q) ||
				c.name.toLowerCase().includes(q) ||
				c.currencyCode.toLowerCase().includes(q)
			);
		});
	}, [countries, countrySearch]);

	const timezoneOptions = useMemo(() => selectedCountry?.timezones ?? [], [selectedCountry]);

	const filteredTimezones = useMemo(() => {
		const q = normalizeSearch(timezoneSearch);
		if (!q) return timezoneOptions;
		return timezoneOptions.filter((tz) => tz.toLowerCase().includes(q));
	}, [timezoneOptions, timezoneSearch]);

	const setCountry = (country: CountryMeta) => {
		const next = deriveDraftFromCountry(country);
		setDraft(next);
		setBusinessSettingsDraft(next);

		// If timezone isn't a confident device match for this country, prompt once (after closing country modal).
		if (!didAutoPromptTimezoneConfirm.current) {
			const confident = isTimezoneConfident(country, next.timezone);
			if (!confident) {
				didAutoPromptTimezoneConfirm.current = true;
				// Defer opening timezone modal to next tick to avoid modal overlap.
				setTimeout(() => setTimezoneModalOpen(true), 0);
			}
		}
	};

	const setTimezone = (tz: string) => {
		if (!draft) return;
		const next: BusinessSettingsDraft = { ...draft, timezone: tz, timezoneIsAuto: false };
		setDraft(next);
		setBusinessSettingsDraft(next);
	};

	const submit = async () => {
		if (!canSubmit || busy.isBusy || !draft) return;

		setError(null);

		const payload: CreateBusinessPayload = {
			name: name.trim(),
			businessType: "GENERAL_RETAIL",
			countryCode: draft.countryCode,
			currencyCode: draft.currencyCode,
			timezone: draft.timezone,
		};

		try {
			const result = await withBusy("Creating your business…", async () => {
				return businessApi.createBusiness(payload);
			});

			/**
			 * CRITICAL INVARIANT:
			 * Immediately set activeBusinessId so Inventory/POS requests include X-Active-Business-Id.
			 */
			const createdBusinessId = extractCreatedBusinessId(result);
			if (createdBusinessId) {
				mmkv.set(MMKVKeys.activeBusinessId, createdBusinessId);
			}

			// Onboarding is complete on this device after successful business creation.
			markOnboardingCompleted();

			// Clear draft to prevent stale overrides.
			clearBusinessSettingsDraft();

			// Re-run system bootstrap now that we have a business context.
			router.replace("/(system)/bootstrap");
		} catch (e) {
			const env = getErrorEnvelope(e);

			if (env?.code === "VALIDATION_ERROR") {
				const fields = env.data?.fields ?? {};
				const nameErr = fields.name;
				const msg =
					typeof nameErr === "string"
						? nameErr
						: Array.isArray(nameErr)
							? nameErr[0]
							: env.message || "Validation error";
				setError(msg);
			} else if (env?.code === "BUSINESS_LIMIT_REACHED") {
				setError("You already created a business for this account.");
			} else if (env?.message) {
				setError(env.message);
			} else {
				setError("Failed to create business. Please try again.");
			}
		}
	};

	const fieldBorder = theme.colors.outlineVariant ?? theme.colors.outline;

	return (
		<KeyboardAvoidingView
			style={styles.kav}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
		>
			<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
				<View style={styles.kavInner}>
					<BAIScreen scroll contentContainerStyle={styles.screen}>
						<View style={styles.shell}>
							<BAISurface style={styles.container}>
								<BAIText variant='title'>Create your business</BAIText>
								<BAIText variant='body' muted>
									Select your country. Currency is derived automatically. Timezone controls reporting and day
									boundaries.
								</BAIText>

								<BAITextInput
									label='Business name'
									value={name}
									onChangeText={setName}
									maxLength={FIELD_LIMITS.businessName}
								/>

								{/* Country */}
								<View style={styles.group}>
									<BAIText variant='subtitle'>Country</BAIText>

									<Pressable
										onPress={() => setCountryModalOpen(true)}
										disabled={busy.isBusy || countriesQuery.isLoading}
										style={[styles.selector, { borderColor: fieldBorder }]}
									>
										{countriesQuery.isLoading ? (
											<View style={styles.inline}>
												<BAIActivityIndicator size='small' />
												<BAIText variant='body'>Loading countries…</BAIText>
											</View>
										) : selectedCountry ? (
											<View style={styles.inlineBetween}>
												<BAIText variant='body'>
													{selectedCountry.name} ({selectedCountry.countryCode})
												</BAIText>
												<BAIText variant='caption' muted>
													Change
												</BAIText>
											</View>
										) : (
											<BAIText variant='body'>Select country</BAIText>
										)}
									</Pressable>
								</View>

								{/* Currency (readonly, derived) */}
								<View style={styles.group}>
									<BAIText variant='subtitle'>Currency</BAIText>
									<View style={[styles.readonly, { borderColor: fieldBorder }]}>
										<BAIText variant='body'>{draft?.currencyCode ?? "—"}</BAIText>
										<BAIText variant='caption' muted>
											Auto
										</BAIText>
									</View>
									<BAIText variant='caption' muted>
										Currency is derived from country and is immutable for reporting correctness.
									</BAIText>
								</View>

								{/* Timezone */}
								<View style={styles.group}>
									<BAIText variant='subtitle'>Timezone</BAIText>

									<Pressable
										onPress={() => setTimezoneModalOpen(true)}
										disabled={busy.isBusy || !selectedCountry}
										style={[styles.selector, { borderColor: fieldBorder }]}
									>
										<View style={styles.inlineBetween}>
											<BAIText variant='body'>{draft?.timezone ?? "—"}</BAIText>
											<BAIText variant='caption' muted>
												Change
											</BAIText>
										</View>
									</Pressable>

									<BAIText variant='caption' muted>
										Timezone affects sales cutoffs, day boundaries, and audit timestamps.
									</BAIText>
								</View>

								{error && (
									<BAIText variant='caption' style={{ color: theme.colors.error }}>
										{error}
									</BAIText>
								)}

								<BAICTAButton disabled={busy.isBusy || !canSubmit} onPress={submit}>
									Create Business
								</BAICTAButton>
							</BAISurface>
						</View>

						{/* Country Picker */}
						<Portal>
							<Modal
								visible={countryModalOpen}
								onDismiss={() => setCountryModalOpen(false)}
								contentContainerStyle={styles.modalHost}
							>
								<BAISurface
									style={[
										styles.modalCard,
										{
											borderColor: fieldBorder,
											backgroundColor: theme.colors.surface,
										},
									]}
									padded={false}
								>
									<View style={styles.modalHeader}>
										<BAIText variant='title'>Select country</BAIText>
										<BAIText variant='caption' muted>
											Search and choose your business country.
										</BAIText>
									</View>

									<View style={styles.modalSearchWrap}>
										<BAISearchBar
											value={countrySearch}
											onChangeText={setCountrySearch}
											placeholder='Search'
											maxLength={FIELD_LIMITS.search}
											disabled={busy.isBusy}
										/>
									</View>

									<BAISurface padded={false} style={[styles.modalListShell, { borderColor: fieldBorder }]}>
										{countriesQuery.isError ? (
											<View style={styles.center}>
												<BAIText variant='body'>Failed to load countries.</BAIText>
											</View>
										) : filteredCountries.length === 0 ? (
											<View style={styles.center}>
												<BAIText variant='body' muted>
													No countries found.
												</BAIText>
											</View>
										) : (
											<FlatList
												data={filteredCountries}
												keyExtractor={(c) => c.countryCode}
												ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: fieldBorder }]} />}
												renderItem={({ item }) => {
													const isSelected = item.countryCode === selectedCountry?.countryCode;
													return (
														<Pressable
															onPress={() => {
																Keyboard.dismiss();
																setCountry(item);
																setCountryModalOpen(false);
																setCountrySearch("");
															}}
															style={({ pressed }) => [styles.modalRow, pressed ? styles.modalRowPressed : null]}
														>
															<View style={{ flex: 1 }}>
																<BAIText variant='body'>
																	{item.name} ({item.countryCode})
																</BAIText>
																<BAIText variant='caption' muted>
																	Currency: {item.currencyCode}
																</BAIText>
															</View>

															{isSelected ? (
																<BAIText variant='caption' style={{ color: theme.colors.primary }}>
																	Selected
																</BAIText>
															) : null}
														</Pressable>
													);
												}}
												style={styles.modalList}
												keyboardShouldPersistTaps='handled'
											/>
										)}
									</BAISurface>

									<View style={[styles.modalFooter, { borderTopColor: fieldBorder }]}>
										<BAICTAPillButton
											variant='outline'
											intent='neutral'
											onPress={() => setCountryModalOpen(false)}
											disabled={busy.isBusy}
											style={styles.modalCloseButton}
										>
											Close
										</BAICTAPillButton>
									</View>
								</BAISurface>
							</Modal>
						</Portal>

						{/* Timezone Picker */}
						<Portal>
							<Modal
								visible={timezoneModalOpen}
								onDismiss={() => setTimezoneModalOpen(false)}
								contentContainerStyle={styles.modalHost}
							>
								<BAISurface
									style={[
										styles.modalCard,
										{
											borderColor: fieldBorder,
											backgroundColor: theme.colors.surface,
										},
									]}
									padded={false}
								>
									<View style={styles.modalHeader}>
										<BAIText variant='title'>Select timezone</BAIText>
										<BAIText variant='caption' muted>
											Choose a timezone for reporting and timestamps.
										</BAIText>
									</View>

									<View style={styles.modalSearchWrap}>
										<BAISearchBar
											value={timezoneSearch}
											onChangeText={setTimezoneSearch}
											placeholder='Search'
											maxLength={FIELD_LIMITS.search}
											disabled={busy.isBusy}
										/>
									</View>

									<BAISurface padded={false} style={[styles.modalListShell, { borderColor: fieldBorder }]}>
										{!selectedCountry ? (
											<View style={styles.center}>
												<BAIText variant='body'>Select a country first.</BAIText>
											</View>
										) : filteredTimezones.length === 0 ? (
											<View style={styles.center}>
												<BAIText variant='body' muted>
													No timezones found.
												</BAIText>
											</View>
										) : (
											<FlatList
												data={filteredTimezones}
												keyExtractor={(tz) => tz}
												ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: fieldBorder }]} />}
												renderItem={({ item }) => {
													const isSelected = item === draft?.timezone;
													return (
														<Pressable
															onPress={() => {
																Keyboard.dismiss();
																setTimezone(item);
																setTimezoneModalOpen(false);
																setTimezoneSearch("");
															}}
															style={({ pressed }) => [styles.modalRow, pressed ? styles.modalRowPressed : null]}
														>
															<View style={{ flex: 1 }}>
																<BAIText variant='body'>{item}</BAIText>
																{isSelected ? (
																	<BAIText variant='caption' style={{ color: theme.colors.primary }}>
																		Selected
																	</BAIText>
																) : (
																	<BAIText variant='caption' muted>
																		{item === getDeviceTimeZone() ? "Device timezone" : " "}
																	</BAIText>
																)}
															</View>
														</Pressable>
													);
												}}
												style={styles.modalList}
												keyboardShouldPersistTaps='handled'
											/>
										)}
									</BAISurface>

									<View style={[styles.modalFooter, { borderTopColor: fieldBorder }]}>
										<BAICTAPillButton
											variant='outline'
											intent='neutral'
											onPress={() => setTimezoneModalOpen(false)}
											disabled={busy.isBusy}
											style={styles.modalCloseButton}
										>
											Close
										</BAICTAPillButton>
									</View>
								</BAISurface>
							</Modal>
						</Portal>
					</BAIScreen>
				</View>
			</TouchableWithoutFeedback>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	kav: {
		flex: 1,
	},
	kavInner: {
		flex: 1,
	},

	/**
	 * Layout governance:
	 * - Center the main card width.
	 * - Keep scroll working while keyboard is up.
	 */
	screen: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},

	shell: {
		width: "100%",
		maxWidth: 720,
		alignSelf: "center",
	},

	container: {
		padding: 18,
		gap: 12,
	},

	group: {
		gap: 8,
		marginTop: 6,
	},

	selector: {
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 12,
	},

	readonly: {
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	inline: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	inlineBetween: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},

	modalHost: {
		marginHorizontal: 16,
		alignSelf: "center",
		width: "100%",
		maxWidth: 720,
		paddingHorizontal: 10,
	},

	modalCard: {
		borderWidth: 1,
		borderRadius: 24,
		overflow: "hidden",
	},

	modalHeader: {
		paddingHorizontal: 14,
		paddingTop: 14,
		paddingBottom: 10,
		gap: 4,
	},

	modalSearchWrap: {
		paddingHorizontal: 14,
		paddingBottom: 8,
	},

	modalListShell: {
		borderWidth: 1,
		borderRadius: 12,
		overflow: "hidden",
		marginHorizontal: 14,
	},

	modalList: {
		maxHeight: 340,
	},

	modalRow: {
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
	},
	modalRowPressed: {
		opacity: 0.86,
	},

	sep: {
		height: 1,
		width: "100%",
		opacity: 0.5,
	},

	modalFooter: {
		flexDirection: "row",
		justifyContent: "flex-end",
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		marginTop: 10,
	},
	modalCloseButton: {
		minWidth: 120,
	},

	center: {
		padding: 16,
		alignItems: "center",
		justifyContent: "center",
	},
});
