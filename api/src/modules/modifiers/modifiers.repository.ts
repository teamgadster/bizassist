import type { PrismaClient } from "@prisma/client";

export class ModifiersRepository {
	constructor(private prisma: PrismaClient) {}

	getActiveByProduct(businessId: string, productId: string) {
		return this.prisma.modifierGroup.findMany({
			where: { businessId, productId, isArchived: false },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				options: {
					where: { isArchived: false },
					orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
				},
			},
		});
	}

	countGroups(businessId: string, productId: string) {
		return this.prisma.modifierGroup.count({ where: { businessId, productId } });
	}

	countOptions(businessId: string, modifierGroupId: string) {
		return this.prisma.modifierOption.count({ where: { businessId, modifierGroupId } });
	}
}
