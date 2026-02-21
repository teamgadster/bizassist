// BizAssist_mobile
// path: src/modules/inventory/posTile.contract.ts
//
// POS Tile flow routes + param keys (Create Item process)

export const POS_TILE_ROUTE = "/(app)/(tabs)/inventory/products/pos-tile" as const;
export const POS_TILE_PHOTO_LIBRARY_ROUTE = "/(app)/(tabs)/inventory/products/pos-tile-photo-library" as const;
export const POS_TILE_RECENTS_ROUTE = "/(app)/(tabs)/inventory/products/pos-tile-recents" as const;
export const POS_TILE_CROP_ROUTE = "/(app)/(tabs)/inventory/products/pos-tile-crop" as const;

export const DRAFT_ID_KEY = "draftId" as const;
export const RETURN_TO_KEY = "returnTo" as const;
export const ROOT_RETURN_TO_KEY = "rootReturnTo" as const;
export const LOCAL_URI_KEY = "localUri" as const;
export const TILE_LABEL_KEY = "tileLabel" as const;

export type PosTileInboundParams = {
	[DRAFT_ID_KEY]?: string;
	[RETURN_TO_KEY]?: string;
	[ROOT_RETURN_TO_KEY]?: string;
	[LOCAL_URI_KEY]?: string;
	[TILE_LABEL_KEY]?: string;
	mode?: "itemPhoto" | "posTile" | string;
	productId?: string;
};

export function normalizeReturnTo(value: unknown): string | null {
	const raw = typeof value === "string" ? value.trim() : "";
	if (!raw) return null;
	if (!raw.startsWith("/")) return null;
	return raw;
}
