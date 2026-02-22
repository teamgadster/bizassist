// BizAssist_mobile
// path: app/(legal)/privacy.tsx
// NOTE: Content unchanged. Refactor adds a Top App Bar (back + title) and aligns layout with BizAssist design tokens.

import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

import { BAIInlineHeaderScaffold } from "@/components/ui/BAIInlineHeaderScaffold";
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
	const theme = useTheme();

	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	const cardStyle = useMemo<StyleProp<ViewStyle>>(
		() => [
			styles.card,
			{
				borderColor,
			},
		],
		[borderColor],
	);

	const dividerStyle = useMemo<StyleProp<ViewStyle>>(
		() => [
			styles.headerDivider,
			{
				backgroundColor: borderColor,
			},
		],
		[borderColor],
	);

	return (
		<BAIInlineHeaderScaffold title={screenTitle} variant='back'>
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
		</BAIInlineHeaderScaffold>
	);
}

export default function PrivacyScreen() {
	const theme = useTheme();
	const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;

	return (
		<LegalDocShell
			screenTitle='Privacy & Data'
			title='Privacy Policy'
			subTitle='BizAssist AI — Privacy Policy'
			lastUpdated='Last Updated: December 2025'
		>
			{/* Intro */}
			<BAIText variant='body' style={styles.paragraph}>
				BizAssist AI (“we”, “our”, “us”) respects your privacy and is committed to protecting your personal information.
				This Privacy Policy explains how we collect, use, store, and protect your data when you use the BizAssist AI
				mobile application and related services (the “Service”). By using the Service, you agree to the practices
				described in this Policy.
			</BAIText>

			{/* 1. Information We Collect */}
			<BAIText variant='title' style={styles.sectionTitle}>
				1. Information We Collect
			</BAIText>

			{/* 1.1 Personal Info */}
			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				1.1 Personal Information
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				• First name and last name{"\n"}• Email address{"\n"}• Password (securely hashed and never stored in plain text)
				{"\n"}• Profile images and media files (stored in secure third-party cloud storage)
			</BAIText>

			{/* 1.2 Business Info */}
			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				1.2 Business Information
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				• Business name{"\n"}• Business type or category{"\n"}• Staff information and roles (as managed by the business
				owner or administrators)
			</BAIText>

			{/* 1.3 Usage Data */}
			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				1.3 Usage Data
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				• Device type and basic device information{"\n"}• Technical logs for debugging, performance, and security{"\n"}•
				Feature usage and interaction data to help improve the Service
			</BAIText>

			{/* 1.4 App Payments */}
			<BAIText variant='subtitle' style={styles.subSectionTitle}>
				1.4 App Payments
			</BAIText>
			<BAIText variant='body' style={styles.paragraph}>
				In-app purchases and subscriptions are processed by the Apple App Store and Google Play Store. BizAssist AI does
				not store or process your payment card details directly.
			</BAIText>

			{/* Section divider */}
			<View style={[styles.sectionDivider, { backgroundColor: borderColor }]} />

			{/* 2. How We Use Your Information */}
			<BAIText variant='title' style={styles.sectionTitle}>
				2. How We Use Your Information
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				We use the information we collect to:
				{"\n"}• Provide, operate, and maintain the Service
				{"\n"}• Secure and protect user accounts and business data
				{"\n"}• Personalize and enhance your experience
				{"\n"}• Enable POS, Inventory, and AI-driven features
				{"\n"}• Monitor performance and improve product reliability
				{"\n"}• Send important security, account, and service notifications
				{"\n"}• Process subscriptions and manage user access
				{"\n"}• Comply with applicable laws, regulations, and legal processes
			</BAIText>

			{/* 3. How We Protect Your Information */}
			<BAIText variant='title' style={styles.sectionTitle}>
				3. How We Protect Your Information
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				We implement strict security measures to protect your data, including:
				{"\n"}• Encrypted data transmission
				{"\n"}• Secure credential handling
				{"\n"}• Controlled, role-based access permissions
				{"\n"}• Secure cloud storage for business and media data
				{"\n"}• Ongoing system and security monitoring
				{"\n\n"}
				We do not sell your personal information.
			</BAIText>

			{/* Section divider */}
			<View style={[styles.sectionDivider, { backgroundColor: borderColor }]} />

			{/* 4. How We Share Your Data */}
			<BAIText variant='title' style={styles.sectionTitle}>
				4. How We Share Your Data
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				We may share information only with trusted third-party service providers who support the operation and delivery
				of the Service, such as cloud infrastructure providers, analytics tools, communication services, and billing
				platforms. These providers are permitted to process your data solely to perform services on our behalf and are
				required to handle it securely.
				{"\n\n"}
				We may also disclose information when required to comply with legal obligations, enforce our terms, protect the
				rights and safety of our users, or respond to lawful requests from public authorities.
				{"\n\n"}
				We never sell or rent your personal information to third parties.
			</BAIText>

			{/* 5. Data Retention */}
			<BAIText variant='title' style={styles.sectionTitle}>
				5. Data Retention
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				We retain your information for as long as your account is active or as needed to provide the Service and meet
				our legal, tax, and accounting obligations.
				{"\n\n"}
				If you request account deletion:
				{"\n"}• Your personal account data is deleted or anonymized after verification, subject to legal retention
				requirements.
				{"\n"}• Business records (including POS and inventory history) remain available to the business owner or account
				administrators, where appropriate.
				{"\n"}• Staff links and access to the business account are removed.
			</BAIText>

			{/* 6. AI Data Usage */}
			<BAIText variant='title' style={styles.sectionTitle}>
				6. AI Data Usage
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				We use AI features to generate insights, automate workflows, and support decision-making within the BizAssist AI
				ecosystem. AI models operate on your data only to provide features inside the Service.
				{"\n\n"}
				Your data is not used to train external or public AI models.
			</BAIText>

			{/* 7. Your Rights */}
			<BAIText variant='title' style={styles.sectionTitle}>
				7. Your Rights
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				Depending on your region and applicable law, you may have the right to:
				{"\n"}• Request access to the personal information we hold about you
				{"\n"}• Request correction or update of inaccurate or incomplete information
				{"\n"}• Request deletion of certain personal data, subject to legal or contractual obligations
				{"\n"}• Review the types of data we collect and how it is used
				{"\n"}• Opt out of certain non-essential analytics or communications
				{"\n\n"}
				To exercise these rights, you can contact us using the details provided in the “Contact Us” section.
			</BAIText>

			{/* 8. Children’s Privacy */}
			<BAIText variant='title' style={styles.sectionTitle}>
				8. Children’s Privacy
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				The Service is not intended for children under 13 years of age (or under 16 where local law provides additional
				protections). We do not knowingly collect personal information from children. If we become aware that a child
				has provided personal information, we will take steps to delete it.
			</BAIText>

			{/* 9. Changes to This Policy */}
			<BAIText variant='title' style={styles.sectionTitle}>
				9. Changes to This Policy
			</BAIText>

			<BAIText variant='body' style={styles.paragraph}>
				We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or
				applicable laws. When we make material changes, we will update the “Last Updated” date and may provide
				additional notice through the app or by email.
				{"\n\n"}
				Your continued use of the Service after an update becomes effective constitutes your acceptance of the revised
				Policy.
			</BAIText>
		</LegalDocShell>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
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
