// BizAssist_api
// path: src/modules/categories/categories.service.ts

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { env } from "@/core/config/env";
import { CategoriesRepository } from "@/modules/categories/categories.repository";
import type {
	CreateCategoryInput,
	ListCategoriesQuery,
	UpdateCategoryInput,
} from "@/modules/categories/categories.types";

function isP2002(err: unknown): err is Prisma.PrismaClientKnownRequestError {
	return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function p2002TargetIncludes(err: Prisma.PrismaClientKnownRequestError, needle: string): boolean {
	const target = (err.meta as any)?.target;
	if (!target) return false;

	if (Array.isArray(target)) {
		return target.some((t) => String(t).toLowerCase().includes(needle));
	}

	return String(target).toLowerCase().includes(needle);
}

export class CategoriesService {
	private repo: CategoriesRepository;

	constructor(prisma: PrismaClient) {
		this.repo = new CategoriesRepository(prisma);
	}

	async list(businessId: string, input: ListCategoriesQuery) {
		const limit = input.limit ?? 200;

		// v1: no cursor paging yet; keep a conservative ceiling
		return this.repo.list({
			businessId,
			q: input.q,
			isActive: input.isActive,
			limit,
		});
	}

	async create(businessId: string, input: CreateCategoryInput) {
		const name = input.name.trim();

		const existing = await this.repo.getByName({ businessId, name });
		if (existing) {
			throw new AppError(StatusCodes.CONFLICT, "Category name already exists.", "CATEGORY_NAME_EXISTS");
		}

		const total = await this.repo.countByBusiness({ businessId });
		if (total >= env.maxCategoriesPerBusiness) {
			throw new AppError(
				StatusCodes.CONFLICT,
				`Category limit reached (max ${env.maxCategoriesPerBusiness}).`,
				"CATEGORY_LIMIT_REACHED",
				{ limit: env.maxCategoriesPerBusiness },
			);
		}

		try {
			return this.repo.create({
				businessId,
				name,
				color: input.color ?? null,
				sortOrder: input.sortOrder ?? 0,
				isActive: input.isActive ?? true,
			});
		} catch (err) {
			if (isP2002(err) && (p2002TargetIncludes(err, "name") || p2002TargetIncludes(err, "namenormalized"))) {
				throw new AppError(StatusCodes.CONFLICT, "Category name already exists.", "CATEGORY_NAME_EXISTS");
			}
			throw err;
		}
	}

	async update(businessId: string, id: string, input: UpdateCategoryInput) {
		const existing = await this.repo.getById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Category not found.", "CATEGORY_NOT_FOUND");
		}

		let updated;
		try {
			updated = await this.repo.updateScoped({
				businessId,
				id,
				data: {
					...(input.name ? { name: input.name.trim() } : {}),
					...(input.color !== undefined ? { color: input.color } : {}),
					...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
					...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
				},
			});
		} catch (err) {
			if (isP2002(err) && (p2002TargetIncludes(err, "name") || p2002TargetIncludes(err, "namenormalized"))) {
				throw new AppError(StatusCodes.CONFLICT, "Category name already exists.", "CATEGORY_NAME_EXISTS");
			}
			throw err;
		}

		if (!updated) {
			throw new AppError(StatusCodes.NOT_FOUND, "Category not found.", "CATEGORY_NOT_FOUND");
		}

		return updated;
	}

	async archive(businessId: string, id: string) {
		const existing = await this.repo.getById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Category not found.", "CATEGORY_NOT_FOUND");
		}

		// Idempotent: if already inactive, treat as success.
		if (existing.isActive === false) return;

		await this.repo.updateScoped({
			businessId,
			id,
			data: { isActive: false, archivedAt: new Date() },
		});
	}

	async restore(businessId: string, id: string) {
		const existing = await this.repo.getById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Category not found.", "CATEGORY_NOT_FOUND");
		}

		// Idempotent: if already active, treat as success.
		if (existing.isActive === true) return;

		await this.repo.updateScoped({
			businessId,
			id,
			data: { isActive: true, archivedAt: null },
		});
	}
}
