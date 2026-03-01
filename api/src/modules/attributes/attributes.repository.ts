import type { PrismaClient } from "@prisma/client";

export class AttributesRepository {
	constructor(private prisma: PrismaClient) {}

	listAttributes(businessId: string, includeArchived = false) {
		return this.prisma.attribute.findMany({
			where: { businessId, ...(includeArchived ? {} : { isArchived: false }) },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				options: {
					where: includeArchived ? undefined : { isArchived: false },
					orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
				},
			},
		});
	}

	countAttributes(businessId: string) {
		return this.prisma.attribute.count({ where: { businessId } });
	}

	getProductAttributeLinks(businessId: string, productId: string) {
		return this.prisma.productAttribute.findMany({
			where: {
				businessId,
				productId,
				Attribute: { isArchived: false },
			},
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			include: {
				Attribute: {
					include: {
						options: {
							where: { isArchived: false },
							orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
						},
					},
				},
			},
		});
	}
}
