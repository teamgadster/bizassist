// path: src/theme/baiRadius.ts

/**
 * Single source of truth for radius tokens across BizAssist.
 * Do NOT redefine baiRadius anywhere else (ex: baiTheme.ts).
 */
export const baiRadius = {
	xs: 8,
	sm: 18,
	md: 22,
	lg: 26,
	xl: 32,
} as const;

export type BaiRadiusKey = keyof typeof baiRadius;
