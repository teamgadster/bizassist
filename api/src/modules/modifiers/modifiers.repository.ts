import type { PrismaClient } from "@prisma/client";

export class ModifiersRepository {
	constructor(private prisma: PrismaClient) {}

	listGroups(businessId: string, includeArchived = false) {
		return this.prisma.modifierGroup.findMany({
			where: { businessId, ...(includeArchived ? {} : { isArchived: false }) },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				options: {
					where: includeArchived ? undefined : { isArchived: false },
					orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
				},
				productLinks: { select: { productId: true } },
			},
		});
	}

	getActiveByProduct(businessId: string, productId: string) {
		return this.prisma.productModifierGroup.findMany({
			where: { businessId, productId, ModifierGroup: { isArchived: false } },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				ModifierGroup: {
					include: {
						options: {
							where: { isArchived: false },
							orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
						},
						productLinks: { select: { productId: true } },
					},
				},
			},
		});
	}

	countGroups(businessId: string) {
		return this.prisma.modifierGroup.count({ where: { businessId } });
	}

	countOptions(businessId: string, modifierGroupId: string) {
		return this.prisma.modifierOption.count({ where: { businessId, modifierGroupId } });
	}
}
