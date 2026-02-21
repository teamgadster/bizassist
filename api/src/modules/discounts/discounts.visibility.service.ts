// BizAssist_api
// path: src/modules/discounts/discounts.visibility.service.ts

import type { PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { toDiscountDTO } from "@/modules/discounts/discounts.repository";
import type { DiscountDTO } from "@/modules/discounts/discounts.types";
import { DiscountsVisibilityRepository } from "@/modules/discounts/discounts.visibility.repo";

const DISCOUNT_NOT_FOUND_CODE = "DISCOUNT_NOT_FOUND";
const DISCOUNT_NOT_FOUND_MESSAGE = "Discount not found.";

function sortDiscounts(a: DiscountDTO, b: DiscountDTO): number {
	return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export class DiscountsVisibilityService {
	private repo: DiscountsVisibilityRepository;

	constructor(private prisma: PrismaClient) {
		this.repo = new DiscountsVisibilityRepository(prisma);
	}

	async listHiddenDiscountIds(userId: string, businessId: string): Promise<string[]> {
		const rows = await this.repo.findHiddenIds({ userId, businessId });
		return Array.from(new Set(rows));
	}

	async hideDiscount(userId: string, businessId: string, discountId: string): Promise<void> {
		const discount = await this.repo.findDiscountById({ businessId, discountId });
		if (!discount) {
			throw new AppError(StatusCodes.NOT_FOUND, DISCOUNT_NOT_FOUND_MESSAGE, DISCOUNT_NOT_FOUND_CODE);
		}

		await this.repo.upsertHiddenRow({ userId, businessId, discountId });
	}

	async restoreDiscount(userId: string, businessId: string, discountId: string): Promise<void> {
		const discount = await this.repo.findDiscountById({ businessId, discountId });
		if (!discount) {
			throw new AppError(StatusCodes.NOT_FOUND, DISCOUNT_NOT_FOUND_MESSAGE, DISCOUNT_NOT_FOUND_CODE);
		}

		await this.repo.deleteHiddenRow({ userId, businessId, discountId });
	}

	async listPickerDiscounts(
		userId: string,
		businessId: string,
		opts?: { q?: string }
	): Promise<DiscountDTO[]> {
		const items = await this.repo.listVisibleDiscountsForPicker({
			userId,
			businessId,
			q: opts?.q,
		});

		return items.map(toDiscountDTO).sort(sortDiscounts);
	}
}
