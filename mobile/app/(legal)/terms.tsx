// BizAssist_mobile
// path: app/(legal)/terms.tsx
// NOTE: Content unchanged. Refactor adds a Top App Bar (back + title) and aligns layout with BizAssist design tokens.

import React, { useMemo } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Appbar, useTheme } from "react-native-paper";

import { BAIScreen } from "@/components/ui/BAIScreen";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";

const CONTENT_MAX_WIDTH = 720;

function LegalDocShell({
	screenTitle,
	title,
	subTitle,
	lastUpdated,
	children,
}: {
	screenTitle: string;
	title: string;
	subTitle: string;
	lastUpdated: string;
	children: React.ReactNode;
}) {
	const router = useRouter();
	const theme = useTheme();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
	const appbarBg = theme.colors.surface;

	const cardStyle = useMemo<StyleProp<ViewStyle>>(
		() => [
			styles.card,
			{
				borderColor,
			},
		],
		[borderColor]
	);

	const dividerStyle = useMemo<StyleProp<ViewStyle>>(
		() => [
			styles.headerDivider,
			{
				backgroundColor: borderColor,
			},
		],
		[borderColor]
	);

	return (
		<View style={styles.root}>
			<Appbar.Header
				mode='center-aligned'
				style={[styles.appbar, { backgroundColor: appbarBg, borderBottomColor: borderColor }]}
				elevated={false}
			>
				<Appbar.BackAction onPress={() => router.back()} accessibilityLabel='Go back' />
				<Appbar.Content title={screenTitle} />
			</Appbar.Header>

			<BAIScreen padded={false} scroll contentContainerStyle={styles.screenContent} safeTop={false}>
				<View style={styles.outer}>
					<View style={styles.container}>
						<BAISurface style={cardStyle}>
							{/* Title block */}
							<View style={styles.titleBlock}>
								<BAIText variant='title'>{title}</BAIText>

								<BAIText variant='subtitle' style={styles.subTitle}>
									{subTitle}
								</BAIText>

								<BAIText variant='caption' style={styles.meta}>
									{lastUpdated}
								</BAIText>
							</View>

							<View style={dividerStyle} />

							{children}
						</BAISurface>
					</View>
				</View>
			</BAIScreen>
		</View>
	);
}

export default function TermsScreen() {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	return (
		<LegalDocShell
			screenTitle='Terms & Conditions'
			title='Terms of Service'
			subTitle='BizAssist AI — Terms of Service'
			lastUpdated='Last Updated: December 2025'
		>
			{/* Intro */}
			<BAIText variant='body' style={styles.paragraph}>
				These Terms of Service (“Terms”) govern your access to and use of the BizAssist AI mobile application and
				related services (collectively, the “Service”). By creating an account, accessing, or using the Service, you
				agree to be bound by these Terms. If you do not agree with these Terms, you must not use the Service.
			</BAIText>

			{/* 1. Eligibility */}
			<BAIText variant='title' style={styles.sectionTitle}>
				1. Eligibility
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				You may use the Service only if you:
				{"\n"}• Are at least 18 years of age (or the age of majority in your jurisdiction); and
				{"\n"}• Provide accurate, current, and complete registration information.
				{"\n\n"}
				The Service is intended for legitimate business use and may not be used where prohibited by applicable law.
			</BAIText>

			{/* 2. Accounts */}
			<BAIText variant='title' style={styles.sectionTitle}>
				2. Accounts
			</BAIText>

			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				2.1 Account Creation
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				To use the Service, you must create an account by providing your first name, last name, email address, and
				password, and by completing any required verification steps. You agree to keep your credentials confidential and
				to notify us promptly of any suspected unauthorized use of your account.
			</BAIText>

			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				2.2 Business Ownership
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				The first registered user associated with a business becomes the primary business account owner (“Owner”).
				Additional staff or users may only be added to the business account through the Owner or an authorized
				administrator.
			</BAIText>

			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				2.3 Account Security
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				You are responsible for all activity that occurs under your account. BizAssist AI is not liable for any loss or
				damage arising from your failure to maintain the security of your login credentials. You should notify us
				immediately if you suspect unauthorized access or use of your account.
			</BAIText>

			{/* Section divider */}
			<View style={[styles.sectionDivider, { backgroundColor: borderColor }]} />

			{/* 3. Subscriptions and Payments */}
			<BAIText variant='title' style={styles.sectionTitle}>
				3. Subscriptions and Payments
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				BizAssist AI may offer access to different modules and features through paid subscriptions, which may include:
				{"\n"}• Point-of-Sale (POS) module subscriptions
				{"\n"}• Inventory module subscriptions
				{"\n"}• Optional bundled or promotional offers
				{"\n"}• Localized regional pricing
				{"\n"}• Limited free trial periods
				{"\n\n"}
				Subscriptions and in-app purchases are processed through mobile app stores operated by third parties (such as
				the Apple App Store and Google Play Store). Your use of those billing channels is subject to the applicable
				store’s terms and conditions. Unless required by law, fees and charges are non-refundable.
			</BAIText>

			{/* 4. Use of the Service */}
			<BAIText variant='title' style={styles.sectionTitle}>
				4. Use of the Service
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
				{"\n"}• Use the Service for any illegal, fraudulent, or unauthorized purposes;
				{"\n"}• Circumvent or interfere with any security or access-control features;
				{"\n"}• Copy, modify, decompile, disassemble, or reverse-engineer any part of the Service; or
				{"\n"}• Upload, transmit, or store any content that is unlawful, infringing, or violates the rights of any third
				party.
				{"\n\n"}
				BizAssist AI may suspend, restrict, or terminate your access to the Service if we reasonably believe that you
				have violated these Terms or engaged in harmful or abusive conduct.
			</BAIText>

			{/* 5. AI Features */}
			<BAIText variant='title' style={styles.sectionTitle}>
				5. AI Features
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				The Service may include AI-powered features designed to support insights, recommendations, automations, and
				workflow efficiencies. AI-generated outputs may not always be accurate, complete, or appropriate for every
				situation, and you remain responsible for reviewing and validating any decisions based on such outputs.
				{"\n\n"}
				User data processed by AI features is used solely to provide and improve the Service and is not used to train
				external or public AI models.
			</BAIText>

			{/* Section divider */}
			<View style={[styles.sectionDivider, { backgroundColor: borderColor }]} />

			{/* 6. Data and Privacy */}
			<BAIText variant='title' style={styles.sectionTitle}>
				6. Data and Privacy
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				Your use of the Service is also governed by the BizAssist AI Privacy Policy, which describes how we collect,
				use, and protect your information. By using the Service, you acknowledge that we may process your data as
				described in the Privacy Policy in order to operate, maintain, and improve the Service and comply with legal
				obligations.
			</BAIText>

			{/* 7. Intellectual Property */}
			<BAIText variant='title' style={styles.sectionTitle}>
				7. Intellectual Property
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				All software, content, designs, logos, trade names, and other materials made available through the Service are
				owned by BizAssist AI or its licensors and are protected by intellectual property and other laws. You are
				granted a limited, non-exclusive, non-transferable, revocable license to use the Service solely for your
				internal business purposes and in accordance with these Terms. No other rights are granted.
			</BAIText>

			{/* 8. Service Availability and Modifications */}
			<BAIText variant='title' style={styles.sectionTitle}>
				8. Service Availability and Modifications
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				We aim to provide a reliable Service but do not guarantee uninterrupted or error-free operation. We may perform
				maintenance, updates, or modifications to the Service from time to time, which may temporarily affect
				availability. We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with
				or without notice.
			</BAIText>

			{/* 9. Limitation of Liability */}
			<BAIText variant='title' style={styles.sectionTitle}>
				9. Limitation of Liability
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				To the maximum extent permitted by law:
				{"\n"}• The Service is provided on an “AS IS” and “AS AVAILABLE” basis; and
				{"\n"}• BizAssist AI and its affiliates, officers, employees, and agents are not liable for any indirect,
				incidental, consequential, special, or punitive damages, including loss of profits, revenue, data, or business
				interruption, arising out of or related to your use of or inability to use the Service.
				{"\n\n"}
				To the extent any liability is found despite the foregoing, our aggregate liability to you for all claims
				arising out of or relating to the Service or these Terms will not exceed the total amount of subscription fees
				you paid for the Service in the twelve (12) months immediately preceding the event giving rise to the claim.
			</BAIText>

			{/* 10. Termination */}
			<BAIText variant='title' style={styles.sectionTitle}>
				10. Termination
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				You may stop using the Service at any time. We may suspend or terminate your access to the Service, in whole or
				in part, if you violate these Terms, if your use of the Service creates risk or potential legal exposure for us,
				or if we discontinue the Service. Upon termination, your right to access and use of the Service will cease, but
				any provisions of these Terms that by their nature should survive termination will continue to apply.
			</BAIText>

			{/* 11. Changes to These Terms */}
			<BAIText variant='title' style={styles.sectionTitle}>
				11. Changes to These Terms
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				We may update these Terms from time to time to reflect changes in the Service, our business, or applicable laws.
				When we make material changes, we will update the “Last Updated” date and may provide additional notice within
				the app or by email. Your continued use of the Service after any changes become effective constitutes your
				acceptance of the revised Terms.
			</BAIText>
		</LegalDocShell>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},

	appbar: {
		borderBottomWidth: 0.5,
	},

	screenContent: {
		flexGrow: 1,
		paddingBottom: 24,
	},

	outer: {
		flexGrow: 1,
		paddingHorizontal: 16,
		paddingVertical: 24,
	},
	container: {
		width: "100%",
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: "center",
		gap: 16,
	},

	card: {
		borderRadius: 16,
		borderWidth: 1,
		paddingHorizontal: 20,
		paddingVertical: 20,
	},

	titleBlock: {
		marginBottom: 12,
	},
	headerDivider: {
		height: 1,
		borderRadius: 999,
		marginBottom: 12,
	},

	subTitle: {
		marginTop: 8,
	},
	meta: {
		marginTop: 4,
		opacity: 0.7,
	},

	sectionTitle: {
		marginTop: 24,
		marginBottom: 4,
	},
	subSectionTitle: {
		marginTop: 16,
		marginBottom: 4,
	},
	paragraph: {
		marginTop: 4,
		lineHeight: 22,
	},

	sectionDivider: {
		height: 1,
		marginVertical: 20,
		borderRadius: 999,
		opacity: 0.9,
	},
});
