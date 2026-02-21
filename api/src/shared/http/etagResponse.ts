import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { buildWeakEtagFromJson, isIfNoneMatchHit } from "@/shared/http/etag";

export function respondWithEtagJson(
	req: Request,
	res: Response,
	payload: unknown,
	status: number = StatusCodes.OK
): void {
	const etag = buildWeakEtagFromJson(payload);
	const ifNoneMatch = req.header("if-none-match") ?? undefined;

	if (isIfNoneMatchHit(ifNoneMatch, etag)) {
		res.status(StatusCodes.NOT_MODIFIED).end();
		return;
	}

	res.setHeader("ETag", etag);
	res.status(status).json(payload);
}
