import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { StatusCodes } from "http-status-codes";

import { CatalogService } from "@/modules/catalog/catalog.service";
import { MAX_PRODUCTS_PER_BUSINESS } from "@/shared/catalogLimits";

jest.mock("@/lib/prisma", () => ({
	prisma: {},
}));

jest.mock("@/modules/units/units.repository", () => ({
	UnitsRepository: jest.fn().mockImplementation(() => ({
		getBusinessUnitById: jest.fn(),
	})),
}));

jest.mock("@/modules/media/media.resolve", () => ({
	resolveProductImageUrl: jest.fn(async (value: string | null) => value),
}));

describe("CatalogService safety ceiling", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("rejects create when business catalog ceiling is reached", async () => {
		const service = new CatalogService();
		const countProductsByBusiness = jest.fn<() => Promise<number>>().mockResolvedValue(MAX_PRODUCTS_PER_BUSINESS);

		(service as any).repo = {
			countProductsByBusiness,
		};

		await expect(
			service.createProduct("biz_123", {
				type: "PHYSICAL",
				name: "Safety Test Item",
			} as any),
		).rejects.toMatchObject({
			statusCode: StatusCodes.CONFLICT,
			code: "CATALOG_LIMIT_REACHED",
			message: "Catalog limit reached. Contact support.",
		});
	});
});
