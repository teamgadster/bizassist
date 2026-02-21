// path: src/modules/inventory/inventory.pagination.ts
export type InventoryCursor = { createdAt: Date; id: string };

export function encodeCursor(cursor: InventoryCursor): string {
	const raw = JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id });
	return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string): InventoryCursor | null {
	if (!cursor) return null;
	try {
		const raw = Buffer.from(cursor, "base64url").toString("utf8");
		const obj = JSON.parse(raw) as { createdAt: string; id: string };
		const createdAt = new Date(obj.createdAt);
		if (!obj.id || Number.isNaN(createdAt.getTime())) return null;
		return { createdAt, id: obj.id };
	} catch {
		return null;
	}
}
