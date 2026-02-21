// BizAssist_mobile path: src/components/ui/BAIText.tsx
import React, { useMemo } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "react-native-paper";

export type BAITextVariant = "title" | "subtitle" | "body" | "caption";

type Props = TextProps & {
	variant?: BAITextVariant;
	muted?: boolean;
	children?: React.ReactNode;
};

/**
 * Convert unknown ReactNode into a safe renderable node.
 * - Strings/numbers are returned as-is.
 * - Arrays are mapped recursively.
 * - Objects (including {code,message}) are rendered as a string (message preferred).
 * This prevents runtime crashes when an error envelope is passed as a child.
 */
function normalizeChildren(node: React.ReactNode): React.ReactNode {
	if (node === null || node === undefined || typeof node === "boolean") return null;

	if (typeof node === "string" || typeof node === "number") return node;

	if (Array.isArray(node)) return node.map(normalizeChildren);

	// React element is valid
	if (typeof node === "object" && (node as any)?.$$typeof) return node;

	// Plain object: try to unwrap common error envelope shapes
	if (typeof node === "object") {
		const anyNode = node as any;

		// Preferred: { message: "..." }
		if (typeof anyNode?.message === "string") return anyNode.message;

		// Sometimes: { code: "...", message: "..." } or nested
		if (typeof anyNode?.code === "string" && typeof anyNode?.message === "string") return anyNode.message;

		// Fallback: JSON string (safe, non-crashing)
		try {
			return JSON.stringify(anyNode);
		} catch {
			return String(anyNode);
		}
	}

	// Functions/symbols: stringify
	return String(node);
}

export function BAIText({ variant = "body", muted = false, style, children, ...rest }: Props) {
	const theme = useTheme();

	const baseStyle = useMemo<TextStyle>(() => {
		const color = muted ? (theme.colors.onSurfaceVariant ?? theme.colors.onSurface) : theme.colors.onSurface;

		switch (variant) {
			case "title":
				return { fontSize: 20, fontWeight: "700", color };
			case "subtitle":
				return { fontSize: 16, fontWeight: "600", color };
			case "caption":
				return { fontSize: 12, fontWeight: "400", color };
			case "body":
			default:
				return { fontSize: 14, fontWeight: "400", color };
		}
	}, [muted, theme.colors.onSurface, theme.colors.onSurfaceVariant, variant]);

	const safeChildren = useMemo(() => normalizeChildren(children), [children]);

	return (
		<Text {...rest} style={[baseStyle, style]}>
			{safeChildren}
		</Text>
	);
}
