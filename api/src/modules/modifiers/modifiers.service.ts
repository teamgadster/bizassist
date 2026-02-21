import { StatusCodes } from "http-status-codes";
import { Prisma, type ModifierSelectionType, type PrismaClient } from "@prisma/client";
import { AppError } from "@/core/errors/AppError";
import { MAX_MODIFIER_GROUPS_PER_PRODUCT, MAX_MODIFIER_OPTIONS_PER_GROUP } from "@/shared/catalogLimits";
import { ModifiersRepository } from "./modifiers.repository";
import type {
	CreateModifierGroupInput,
	CreateModifierOptionInput,
	ModifierGroupDto,
	UpdateModifierGroupInput,
	UpdateModifierOptionInput,
} from "./modifiers.types";

function validateRules(
	selectionType: ModifierSelectionType,
	isRequired: boolean,
	minSelected: number,
	maxSelected: number,
): void {
	if (selectionType === "SINGLE") {
		if (maxSelected !== 1) {
			throw new AppError(StatusCodes.BAD_REQUEST, "SINGLE groups must have maxSelected=1.", "MODIFIER_RULES_INVALID");
		}
		if (minSelected > 1) {
			throw new AppError(
				StatusCodes.BAD_REQUEST,
				"SINGLE groups must have minSelected <= 1.",
				"MODIFIER_RULES_INVALID",
			);
		}
	}
	if (minSelected > maxSelected) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"minSelected cannot be greater than maxSelected.",
			"MODIFIER_RULES_INVALID",
		);
	}
	if (isRequired && minSelected < 1) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Required groups must have minSelected >= 1.",
			"MODIFIER_RULES_INVALID",
		);
	}
}

function mapGroup(group: any): ModifierGroupDto {
	return {
		id: group.id,
		productId: group.productId,
		name: group.name,
		selectionType: group.selectionType,
		isRequired: group.isRequired,
		minSelected: group.minSelected,
		maxSelected: group.maxSelected,
		sortOrder: group.sortOrder,
		isArchived: group.isArchived,
		createdAt: group.createdAt.toISOString(),
		updatedAt: group.updatedAt.toISOString(),
		options: (group.options ?? []).map((option: any) => ({
			id: option.id,
			name: option.name,
			priceDeltaMinor: String(option.priceDeltaMinor),
			sortOrder: option.sortOrder,
			isArchived: option.isArchived,
			createdAt: option.createdAt.toISOString(),
			updatedAt: option.updatedAt.toISOString(),
		})),
	};
}

export class ModifiersService {
	private repo: ModifiersRepository;
	constructor(private prisma: PrismaClient) {
		this.repo = new ModifiersRepository(prisma);
	}

	async getProductModifiers(businessId: string, productId: string): Promise<ModifierGroupDto[]> {
		const product = await this.prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
		if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");
		const groups = await this.repo.getActiveByProduct(businessId, productId);
		return groups.map(mapGroup);
	}

	async createGroup(businessId: string, productId: string, input: CreateModifierGroupInput): Promise<ModifierGroupDto> {
		const product = await this.prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
		if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");
		const groupsCount = await this.repo.countGroups(businessId, productId);
		if (groupsCount >= MAX_MODIFIER_GROUPS_PER_PRODUCT) {
			throw new AppError(
				StatusCodes.CONFLICT,
				`Max ${MAX_MODIFIER_GROUPS_PER_PRODUCT} modifier groups per product.`,
				"MODIFIER_GROUP_LIMIT_REACHED",
			);
		}
		validateRules(input.selectionType, input.isRequired, input.minSelected, input.maxSelected);
		const created = await this.prisma.modifierGroup.create({
			data: {
				businessId,
				productId,
				name: input.name,
				selectionType: input.selectionType,
				isRequired: input.isRequired,
				minSelected: input.minSelected,
				maxSelected: input.maxSelected,
				sortOrder: input.sortOrder ?? groupsCount,
			},
			include: { options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
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
			include: { options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
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
				StatusCodes.CONFLICT,
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
			include: { options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
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
				sortOrder: input.sortOrder,
			},
		});
		const hydrated = await this.prisma.modifierGroup.findUnique({
			where: { id: existing.modifierGroupId },
			include: { options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
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
				ModifierGroup: { productId, isArchived: false },
			},
			include: { ModifierGroup: true },
		});
		if (options.length !== optionIds.length) {
			throw new AppError(StatusCodes.BAD_REQUEST, "One or more modifiers are invalid.", "MODIFIER_SELECTION_INVALID");
		}
		const byGroup = new Map<string, typeof options>();
		for (const option of options) {
			const list = byGroup.get(option.modifierGroupId) ?? [];
			list.push(option);
			byGroup.set(option.modifierGroupId, list);
		}
		const groups = await this.prisma.modifierGroup.findMany({ where: { businessId, productId, isArchived: false } });
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
