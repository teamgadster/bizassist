import { type AttributeSelectionType, type PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/core/errors/AppError";
import { AttributesRepository } from "./attributes.repository";
import type {
	AttributeDto,
	CheckoutSelectedAttributeInput,
	CheckoutSelectedAttributeSnapshot,
	CreateAttributeInput,
	ProductAttributeDto,
	ReplaceProductAttributesInput,
	UpdateAttributeInput,
	UpsertAttributeOptionInput,
} from "./attributes.types";

function normalizeName(value: string): string {
	return String(value ?? "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function dedupeIds(values: string[]): string[] {
	return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function p2002TargetIncludes(err: any, needle: string): boolean {
	const target = err?.meta?.target;
	if (!target) return false;
	if (Array.isArray(target)) {
		return target.some((entry) => String(entry).toLowerCase().includes(needle));
	}
	return String(target).toLowerCase().includes(needle);
}

function mapAttribute(attribute: any): AttributeDto {
	return {
		id: attribute.id,
		name: attribute.name,
		selectionType: attribute.selectionType,
		isRequired: attribute.isRequired,
		sortOrder: attribute.sortOrder,
		isArchived: attribute.isArchived,
		createdAt: attribute.createdAt.toISOString(),
		updatedAt: attribute.updatedAt.toISOString(),
		options: (attribute.options ?? []).map((option: any) => ({
			id: option.id,
			attributeId: option.attributeId,
			name: option.name,
			sortOrder: option.sortOrder,
			isArchived: option.isArchived,
			createdAt: option.createdAt.toISOString(),
			updatedAt: option.updatedAt.toISOString(),
		})),
	};
}

function validateOptionNames(options: UpsertAttributeOptionInput[]): void {
	const taken = new Set<string>();
	for (const option of options) {
		if (option.isArchived === true) continue;
		const normalized = normalizeName(option.name);
		if (!normalized) {
			throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Invalid attribute option.", "ATTRIBUTE_INVALID");
		}
		if (taken.has(normalized)) {
			throw new AppError(
				StatusCodes.CONFLICT,
				"Attribute option name is already used.",
				"ATTRIBUTE_OPTION_NAME_TAKEN",
			);
		}
		taken.add(normalized);
	}
}

function assertRequiredRules(selectionType: AttributeSelectionType, isRequired: boolean): void {
	if (!isRequired) return;
	if (selectionType !== "SINGLE" && selectionType !== "MULTI") {
		throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Invalid attribute selection type.", "ATTRIBUTE_INVALID");
	}
}

export class AttributesService {
	private repo: AttributesRepository;

	constructor(private prisma: PrismaClient) {
		this.repo = new AttributesRepository(prisma);
	}

	async listAttributes(businessId: string, includeArchived = false): Promise<AttributeDto[]> {
		const rows = await this.repo.listAttributes(businessId, includeArchived);
		return rows.map(mapAttribute);
	}

	async getAttributeById(businessId: string, id: string): Promise<AttributeDto> {
		const row = await this.prisma.attribute.findFirst({
			where: { id, businessId },
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
			},
		});
		if (!row) {
			throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.", "ATTRIBUTE_INVALID");
		}
		return mapAttribute(row);
	}

	async createAttribute(businessId: string, input: CreateAttributeInput): Promise<AttributeDto> {
		assertRequiredRules(input.selectionType, input.isRequired);
		validateOptionNames(input.options);
		const normalizedName = normalizeName(input.name);
		if (!normalizedName) {
			throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Attribute name is required.", "ATTRIBUTE_REQUIRED");
		}

		if (input.isRequired && input.options.every((option) => option.isArchived === true)) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				"Required attributes must have at least one active option.",
				"ATTRIBUTE_INVALID",
			);
		}

		const count = await this.repo.countAttributes(businessId);
		const created = await this.prisma.attribute.create({
			data: {
				businessId,
				name: input.name,
				nameNormalized: normalizedName,
				selectionType: input.selectionType,
				isRequired: input.isRequired,
				sortOrder: input.sortOrder ?? count,
				options: {
					create: input.options.map((option, index) => ({
						businessId,
						name: option.name,
						nameNormalized: normalizeName(option.name),
						sortOrder: option.sortOrder ?? index,
						isArchived: option.isArchived === true,
					})),
				},
			},
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
			},
		}).catch((err: any) => {
			if (err?.code === "P2002") {
				throw new AppError(StatusCodes.CONFLICT, "Attribute name already exists.", "ATTRIBUTE_NAME_TAKEN");
			}
			throw err;
		});

		return mapAttribute(created);
	}

	async updateAttribute(businessId: string, id: string, input: UpdateAttributeInput): Promise<AttributeDto> {
		const existing = await this.prisma.attribute.findFirst({
			where: { id, businessId },
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
			},
		});
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.", "ATTRIBUTE_INVALID");
		}
		if (existing.isArchived) {
			throw new AppError(StatusCodes.CONFLICT, "Attribute is archived.", "ATTRIBUTE_ARCHIVED");
		}

		const selectionType = input.selectionType ?? existing.selectionType;
		const isRequired = input.isRequired ?? existing.isRequired;
		assertRequiredRules(selectionType, isRequired);

		if (input.options) validateOptionNames(input.options);
		const normalizedName = input.name ? normalizeName(input.name) : undefined;
		if (input.name && !normalizedName) {
			throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Attribute name is required.", "ATTRIBUTE_REQUIRED");
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.attribute.update({
				where: { id: existing.id },
				data: {
					name: input.name,
					nameNormalized: normalizedName,
					selectionType: input.selectionType,
					isRequired: input.isRequired,
					sortOrder: input.sortOrder,
				},
			});

			if (!input.options) return;

			const optionById = new Map(existing.options.map((option) => [option.id, option]));
			const seenExistingIds = new Set<string>();
			for (let index = 0; index < input.options.length; index += 1) {
				const option = input.options[index];
				if (option.id) {
					const current = optionById.get(option.id);
					if (!current) {
						throw new AppError(
							StatusCodes.UNPROCESSABLE_ENTITY,
							"Attribute option is invalid.",
							"ATTRIBUTE_INVALID",
						);
					}
					if (seenExistingIds.has(option.id)) {
						throw new AppError(
							StatusCodes.UNPROCESSABLE_ENTITY,
							"Duplicate attribute option id.",
							"ATTRIBUTE_INVALID",
						);
					}
					seenExistingIds.add(option.id);
					await tx.attributeOption.update({
						where: { id: option.id },
						data: {
							name: option.name,
							nameNormalized: normalizeName(option.name),
							sortOrder: option.sortOrder ?? index,
							isArchived: option.isArchived === true,
						},
					});
				} else {
					await tx.attributeOption.create({
						data: {
							businessId,
							attributeId: existing.id,
							name: option.name,
							nameNormalized: normalizeName(option.name),
							sortOrder: option.sortOrder ?? index,
							isArchived: option.isArchived === true,
						},
					});
				}
			}

			const idsToKeep = dedupeIds(input.options.map((option) => option.id ?? "")).filter(Boolean);
			await tx.attributeOption.updateMany({
				where: {
					attributeId: existing.id,
					...(idsToKeep.length > 0 ? { id: { notIn: idsToKeep } } : {}),
				},
				data: { isArchived: true },
			});
		}).catch((err: any) => {
			if (err?.code === "P2002") {
				if (p2002TargetIncludes(err, "namenormalized")) {
					if (p2002TargetIncludes(err, "attributeid")) {
						throw new AppError(
							StatusCodes.CONFLICT,
							"Attribute option name already exists.",
							"ATTRIBUTE_OPTION_NAME_TAKEN",
						);
					}
					throw new AppError(StatusCodes.CONFLICT, "Attribute name already exists.", "ATTRIBUTE_NAME_TAKEN");
				}
			}
			throw err;
		});

		const updated = await this.prisma.attribute.findFirst({
			where: { id: existing.id, businessId },
			include: {
				options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
			},
		});
		if (!updated) {
			throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.", "ATTRIBUTE_INVALID");
		}

		const activeOptions = (updated.options ?? []).filter((option) => !option.isArchived);
		if (updated.isRequired && activeOptions.length < 1) {
			throw new AppError(
				StatusCodes.UNPROCESSABLE_ENTITY,
				"Required attributes must have at least one active option.",
				"ATTRIBUTE_INVALID",
			);
		}

		return mapAttribute(updated);
	}

	async archiveAttribute(businessId: string, id: string, archive: boolean): Promise<void> {
		const existing = await this.prisma.attribute.findFirst({ where: { id, businessId }, select: { id: true } });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Attribute not found.", "ATTRIBUTE_INVALID");
		}
		await this.prisma.attribute.update({ where: { id }, data: { isArchived: archive } });
	}

	async getProductAttributes(businessId: string, productId: string): Promise<ProductAttributeDto[]> {
		const product = await this.prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
		if (!product) {
			throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");
		}
		const links = await this.repo.getProductAttributeLinks(businessId, productId);
		return links.map((link) => ({
			attributeId: link.attributeId,
			productId: link.productId,
			isRequired: link.isRequired ?? link.Attribute.isRequired,
			sortOrder: link.sortOrder,
			attribute: mapAttribute(link.Attribute),
		}));
	}

	async replaceProductAttributes(
		businessId: string,
		productId: string,
		input: ReplaceProductAttributesInput,
	): Promise<ProductAttributeDto[]> {
		const product = await this.prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
		if (!product) {
			throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");
		}

		const uniqueAttributeIds = dedupeIds((input.attributes ?? []).map((entry) => entry.attributeId));
		if (uniqueAttributeIds.length !== (input.attributes ?? []).length) {
			throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Duplicate attributes are not allowed.", "ATTRIBUTE_INVALID");
		}

		if (uniqueAttributeIds.length > 0) {
			const valid = await this.prisma.attribute.findMany({
				where: { businessId, id: { in: uniqueAttributeIds }, isArchived: false },
				include: { options: { where: { isArchived: false }, select: { id: true } } },
			});
			if (valid.length !== uniqueAttributeIds.length) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"One or more attributes are invalid or archived.",
					"ATTRIBUTE_INVALID",
				);
			}

			const validById = new Map(valid.map((row) => [row.id, row]));
			for (const row of input.attributes) {
				const attribute = validById.get(row.attributeId);
				if (!attribute) continue;
				const required = row.isRequired ?? attribute.isRequired;
				if (required && (attribute.options?.length ?? 0) < 1) {
					throw new AppError(
						StatusCodes.UNPROCESSABLE_ENTITY,
						"Required attributes must have at least one active option.",
						"ATTRIBUTE_INVALID",
					);
				}
			}
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.productAttribute.deleteMany({ where: { businessId, productId } });
			if (input.attributes.length === 0) return;
			await tx.productAttribute.createMany({
				data: input.attributes.map((entry, index) => ({
					businessId,
					productId,
					attributeId: entry.attributeId,
					isRequired: entry.isRequired,
					sortOrder: index,
				})),
			});
		});

		return this.getProductAttributes(businessId, productId);
	}

	async validateSelectionsForCheckout(
		businessId: string,
		productId: string,
		selectedAttributesInput: CheckoutSelectedAttributeInput[] | undefined,
	): Promise<CheckoutSelectedAttributeSnapshot[]> {
		const links = await this.repo.getProductAttributeLinks(businessId, productId);
		if (links.length === 0) return [];

		const selectedAttributes = (selectedAttributesInput ?? []).map((entry) => ({
			attributeId: String(entry.attributeId ?? "").trim(),
			optionId: String(entry.optionId ?? "").trim(),
			attributeNameSnapshot: String(entry.attributeNameSnapshot ?? "").trim(),
			optionNameSnapshot: String(entry.optionNameSnapshot ?? "").trim(),
		}));

		const linkByAttributeId = new Map(links.map((link) => [link.attributeId, link]));
		const groupedSelections = new Map<string, string[]>();
		for (const selection of selectedAttributes) {
			if (!selection.attributeId || !selection.optionId) {
				throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Invalid attribute selection.", "ATTRIBUTE_SELECTION_INVALID");
			}
			if (!linkByAttributeId.has(selection.attributeId)) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"Selected attribute is not attached to product.",
					"ATTRIBUTE_SELECTION_INVALID",
				);
			}
			const current = groupedSelections.get(selection.attributeId) ?? [];
			groupedSelections.set(selection.attributeId, [...current, selection.optionId]);
		}

		const snapshots: CheckoutSelectedAttributeSnapshot[] = [];
		for (const link of links) {
			const attribute = link.Attribute;
			const required = link.isRequired ?? attribute.isRequired;
			const options = (attribute.options ?? []).filter((option) => !option.isArchived);
			if (required && options.length < 1) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"Required attribute has no active options.",
					"ATTRIBUTE_INVALID",
				);
			}

			const selectedOptionIdsRaw = groupedSelections.get(attribute.id) ?? [];
			const selectedOptionIds = dedupeIds(selectedOptionIdsRaw);
			const optionsById = new Map(options.map((option) => [option.id, option]));

			if (required && selectedOptionIds.length < 1) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"Required attribute selection missing.",
					"ATTRIBUTE_REQUIRED",
				);
			}

			if (attribute.selectionType === "SINGLE" && selectedOptionIds.length > 1) {
				throw new AppError(
					StatusCodes.UNPROCESSABLE_ENTITY,
					"Single-select attribute must have exactly one selection.",
					"ATTRIBUTE_SELECTION_INVALID",
				);
			}

			for (const optionId of selectedOptionIds) {
				const option = optionsById.get(optionId);
				if (!option) {
					throw new AppError(
						StatusCodes.UNPROCESSABLE_ENTITY,
						"Attribute option is invalid or archived.",
						"ATTRIBUTE_SELECTION_INVALID",
					);
				}
				snapshots.push({
					attributeId: attribute.id,
					optionId: option.id,
					attributeNameSnapshot: attribute.name,
					optionNameSnapshot: option.name,
				});
			}
		}

		return snapshots;
	}
}
