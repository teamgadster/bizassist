import { StatusCodes } from "http-status-codes";
import { type ModifierSelectionType, type PrismaClient } from "@prisma/client";
import { AppError } from "@/core/errors/AppError";
import {
	MAX_MODIFIER_GROUPS_PER_BUSINESS,
	MAX_MODIFIER_GROUPS_PER_PRODUCT,
	MAX_MODIFIER_OPTIONS_PER_GROUP,
} from "@/shared/catalogLimits";
import { ModifiersRepository } from "./modifiers.repository";
import type {
	ApplySharedModifierAvailabilityInput,
	ApplySharedModifierAvailabilityResult,
	CreateModifierGroupInput,
	CreateModifierOptionInput,
	ModifierGroupDto,
	ReplaceProductModifierGroupsInput,
	SharedModifierAvailabilityPreviewDto,
	SyncModifierGroupProductsInput,
	SyncModifierGroupProductsResult,
	UpdateModifierGroupInput,
	UpdateModifierOptionInput,
} from "./modifiers.types";

function normalizeModifierOptionName(name: string): string {
	return String(name ?? "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function validateRules(
	selectionType: ModifierSelectionType,
	isRequired: boolean,
	minSelected: number,
	maxSelected: number,
): void {
	if (selectionType === "SINGLE") {
		if (maxSelected !== 1) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				"SINGLE groups must have maxSelected=1.",
				"MODIFIER_RULES_INVALID",
			);
		}
		if (minSelected > 1) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				"SINGLE groups must have minSelected <= 1.",
				"MODIFIER_RULES_INVALID",
			);
		}
	}
	if (minSelected > maxSelected) {
		throw new AppError(
			StatusCodes.UNPROCESSABLE_ENTITY,
			"minSelected cannot be greater than maxSelected.",
			"MODIFIER_RULES_INVALID",
		);
	}
	if (isRequired && minSelected < 1) {
		throw new AppError(
			StatusCodes.UNPROCESSABLE_ENTITY,
			"Required groups must have minSelected >= 1.",
			"MODIFIER_RULES_INVALID",
		);
	}
}

function mapGroup(group: any): ModifierGroupDto {
	const options = (group.options ?? []).map((option: any) => ({
		id: option.id,
		modifierGroupId: option.modifierGroupId,
		name: option.name,
		priceDeltaMinor: String(option.priceDeltaMinor),
		sortOrder: option.sortOrder,
		isSoldOut: Boolean(option.isSoldOut),
		isArchived: option.isArchived,
		createdAt: option.createdAt.toISOString(),
		updatedAt: option.updatedAt.toISOString(),
	}));
	const soldOutOptionsCount = options.filter((option: { isSoldOut: boolean }) => option.isSoldOut).length;
	const availableOptionsCount = options.length - soldOutOptionsCount;
	return {
		id: group.id,
		name: group.name,
		selectionType: group.selectionType,
		isRequired: group.isRequired,
		minSelected: group.minSelected,
		maxSelected: group.maxSelected,
		sortOrder: group.sortOrder,
		isArchived: group.isArchived,
		attachedProductCount: Array.isArray(group.productLinks) ? group.productLinks.length : 0,
		availableOptionsCount,
		soldOutOptionsCount,
		createdAt: group.createdAt.toISOString(),
		updatedAt: group.updatedAt.toISOString(),
		options,
	};
}

export class ModifiersService {
	private repo: ModifiersRepository;
	constructor(private prisma: PrismaClient) {
		this.repo = new ModifiersRepository(prisma);
	}

	async listModifierGroups(businessId: string, includeArchived = false): Promise<ModifierGroupDto[]> {
		const groups = await this.repo.listGroups(businessId, includeArchived);
		return groups.map(mapGroup);
	}

	async getModifierGroupById(businessId: string, id: string): Promise<ModifierGroupDto> {
		const group = await this.prisma.modifierGroup.findFirst({
			where: { id, businessId },
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
				productLinks: { select: { productId: true } },
			},
		});
		if (!group) throw new AppError(StatusCodes.NOT_FOUND, "Modifier group not found.", "MODIFIER_GROUP_NOT_FOUND");
		return mapGroup(group);
	}

	async getProductModifiers(businessId: string, productId: string): Promise<ModifierGroupDto[]> {
		const product = await this.prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
		if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");
		const links = await this.repo.getActiveByProduct(businessId, productId);
		return links.map((link) => mapGroup(link.ModifierGroup));
	}

	async replaceProductGroups(
		businessId: string,
		productId: string,
		input: ReplaceProductModifierGroupsInput,
	): Promise<ModifierGroupDto[]> {
		const product = await this.prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
		if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");

		const uniqueIds = Array.from(
			new Set((input.modifierGroupIds ?? []).map((id) => String(id).trim()).filter(Boolean)),
		);
		if (uniqueIds.length > MAX_MODIFIER_GROUPS_PER_PRODUCT) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				`Max ${MAX_MODIFIER_GROUPS_PER_PRODUCT} modifier groups per product.`,
				"MODIFIER_GROUPS_PER_PRODUCT_LIMIT",
			);
		}

		if (uniqueIds.length > 0) {
			const validGroups = await this.prisma.modifierGroup.findMany({
				where: { businessId, id: { in: uniqueIds }, isArchived: false },
				select: { id: true },
			});
			if (validGroups.length !== uniqueIds.length) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"One or more modifier groups are invalid or archived.",
					"MODIFIER_GROUP_INVALID",
				);
			}
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.productModifierGroup.deleteMany({ where: { businessId, productId } });
			if (uniqueIds.length === 0) return;
			await tx.productModifierGroup.createMany({
				data: uniqueIds.map((modifierGroupId, idx) => ({
					businessId,
					productId,
					modifierGroupId,
					sortOrder: idx,
				})),
			});
		});

		return this.getProductModifiers(businessId, productId);
	}

	async syncModifierGroupProducts(
		businessId: string,
		input: SyncModifierGroupProductsInput,
	): Promise<SyncModifierGroupProductsResult> {
		const modifierGroupId = String(input.modifierGroupId ?? "").trim();
		const selectedProductIds = Array.from(
			new Set((input.selectedProductIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean)),
		);

		const group = await this.prisma.modifierGroup.findFirst({
			where: { id: modifierGroupId, businessId, isArchived: false },
			select: { id: true },
		});
		if (!group) {
			throw new AppError(StatusCodes.NOT_FOUND, "Modifier group not found.", "MODIFIER_GROUP_NOT_FOUND");
		}

		if (selectedProductIds.length > 0) {
			const validProducts = await this.prisma.product.findMany({
				where: {
					businessId,
					isActive: true,
					id: { in: selectedProductIds },
				},
				select: { id: true },
			});
			if (validProducts.length !== selectedProductIds.length) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"One or more selected products are invalid or inactive.",
					"PRODUCT_INVALID",
				);
			}
		}

		const allActiveProducts = await this.prisma.product.findMany({
			where: { businessId, isActive: true },
			select: { id: true },
		});
		const candidateProductIds = allActiveProducts.map((product) => product.id);
		if (candidateProductIds.length === 0) {
			return { updatedProductCount: 0, attachedCount: 0, detachedCount: 0 };
		}

		const currentLinks = await this.prisma.productModifierGroup.findMany({
			where: {
				businessId,
				modifierGroupId,
				productId: { in: candidateProductIds },
			},
			select: { productId: true },
		});

		const selectedSet = new Set(selectedProductIds);
		const linkedSet = new Set(currentLinks.map((link) => link.productId));

		const toAttach = candidateProductIds.filter((productId) => selectedSet.has(productId) && !linkedSet.has(productId));
		const toDetach = candidateProductIds.filter((productId) => !selectedSet.has(productId) && linkedSet.has(productId));

		if (toAttach.length > 0) {
			const currentCounts = await this.prisma.productModifierGroup.groupBy({
				by: ["productId"],
				where: { businessId, productId: { in: toAttach } },
				_count: { _all: true },
			});
			const countByProduct = new Map(currentCounts.map((row) => [row.productId, row._count._all]));
			const limitExceededProductId = toAttach.find(
				(productId) => (countByProduct.get(productId) ?? 0) >= MAX_MODIFIER_GROUPS_PER_PRODUCT,
			);
			if (limitExceededProductId) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					`Max ${MAX_MODIFIER_GROUPS_PER_PRODUCT} modifier groups per product.`,
					"MODIFIER_GROUPS_PER_PRODUCT_LIMIT",
				);
			}

			await this.prisma.productModifierGroup.createMany({
				data: toAttach.map((productId) => ({
					businessId,
					productId,
					modifierGroupId,
					sortOrder: countByProduct.get(productId) ?? 0,
				})),
				skipDuplicates: true,
			});
		}

		if (toDetach.length > 0) {
			await this.prisma.productModifierGroup.deleteMany({
				where: { businessId, modifierGroupId, productId: { in: toDetach } },
			});
		}

		return {
			updatedProductCount: toAttach.length + toDetach.length,
			attachedCount: toAttach.length,
			detachedCount: toDetach.length,
		};
	}

	async createGroup(businessId: string, input: CreateModifierGroupInput): Promise<ModifierGroupDto> {
		const groupsCount = await this.repo.countGroups(businessId);
		if (groupsCount >= MAX_MODIFIER_GROUPS_PER_BUSINESS) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				`Max ${MAX_MODIFIER_GROUPS_PER_BUSINESS} modifier groups per business.`,
				"MODIFIER_GROUP_LIMIT_REACHED",
			);
		}
		validateRules(input.selectionType, input.isRequired, input.minSelected, input.maxSelected);
		const created = await this.prisma.modifierGroup.create({
			data: {
				businessId,
				name: input.name,
				selectionType: input.selectionType,
				isRequired: input.isRequired,
				minSelected: input.minSelected,
				maxSelected: input.maxSelected,
				sortOrder: input.sortOrder ?? groupsCount,
			},
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
				productLinks: { select: { productId: true } },
			},
		});
		return mapGroup(created);
	}

	async updateGroup(businessId: string, id: string, input: UpdateModifierGroupInput): Promise<ModifierGroupDto> {
		const existing = await this.prisma.modifierGroup.findFirst({
			where: { id, businessId },
			include: { options: true },
		});
		if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Modifier group not found.", "MODIFIER_GROUP_NOT_FOUND");
		const selectionType = input.selectionType ?? existing.selectionType;
		const isRequired = input.isRequired ?? existing.isRequired;
		const minSelected = input.minSelected ?? existing.minSelected;
		const maxSelected = input.maxSelected ?? existing.maxSelected;
		validateRules(selectionType, isRequired, minSelected, maxSelected);
		const updated = await this.prisma.modifierGroup.update({
			where: { id },
			data: {
				name: input.name,
				selectionType: input.selectionType,
				isRequired: input.isRequired,
				minSelected: input.minSelected,
				maxSelected: input.maxSelected,
				sortOrder: input.sortOrder,
			},
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
				productLinks: { select: { productId: true } },
			},
		});
		return mapGroup(updated);
	}

	async createOption(businessId: string, groupId: string, input: CreateModifierOptionInput): Promise<ModifierGroupDto> {
		const group = await this.prisma.modifierGroup.findFirst({
			where: { id: groupId, businessId },
			select: { id: true },
		});
		if (!group) throw new AppError(StatusCodes.NOT_FOUND, "Modifier group not found.", "MODIFIER_GROUP_NOT_FOUND");
		const optionsCount = await this.repo.countOptions(businessId, groupId);
		if (optionsCount >= MAX_MODIFIER_OPTIONS_PER_GROUP) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				`Max ${MAX_MODIFIER_OPTIONS_PER_GROUP} options per modifier group.`,
				"MODIFIER_OPTION_LIMIT_REACHED",
			);
		}
		await this.prisma.modifierOption.create({
			data: {
				businessId,
				modifierGroupId: groupId,
				name: input.name,
				priceDeltaMinor: BigInt(input.priceDeltaMinor),
				sortOrder: input.sortOrder ?? optionsCount,
			},
		});
		const hydrated = await this.prisma.modifierGroup.findUnique({
			where: { id: groupId },
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
				productLinks: { select: { productId: true } },
			},
		});
		return mapGroup(hydrated);
	}

	async updateOption(businessId: string, id: string, input: UpdateModifierOptionInput): Promise<ModifierGroupDto> {
		const existing = await this.prisma.modifierOption.findFirst({
			where: { id, businessId },
			select: { id: true, modifierGroupId: true },
		});
		if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Modifier option not found.", "MODIFIER_OPTION_NOT_FOUND");
		await this.prisma.modifierOption.update({
			where: { id },
			data: {
				name: input.name,
				priceDeltaMinor: input.priceDeltaMinor != null ? BigInt(input.priceDeltaMinor) : undefined,
				isSoldOut: input.isSoldOut,
				sortOrder: input.sortOrder,
			},
		});
		const hydrated = await this.prisma.modifierGroup.findUnique({
			where: { id: existing.modifierGroupId },
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
				productLinks: { select: { productId: true } },
			},
		});
		return mapGroup(hydrated);
	}

	async archiveGroup(businessId: string, id: string, archived: boolean): Promise<void> {
		const existing = await this.prisma.modifierGroup.findFirst({ where: { id, businessId }, select: { id: true } });
		if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Modifier group not found.", "MODIFIER_GROUP_NOT_FOUND");
		await this.prisma.modifierGroup.update({ where: { id }, data: { isArchived: archived } });
	}

	async archiveOption(businessId: string, id: string, archived: boolean): Promise<void> {
		const existing = await this.prisma.modifierOption.findFirst({ where: { id, businessId }, select: { id: true } });
		if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Modifier option not found.", "MODIFIER_OPTION_NOT_FOUND");
		await this.prisma.modifierOption.update({ where: { id }, data: { isArchived: archived } });
	}

	async getSharedModifierAvailabilityPreview(
		businessId: string,
		optionId: string,
	): Promise<SharedModifierAvailabilityPreviewDto> {
		const option = await this.prisma.modifierOption.findFirst({
			where: {
				id: optionId,
				businessId,
				isArchived: false,
				ModifierGroup: { isArchived: false },
			},
			select: { id: true, name: true },
		});
		if (!option) {
			throw new AppError(StatusCodes.NOT_FOUND, "Modifier option not found.", "MODIFIER_OPTION_NOT_FOUND");
		}

		const normalizedName = normalizeModifierOptionName(option.name);
		if (!normalizedName) {
			return { optionId: option.id, optionName: option.name, groups: [] };
		}

		const options = await this.prisma.modifierOption.findMany({
			where: {
				businessId,
				isArchived: false,
				ModifierGroup: { isArchived: false },
			},
			select: {
				id: true,
				name: true,
				modifierGroupId: true,
				isSoldOut: true,
				ModifierGroup: { select: { id: true, name: true } },
			},
		});

		const groups = options
			.filter((row) => normalizeModifierOptionName(row.name) === normalizedName)
			.map((row) => ({
				modifierGroupId: row.ModifierGroup.id,
				modifierGroupName: row.ModifierGroup.name,
				optionId: row.id,
				isSoldOut: Boolean(row.isSoldOut),
			}));

		groups.sort((a, b) => a.modifierGroupName.localeCompare(b.modifierGroupName));

		return {
			optionId: option.id,
			optionName: option.name,
			groups,
		};
	}

	async applySharedModifierAvailability(
		businessId: string,
		optionId: string,
		input: ApplySharedModifierAvailabilityInput,
	): Promise<ApplySharedModifierAvailabilityResult> {
		const preview = await this.getSharedModifierAvailabilityPreview(businessId, optionId);
		if (preview.groups.length === 0) {
			throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "No modifier sets found to update.", "MODIFIER_GROUP_INVALID");
		}

		const selectedIds = Array.from(
			new Set((input.modifierGroupIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean)),
		);
		if (selectedIds.length === 0) {
			throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Select at least one modifier set.", "MODIFIER_GROUP_INVALID");
		}

		const validGroupIds = new Set(preview.groups.map((group) => group.modifierGroupId));
		if (selectedIds.some((id) => !validGroupIds.has(id))) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				"One or more modifier sets are invalid for this modifier.",
				"MODIFIER_GROUP_INVALID",
			);
		}

		const targetOptionIds = preview.groups
			.filter((group) => selectedIds.includes(group.modifierGroupId))
			.map((group) => group.optionId);

		if (targetOptionIds.length === 0) {
			return { updatedOptionsCount: 0, updatedGroupsCount: 0 };
		}

		const result = await this.prisma.modifierOption.updateMany({
			where: {
				businessId,
				id: { in: targetOptionIds },
				isArchived: false,
				ModifierGroup: { isArchived: false },
			},
			data: { isSoldOut: Boolean(input.isSoldOut) },
		});

		return {
			updatedOptionsCount: result.count,
			updatedGroupsCount: selectedIds.length,
		};
	}

	async validateSelectionsForCheckout(
		businessId: string,
		productId: string,
		selectedModifierOptionIds: string[],
	): Promise<{ selectedOptionRows: Array<{ id: string; name: string; priceDeltaMinor: bigint }>; deltaMinor: bigint }> {
		if (selectedModifierOptionIds.length === 0) return { selectedOptionRows: [], deltaMinor: 0n };
		const optionIds = Array.from(new Set(selectedModifierOptionIds.map((v) => String(v ?? "").trim()).filter(Boolean)));
		const options = await this.prisma.modifierOption.findMany({
			where: {
				businessId,
				id: { in: optionIds },
				isArchived: false,
				ModifierGroup: {
					isArchived: false,
					productLinks: {
						some: { productId, businessId },
					},
				},
			},
			include: { ModifierGroup: true },
		});
		if (options.length !== optionIds.length) {
			throw new AppError(StatusCodes.BAD_REQUEST, "One or more modifiers are invalid.", "MODIFIER_SELECTION_INVALID");
		}
		if (options.some((option) => option.isSoldOut)) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				"One or more selected modifiers are sold out.",
				"MODIFIER_OPTION_SOLD_OUT",
			);
		}
		const byGroup = new Map<string, typeof options>();
		for (const option of options) {
			const list = byGroup.get(option.modifierGroupId) ?? [];
			list.push(option);
			byGroup.set(option.modifierGroupId, list);
		}

		const groups = await this.prisma.modifierGroup.findMany({
			where: {
				businessId,
				isArchived: false,
				productLinks: { some: { productId, businessId } },
			},
		});
		for (const group of groups) {
			const selectedCount = (byGroup.get(group.id) ?? []).length;
			if (group.isRequired && selectedCount < group.minSelected) {
				throw new AppError(StatusCodes.BAD_REQUEST, "Required modifiers are missing.", "MODIFIER_SELECTION_REQUIRED");
			}
			if (selectedCount > group.maxSelected) {
				throw new AppError(
					StatusCodes.BAD_REQUEST,
					"Too many modifiers selected for a group.",
					"MODIFIER_SELECTION_LIMIT_EXCEEDED",
				);
			}
			if (group.selectionType === "SINGLE" && selectedCount > 1) {
				throw new AppError(
					StatusCodes.BAD_REQUEST,
					"Only one modifier can be selected for this group.",
					"MODIFIER_SELECTION_SINGLE_ONLY",
				);
			}
		}

		let deltaMinor = 0n;
		const selectedOptionRows = options.map((option) => {
			deltaMinor += BigInt(option.priceDeltaMinor);
			return { id: option.id, name: option.name, priceDeltaMinor: BigInt(option.priceDeltaMinor) };
		});
		return { selectedOptionRows, deltaMinor };
	}
}
