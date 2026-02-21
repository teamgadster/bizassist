// path: src/modules/business/business.repository.ts

import { prisma } from "@/lib/prisma";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@/core/errors/AppError";
import type { ActiveBusinessContext, EnforcedCreateBusinessInput } from "@/modules/business/business.types";
import { StaffRole } from "@prisma/client";

export async function createBusinessActivation(
	userId: string,
	input: EnforcedCreateBusinessInput,
	policy: { maxBusinesses: number }
) {
	return prisma.$transaction(async (tx) => {
		// Serialize per-user business creation
		await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

		const existingCount = await tx.business.count({ where: { ownerId: userId } });
		if (existingCount >= policy.maxBusinesses) {
			throw new AppError(StatusCodes.CONFLICT, "You already have a business set up.", "BUSINESS_LIMIT_REACHED", {
				maxBusinesses: policy.maxBusinesses,
			});
		}

		const currencyCode = input.currencyCode.trim().toUpperCase();

		// Optional legacy blob. Keep only if the rest of your codebase still reads settings.currency.
		const settings = {
			currency: currencyCode,
			...(input.moduleChoice ? { moduleChoice: input.moduleChoice } : {}),
		};

		const business = await tx.business.create({
			data: {
				name: input.name.trim(),
				businessType: input.businessType,

				countryCode: input.countryCode.trim().toUpperCase(),
				currencyCode,

				timezone: input.timezone.trim(),
				ownerId: userId,

				// Keep for back-compat if needed. If not needed, remove this entirely.
				settings,
			},
			select: {
				id: true,
				name: true,
				businessType: true,
				countryCode: true,
				currencyCode: true,
				timezone: true,
				settings: true,
			},
		});

		const store = await tx.store.create({
			data: {
				businessId: business.id,
				name: "Main Store",
				isDefault: true,
			},
			select: {
				id: true,
				name: true,
				code: true,
				isDefault: true,
			},
		});

		const membership = await tx.staffMembership.upsert({
			where: { userId_businessId: { userId, businessId: business.id } },
			update: { staffRole: StaffRole.OWNER, isPrimary: true },
			create: { userId, businessId: business.id, staffRole: StaffRole.OWNER, isPrimary: true },
			select: { id: true, businessId: true, staffRole: true, isPrimary: true },
		});

		await tx.user.update({
			where: { id: userId },
			data: { activeBusinessId: business.id },
			select: { id: true },
		});

		return { business, store, membership };
	});
}

export async function getActiveBusinessContext(userId: string): Promise<ActiveBusinessContext | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			activeBusinessId: true,
			emailVerified: true,
			emailVerifiedAt: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user) return null;

	if (!user.activeBusinessId) {
		return {
			user,
			activeBusiness: null,
			defaultStore: null,
			staffMembership: null,
		};
	}

	const activeBusinessRaw = await prisma.business.findUnique({
		where: { id: user.activeBusinessId },
		select: {
			id: true,
			name: true,
			businessType: true,
			countryCode: true,
			currencyCode: true,
			timezone: true,
			settings: true,
		},
	});

	const defaultStore = await prisma.store.findFirst({
		where: { businessId: user.activeBusinessId, isDefault: true },
		select: { id: true, name: true, code: true, isDefault: true },
	});

	const staffMembership = await prisma.staffMembership.findUnique({
		where: { userId_businessId: { userId: user.id, businessId: user.activeBusinessId } },
		select: { id: true, businessId: true, staffRole: true, isPrimary: true },
	});

	if (!activeBusinessRaw) {
		return {
			user,
			activeBusiness: null,
			defaultStore: defaultStore ?? null,
			staffMembership: staffMembership ?? null,
		};
	}

	const settings = (activeBusinessRaw.settings ?? null) as any;

	const cc = String(activeBusinessRaw.countryCode ?? "").toUpperCase();
	const curCol = String(activeBusinessRaw.currencyCode ?? "").toUpperCase();

	return {
		user,
		activeBusiness: {
			...activeBusinessRaw,

			// Back-compat alias: some clients still read `country`
			country: cc,
			countryCode: cc,

			// Canonical stable field for clients (prefer column; do not depend on settings blob)
			currencyCode: curCol || (typeof settings?.currency === "string" ? String(settings.currency).toUpperCase() : null),

			settings,
		} as any,
		defaultStore: defaultStore ?? null,
		staffMembership: staffMembership ?? null,
	};
}
