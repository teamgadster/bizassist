// BizAssist_mobile
// path: src/lib/layout/useResponsiveLayout.ts

import { useWindowDimensions } from "react-native";

/**
 * Centralized responsive layout governance.
 *
 * This hook answers layout QUESTIONS only:
 * - Is this a tablet?
 * - What is the max readable content width?
 * - What horizontal padding should screens use?
 *
 * It must NOT compute final layout values.
 */

const TABLET_MIN_SHORT_EDGE = 768; // deliberate, conservative tablet breakpoint

export function useResponsiveLayout() {
	const { width, height } = useWindowDimensions();

	const isLandscape = width > height;
	const isTablet = Math.min(width, height) >= TABLET_MIN_SHORT_EDGE;

	/**
	 * Max readable content width.
	 * Used by BAIScreen to constrain centered content on tablets.
	 */
	const contentMaxWidth = isTablet ? 720 : undefined;

	/**
	 * Horizontal padding for screens.
	 * Tablets rely on centering + maxWidth instead of padding.
	 */
	const paddingX = isTablet ? 0 : 16;

	return {
		width,
		height,
		isTablet,
		isLandscape,
		contentMaxWidth,
		paddingX,
	};
}
