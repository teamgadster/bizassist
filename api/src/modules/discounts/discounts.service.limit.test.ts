import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { StatusCodes } from "http-status-codes";

import { DiscountsService } from "@/modules/discounts/discounts.service";

jest.mock("@/core/config/env", () => ({
	env: {
		maxDiscountsPerBusiness: 300,
	},
}));

describe("DiscountsService safety ceiling", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("rejects create when business discount ceiling is reached", async () => {
		const service = new DiscountsService({} as any);
		const countByBusiness = jest.fn<() => Promise<number>>().mockResolvedValue(300);

		(service as any).repo = {
			countByBusiness,
		};

		await expect(
			service.create("biz_123", {
				name: "VIP Discount",
				type: "FIXED",
				value: "5.00",
			} as any),
		).rejects.toMatchObject({
			statusCode: StatusCodes.CONFLICT,
			code: "DISCOUNT_LIMIT_REACHED",
		});
	});
});
