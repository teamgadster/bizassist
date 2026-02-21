// BizAssist_api
// path: src/modules/discounts/discounts.service.ts

import type { PrismaClient, DiscountType } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { env } from "@/core/config/env";
import { parseMinorUnitsStringToBigInt, minorUnitsToDecimalString, decimalLikeToMinorUnitsBigInt } from "@/shared/money/moneyMinor";
import { basisPointsToPercentString, percentStringToBasisPoints } from "@/shared/money/percentMath";
import { DiscountsRepository } from "@/modules/discounts/discounts.repository";
import type { CreateDiscountInput, ListDiscountsQuery, UpdateDiscountInput } from "@/modules/discounts/discounts.types";

function normalizeNote(raw: string | undefined): string | null | undefined {
	if (raw === undefined) return undefined;
	const value = raw.trim().replace(/\s+/g, " ");
	return value.length > 0 ? value : null;
}

function isDiscountNameUniqueViolation(err: unknown): boolean {
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

type NormalizedDiscountValue = {
	type: DiscountType;
	valueLegacyDecimal: string;
	valueMinor: bigint; // FIXED=minor units, PERCENT=basis points
};

function normalizeFixedValue(input: { valueMinor?: string; value?: string }): NormalizedDiscountValue {
	const minor =
		input.valueMinor != null
			? parseMinorUnitsStringToBigInt(input.valueMinor, "valueMinor")
			: input.value != null
				? decimalLikeToMinorUnitsBigInt(input.value)
				: null;

	if (minor == null || minor <= 0n) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Fixed discounts must be greater than 0.",
			"DISCOUNT_INVALID_VALUE",
		);
	}

	return {
		type: "FIXED",
		valueLegacyDecimal: minorUnitsToDecimalString(minor),
		valueMinor: minor,
	};
}

function normalizePercentValue(input: { value?: string }): NormalizedDiscountValue {
	const raw = (input.value ?? "").trim();
	if (!raw) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Percent discounts require value between 0 and 100.00.",
			"DISCOUNT_INVALID_VALUE",
		);
	}

	let bps: bigint;
	try {
		bps = percentStringToBasisPoints(raw);
	} catch {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Percent discounts must be between 0 and 100.00 with up to 2 decimals.",
			"DISCOUNT_INVALID_VALUE",
		);
	}

	if (bps <= 0n) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Percent discounts must be greater than 0 and at most 100.00.",
			"DISCOUNT_INVALID_VALUE",
		);
	}

	return {
		type: "PERCENT",
		valueLegacyDecimal: basisPointsToPercentString(bps),
		valueMinor: bps,
	};
}

function normalizeDiscountValueFromCreate(input: CreateDiscountInput): NormalizedDiscountValue {
	return input.type === "PERCENT"
		? normalizePercentValue({ value: input.value })
		: normalizeFixedValue({ value: input.value, valueMinor: input.valueMinor });
}

function normalizeDiscountValueFromExisting(existing: any): NormalizedDiscountValue {
	if (existing.type === "PERCENT") {
		const bps =
			existing.valueMinor != null ? BigInt(existing.valueMinor) : percentStringToBasisPoints(existing.value.toString());
		return {
			type: "PERCENT",
			valueLegacyDecimal: basisPointsToPercentString(bps),
			valueMinor: bps,
		};
	}
	const minor = existing.valueMinor != null ? BigInt(existing.valueMinor) : decimalLikeToMinorUnitsBigInt(existing.value);
	return {
		type: "FIXED",
		valueLegacyDecimal: minorUnitsToDecimalString(minor),
		valueMinor: minor,
	};
}

function normalizeDiscountValueFromUpdate(existing: any, input: UpdateDiscountInput): NormalizedDiscountValue {
	const nextType = input.type ?? existing.type;
	const isTypeSwitch = input.type !== undefined && input.type !== existing.type;
	const needsRecompute =
		input.type !== undefined || input.value !== undefined || input.valueMinor !== undefined || existing.valueMinor == null;
	if (!needsRecompute) return normalizeDiscountValueFromExisting(existing);

	if (nextType === "PERCENT") {
		if (isTypeSwitch && input.value === undefined) {
			throw new AppError(
				StatusCodes.BAD_REQUEST,
				"Switching to PERCENT requires a percent value.",
				"DISCOUNT_INVALID_VALUE",
			);
		}
		const value =
			input.value !== undefined
				? input.value
				: basisPointsToPercentString(normalizeDiscountValueFromExisting(existing).valueMinor);
		return normalizePercentValue({ value });
	}

	if (isTypeSwitch && input.value === undefined && input.valueMinor === undefined) {
		throw new AppError(
			StatusCodes.BAD_REQUEST,
			"Switching to FIXED requires valueMinor (or legacy value).",
			"DISCOUNT_INVALID_VALUE",
		);
	}

	return normalizeFixedValue({
		value: input.value !== undefined ? input.value : undefined,
		valueMinor:
			input.valueMinor !== undefined
				? input.valueMinor
				: normalizeDiscountValueFromExisting(existing).valueMinor.toString(),
	});
}

export class DiscountsService {
	private repo: DiscountsRepository;

	constructor(prisma: PrismaClient) {
		this.repo = new DiscountsRepository(prisma);
	}

	async list(businessId: string, input: ListDiscountsQuery) {
		const limit = input.limit ?? 200;
		return this.repo.list({
			businessId,
			q: input.q,
			type: input.type,
			isActive: input.isActive,
			includeArchived: input.includeArchived,
			limit,
		});
	}

	async getById(businessId: string, id: string) {
		const item = await this.repo.getDtoById({ businessId, id });
		if (!item) {
			throw new AppError(StatusCodes.NOT_FOUND, "Discount not found.", "DISCOUNT_NOT_FOUND");
		}
		return item;
	}

	async create(businessId: string, input: CreateDiscountInput) {
		const name = input.name.trim();
		const note = normalizeNote(input.note) ?? null;
		const total = await this.repo.countByBusiness({ businessId });
		if (total >= env.maxDiscountsPerBusiness) {
			throw new AppError(
				StatusCodes.CONFLICT,
				`Discount limit reached (max ${env.maxDiscountsPerBusiness}).`,
				"DISCOUNT_LIMIT_REACHED",
				{ limit: env.maxDiscountsPerBusiness },
			);
		}

		const normalizedValue = normalizeDiscountValueFromCreate(input);

		try {
			return this.repo.create({
				businessId,
				name,
				note,
				type: normalizedValue.type,
				valueLegacyDecimal: normalizedValue.valueLegacyDecimal,
				valueMinor: normalizedValue.valueMinor,
				isStackable: input.isStackable ?? false,
				isActive: input.isActive ?? true,
			});
		} catch (err) {
			if (isDiscountNameUniqueViolation(err)) {
				throw new AppError(StatusCodes.CONFLICT, "Discount name already exists.", "DISCOUNT_NAME_EXISTS");
			}
			throw err;
		}
	}

	async update(businessId: string, id: string, input: UpdateDiscountInput) {
		const existing = await this.repo.getById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Discount not found.", "DISCOUNT_NOT_FOUND");
		}
		if (!existing.isActive) {
			throw new AppError(StatusCodes.CONFLICT, "Archived discounts are read-only.", "DISCOUNT_ARCHIVED_READ_ONLY");
		}

		const note = normalizeNote(input.note);
		const normalizedValue = normalizeDiscountValueFromUpdate(existing, input);

		let updated;
		try {
			updated = await this.repo.updateScoped({
				businessId,
				id,
				data: {
					...(input.name ? { name: input.name.trim() } : {}),
					...(input.note !== undefined ? { note: note ?? null } : {}),
					...(input.type !== undefined ? { type: normalizedValue.type } : {}),
					...(input.value !== undefined || input.valueMinor !== undefined || input.type !== undefined
						? {
								valueLegacyDecimal: normalizedValue.valueLegacyDecimal,
								valueMinor: normalizedValue.valueMinor,
						  }
						: {}),
					...(input.isStackable !== undefined ? { isStackable: input.isStackable } : {}),
				},
			});
		} catch (err) {
			if (isDiscountNameUniqueViolation(err)) {
				throw new AppError(StatusCodes.CONFLICT, "Discount name already exists.", "DISCOUNT_NAME_EXISTS");
			}
			throw err;
		}

		if (!updated) {
			throw new AppError(StatusCodes.NOT_FOUND, "Discount not found.", "DISCOUNT_NOT_FOUND");
		}
		return updated;
	}

	async archive(businessId: string, id: string) {
		const existing = await this.repo.getById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Discount not found.", "DISCOUNT_NOT_FOUND");
		}
		if (existing.isActive === false) return;
		await this.repo.archive({ businessId, id });
	}

	async restore(businessId: string, id: string) {
		const existing = await this.repo.getById({ businessId, id });
		if (!existing) {
			throw new AppError(StatusCodes.NOT_FOUND, "Discount not found.", "DISCOUNT_NOT_FOUND");
		}
		if (existing.isActive === true) return;
		await this.repo.restore({ businessId, id });
	}
}
