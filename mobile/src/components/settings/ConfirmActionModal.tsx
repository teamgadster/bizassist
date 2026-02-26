// BizAssist_mobile path: src/components/system/ConfirmActionModal.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type TextStyle } from "react-native";
import { Modal, Portal, useTheme } from "react-native-paper";

import { BAICTAPillButton } from "@/components/ui/BAICTAButton";
import { BAISurface } from "@/components/ui/BAISurface";
import { BAIText } from "@/components/ui/BAIText";
import type { BAIButtonIntent } from "@/theme/baiColors";

export function ConfirmActionModal({
	visible,
	title,
	message,
	confirmLabel,
	cancelLabel = "Cancel",
	confirmIntent = "danger",
	cancelIntent = "neutral",
	onDismiss,
	onConfirm,
	onCancel,
	disabled,
	confirmLabelStyle,
	cancelLabelStyle,
}: {
	visible: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel?: string;
	confirmIntent?: BAIButtonIntent;
	cancelIntent?: BAIButtonIntent;
	onDismiss: () => void;
	onConfirm: () => void;
	onCancel?: () => void;
	disabled?: boolean;
	confirmLabelStyle?: TextStyle;
	cancelLabelStyle?: TextStyle;
}) {
	const theme = useTheme();

	const surface = theme.colors.surface;
	const surfaceVariant = theme.colors.surfaceVariant ?? theme.colors.surface;
	const outline = theme.colors.outlineVariant ?? theme.colors.outline;
	const onSurface = theme.colors.onSurface;
	const onSurfaceVariant = theme.colors.onSurfaceVariant;

	return (
		<Portal>
			<Modal
				visible={visible}
				onDismiss={() => {
					// Governance: non-dismissable via backdrop/back.
				}}
				dismissable={false}
				dismissableBackButton={false}
				contentContainerStyle={styles.modalHost}
			>
				<BAISurface style={[styles.modalCard, { backgroundColor: surface, borderColor: outline }]} padded={false}>
					<View style={styles.modalHeaderRow}>
						<BAIText variant='title' style={{ color: onSurface }}>
							{title}
						</BAIText>

						<Pressable
							onPress={onDismiss}
							disabled={!!disabled}
							accessibilityRole='button'
							accessibilityLabel='Close'
							style={({ pressed }) => [
								styles.closeBtn,
								{
									borderColor: outline,
									backgroundColor: surfaceVariant,
									opacity: !disabled && pressed ? 0.85 : disabled ? 0.55 : 1,
								},
							]}
						>
							<MaterialCommunityIcons name='close' size={18} color={onSurfaceVariant} />
						</Pressable>
					</View>

					<BAIText variant='body' style={[styles.modalSubtitle, { color: onSurfaceVariant }]}>
						{message}
					</BAIText>

					<View style={styles.modalActions}>
						<BAICTAPillButton
							intent={cancelIntent}
							variant='outline'
							onPress={onCancel ?? onDismiss}
							disabled={!!disabled}
							size='md'
							style={styles.actionBtnWrap}
							contentStyle={styles.actionBtnContent}
							labelStyle={cancelLabelStyle}
						>
							{cancelLabel}
						</BAICTAPillButton>

						<BAICTAPillButton
							intent={confirmIntent}
							variant='solid'
							onPress={onConfirm}
							disabled={!!disabled}
							size='md'
							style={styles.actionBtnWrap}
							contentStyle={styles.actionBtnContent}
							labelStyle={confirmLabelStyle}
						>
							{confirmLabel}
						</BAICTAPillButton>
					</View>
				</BAISurface>
			</Modal>
		</Portal>
	);
}

const styles = StyleSheet.create({
	modalHost: { paddingHorizontal: 16 },
	modalCard: {
		borderRadius: 22,
		overflow: "hidden",
		borderWidth: StyleSheet.hairlineWidth,
		padding: 18,
	},
	modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
	modalSubtitle: { marginTop: 10, marginBottom: 18 },
	modalActions: { flexDirection: "row", gap: 12 },
	actionBtnWrap: { flex: 1, borderRadius: 999 },
	actionBtnContent: { height: 48 },
});
