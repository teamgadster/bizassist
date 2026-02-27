import type { PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { SalesTaxesRepository } from "@/modules/taxes/taxes.repository";
import type { CreateSalesTaxInput, ListSalesTaxesQuery, UpdateSalesTaxInput } from "@/modules/taxes/taxes.types";

function normalizeUniqueIds(ids?: string[]): string[] {
	if (!ids?.length) return [];
	return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function normalizeTaxName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

function isSalesTaxNameUniqueViolation(err: unknown): boolean {
	const code = (err as any)?.code;
	if (code !== "P2002") return false;

	const target = (err as any)?.meta?.target;
	if (Array.isArray(target)) {
		return target.includes("businessId") && target.includes("nameNormalized");
	}
	if (typeof target === "string") {
		return target.includes("businessId") && target.includes("nameNormalized");
	}
	return false;
}

export class SalesTaxesService {
	private repo: SalesTaxesRepository;

	constructor(prisma: PrismaClient) {
		this.repo = new SalesTaxesRepository(prisma);
	}

	async list(businessId: string, query: ListSalesTaxesQuery) {
		return this.repo.list({
			businessId,
			q: query.q,
			isEnabled: query.isEnabled,
			includeArchived: query.includeArchived,
			limit: query.limit ?? 200,
		});
	}

	async getById(businessId: string, id: string) {
		const item = await this.repo.getById({ businessId, id });
		if (!item) {
			throw new AppError(StatusCodes.NOT_FOUND, "Sales tax not found.", "SALES_TAX_NOT_FOUND");
		}
		return item;
	}

	async create(businessId: string, input: CreateSalesTaxInput) {
		const name = normalizeTaxName(input.name);
		const itemIds = normalizeUniqueIds(input.itemIds);
		const serviceIds = normalizeUniqueIds(input.serviceIds);

		if (itemIds.length > 0) {
			const found = await this.repo.countProductsByIds({ businessId, ids: itemIds, type: "PHYSICAL" });
			if (found !== itemIds.length) {
				throw new AppError(StatusCodes.BAD_REQUEST, "Some selected items are invalid.", "SALES_TAX_INVALID_ITEMS");
			}
		}

		if (serviceIds.length > 0) {
			const found = await this.repo.countProductsByIds({ businessId, ids: serviceIds, type: "SERVICE" });
			if (found !== serviceIds.length) {
				throw new AppError(StatusCodes.BAD_REQUEST, "Some selected services are invalid.", "SALES_TAX_INVALID_SERVICES");
			}
		}

		try {
			return await this.repo.create({
				businessId,
				name,
				percentage: input.percentage,
				isEnabled: input.isEnabled ?? true,
				applicationMode: input.applicationMode,
				customAmounts: input.customAmounts ?? true,
				itemPricingMode: input.itemPricingMode,
				itemIds,
				serviceIds,
			});
		} catch (err) {
			if (isSalesTaxNameUniqueViolation(err)) {
				throw new AppError(StatusCodes.CONFLICT, "Sales tax name already exists.", "SALES_TAX_NAME_EXISTS");
			}
			throw err;
		}
	}

	async update(businessId: string, id: string, input: UpdateSalesTaxInput) {
		const existing = await this.repo.getRecordById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Sales tax not found.", "SALES_TAX_NOT_FOUND");
		}
		if (existing.archivedAt) {
			throw new AppError(StatusCodes.CONFLICT, "Archived sales taxes are read-only.", "SALES_TAX_ARCHIVED_READ_ONLY");
		}

		const itemIds = normalizeUniqueIds(input.itemIds);
		const serviceIds = normalizeUniqueIds(input.serviceIds);

		if (input.itemIds !== undefined && itemIds.length > 0) {
			const found = await this.repo.countProductsByIds({ businessId, ids: itemIds, type: "PHYSICAL" });
			if (found !== itemIds.length) {
				throw new AppError(StatusCodes.BAD_REQUEST, "Some selected items are invalid.", "SALES_TAX_INVALID_ITEMS");
			}
		}

		if (input.serviceIds !== undefined && serviceIds.length > 0) {
			const found = await this.repo.countProductsByIds({ businessId, ids: serviceIds, type: "SERVICE" });
			if (found !== serviceIds.length) {
				throw new AppError(StatusCodes.BAD_REQUEST, "Some selected services are invalid.", "SALES_TAX_INVALID_SERVICES");
			}
		}

		try {
			const updated = await this.repo.updateScoped({
				businessId,
				id,
				data: {
					...(input.name !== undefined ? { name: normalizeTaxName(input.name) } : {}),
					...(input.percentage !== undefined ? { percentage: input.percentage } : {}),
					...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
					...(input.applicationMode !== undefined ? { applicationMode: input.applicationMode } : {}),
					...(input.customAmounts !== undefined ? { customAmounts: input.customAmounts } : {}),
					...(input.itemPricingMode !== undefined ? { itemPricingMode: input.itemPricingMode } : {}),
					...(input.itemIds !== undefined ? { itemIds } : {}),
					...(input.serviceIds !== undefined ? { serviceIds } : {}),
				},
			});

			if (!updated) {
				throw new AppError(StatusCodes.NOT_FOUND, "Sales tax not found.", "SALES_TAX_NOT_FOUND");
			}

			return updated;
		} catch (err) {
			if (isSalesTaxNameUniqueViolation(err)) {
				throw new AppError(StatusCodes.CONFLICT, "Sales tax name already exists.", "SALES_TAX_NAME_EXISTS");
			}
			throw err;
		}
	}

	async archive(businessId: string, id: string) {
		const existing = await this.repo.getRecordById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Sales tax not found.", "SALES_TAX_NOT_FOUND");
		}
		if (existing.archivedAt) return;

		await this.repo.archive({ businessId, id });
	}

	async restore(businessId: string, id: string) {
		const existing = await this.repo.getRecordById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Sales tax not found.", "SALES_TAX_NOT_FOUND");
		}
		if (!existing.archivedAt) return;

		await this.repo.restore({ businessId, id });
	}
}
