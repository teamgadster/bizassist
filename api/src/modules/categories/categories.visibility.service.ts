// BizAssist_api
// path: src/modules/categories/categories.visibility.service.ts

import type { PrismaClient, Category } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { CategoriesVisibilityRepository } from "@/modules/categories/categories.visibility.repo";

const CATEGORY_NOT_FOUND_CODE = "CATEGORY_NOT_FOUND";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";

function sortCategories(a: Category, b: Category): number {
	const sortCompare = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
	if (sortCompare !== 0) return sortCompare;
	return a.name.localeCompare(b.name);
}

export class CategoriesVisibilityService {
	private repo: CategoriesVisibilityRepository;

	constructor(private prisma: PrismaClient) {
		this.repo = new CategoriesVisibilityRepository(prisma);
	}

	async listHiddenCategoryIds(userId: string, businessId: string): Promise<string[]> {
		const rows = await this.repo.findHiddenIds({ userId, businessId });
		return Array.from(new Set(rows));
	}

	async hideCategory(userId: string, businessId: string, categoryId: string): Promise<void> {
		const category = await this.repo.findCategoryById({ businessId, categoryId });
		if (!category) {
			throw new AppError(StatusCodes.NOT_FOUND, CATEGORY_NOT_FOUND_MESSAGE, CATEGORY_NOT_FOUND_CODE);
		}

		await this.repo.upsertHiddenRow({ userId, businessId, categoryId });
	}

	async restoreCategory(userId: string, businessId: string, categoryId: string): Promise<void> {
		const category = await this.repo.findCategoryById({ businessId, categoryId });
		if (!category) {
			throw new AppError(StatusCodes.NOT_FOUND, CATEGORY_NOT_FOUND_MESSAGE, CATEGORY_NOT_FOUND_CODE);
		}

		await this.repo.deleteHiddenRow({ userId, businessId, categoryId });
	}

	async listPickerCategories(
		userId: string,
		businessId: string,
		opts?: { q?: string; includeHiddenSelectedCategoryId?: string }
	): Promise<Category[]> {
		const items = await this.repo.listVisibleCategoriesForPicker({
			userId,
			businessId,
			q: opts?.q,
		});

		const itemMap = new Map(items.map((item) => [item.id, item]));

		const selectedId = opts?.includeHiddenSelectedCategoryId;
		if (selectedId) {
			const selected = await this.repo.findCategoryById({ businessId, categoryId: selectedId });
			if (selected && !itemMap.has(selected.id)) {
				itemMap.set(selected.id, selected);
			}
		}

		return Array.from(itemMap.values()).sort(sortCategories);
	}
}
