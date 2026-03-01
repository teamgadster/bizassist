// BizAssist_api
// path: src/modules/pos/pos.service.ts
//
// POS Checkout (Phase 1 readiness):
// - Idempotent checkout by Sale.idempotencyKey (per business)
// - Money computed in BigInt minor units (source of truth)
// - Quantities validated as UDQI decimal strings and persisted in quantityV2
// - Legacy Decimal/Int columns are dual-written for compatibility
// - Discounts support FIXED (minor units) and PERCENT (basis points)

import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "@/core/errors/AppError";
import { prisma } from "@/lib/prisma";
import {
	decimalLikeToMinorUnitsBigInt,
	formatBigIntToMinorUnitsString,
	minorUnitsToDecimalString,
	multiplyMinorByQuantityDecimal,
	parseMinorUnitsStringToBigInt,
} from "@/shared/money/moneyMinor";
import { applyPercentMinor, basisPointsToPercentString, percentStringToBasisPoints } from "@/shared/money/percentMath";
import { normalizeDecimalString } from "@/shared/quantity/quantityDecimal";
import { ModifiersService } from "@/modules/modifiers/modifiers.service";
import { AttributesService } from "@/modules/attributes/attributes.service";

import type { CheckoutInput, CheckoutResult } from "./pos.types";
import {
	createCheckoutTransaction,
	findSaleByIdempotency,
	getActiveDiscountsByIds,
	getDeviceById,
	getProductsByIds,
} from "./pos.repository";

const D0 = new Prisma.Decimal(0);

type CheckoutArgs = {
	activeBusinessId: string;
	userId: string;
	input: CheckoutInput;
};

type CartComputed = {
	productId: string;
	productName: string;
	quantityDecimalString: string;
	quantityDecimal: Prisma.Decimal;
	quantityLegacyInt: number;
	unitPriceMinor: bigint;
	selectedModifierOptionIds: string[];
	selectedAttributes: Array<{
		attributeId: string;
		optionId: string;
		attributeNameSnapshot: string;
		optionNameSnapshot: string;
	}>;
	totalModifiersDeltaMinor: bigint;
	modifierRows: Array<{ modifierOptionId: string; optionName: string; priceDeltaMinor: bigint }>;
	lineTotalMinor: bigint;
};

const modifiersService = new ModifiersService(prisma);
const attributesService = new AttributesService(prisma);

function movementIdempotencyKey(baseKey: string, productId: string): string {
	return crypto.createHash("sha256").update(`${baseKey}:${productId}`).digest("hex");
}

function decimalToLegacyIntHalfUp(value: Prisma.Decimal): number {
	const rounded = value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString();
	const n = Number.parseInt(rounded, 10);
	if (!Number.isSafeInteger(n)) throw new Error("Quantity exceeds legacy Int range.");
	return n;
}

function parseQuantityDecimal(input: string): { raw: string; decimal: Prisma.Decimal; legacyInt: number } {
	const raw = normalizeDecimalString(input);
	const decimal = new Prisma.Decimal(raw);
	if (!decimal.isFinite() || decimal.lte(D0)) {
		throw new Error("Quantity must be greater than zero.");
	}
	return {
		raw,
		decimal,
		legacyInt: decimalToLegacyIntHalfUp(decimal),
	};
}

function parseMinorOrLegacyMoney(input: { minor?: string; legacyDecimal?: string }, fieldName: string): bigint {
	if (input.minor != null) return parseMinorUnitsStringToBigInt(input.minor, fieldName);
	if (input.legacyDecimal != null) return decimalLikeToMinorUnitsBigInt(input.legacyDecimal);
	throw new Error(`${fieldName} is required.`);
}

function readMinorFromRow(row: any, minorField: string, legacyField: string): bigint {
	const minor = row?.[minorField];
	if (typeof minor === "bigint") return minor;
	if (typeof minor === "number" && Number.isFinite(minor)) return BigInt(Math.trunc(minor));
	const legacy = row?.[legacyField];
	if (legacy == null) throw new Error(`${minorField} and ${legacyField} are both null.`);
	return decimalLikeToMinorUnitsBigInt(legacy);
}

export async function checkout(args: CheckoutArgs): Promise<CheckoutResult> {
	const businessId = args.activeBusinessId;
	const input = args.input;
	const idempotencyKey = input.idempotencyKey;

	const existing = await findSaleByIdempotency({ prisma }, businessId, idempotencyKey);
	if (existing) return shapeCheckoutResult(existing);

	let deviceId: string | undefined;
	if (input.deviceId) {
		const device = await getDeviceById({ prisma }, businessId, input.deviceId);
		if (!device) throw new AppError(StatusCodes.NOT_FOUND, "Device not found.", "DEVICE_NOT_FOUND");
		deviceId = device.id;
	}

	const productIds = input.cart.map((item) => item.productId);
	const products = await getProductsByIds({ prisma }, businessId, productIds);
	const productById = new Map(products.map((p) => [p.id, p]));

	const cartComputed: CartComputed[] = [];
	for (const item of input.cart) {
		const product = productById.get(item.productId);
		if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found.", "PRODUCT_NOT_FOUND");
		if (!product.isActive) throw new AppError(StatusCodes.CONFLICT, "Product is inactive.", "PRODUCT_INACTIVE");

		const qty = parseQuantityDecimal(item.quantity);
		const baseUnitPriceMinor = parseMinorOrLegacyMoney(
			{
				minor: item.unitPriceMinor ?? undefined,
				legacyDecimal: item.unitPrice ?? undefined,
			},
			"unitPriceMinor",
		);
		if (baseUnitPriceMinor < 0n) {
			throw new AppError(StatusCodes.BAD_REQUEST, "Invalid unit price.", "INVALID_PRICE");
		}

		const selectedModifierOptionIds = Array.isArray(item.selectedModifierOptionIds)
			? item.selectedModifierOptionIds.map((v) => String(v)).filter(Boolean)
			: [];
		const selectedAttributes = await attributesService.validateSelectionsForCheckout(
			businessId,
			item.productId,
			item.selectedAttributes,
		);
		const selectionValidation = await modifiersService.validateSelectionsForCheckout(
			businessId,
			item.productId,
			selectedModifierOptionIds,
		);
		const expectedDeltaMinor = selectionValidation.deltaMinor;
		const providedDeltaMinor = item.totalModifiersDeltaMinor
			? parseMinorUnitsStringToBigInt(item.totalModifiersDeltaMinor, "totalModifiersDeltaMinor")
			: expectedDeltaMinor;
		if (providedDeltaMinor !== expectedDeltaMinor) {
			throw new AppError(StatusCodes.BAD_REQUEST, "Modifier totals are out of sync.", "MODIFIER_TOTAL_MISMATCH");
		}

		const unitPriceMinor = baseUnitPriceMinor + expectedDeltaMinor;
		const lineTotalMinor = multiplyMinorByQuantityDecimal(unitPriceMinor, qty.raw, 5);
		cartComputed.push({
			productId: item.productId,
			productName: product.name,
			quantityDecimalString: qty.raw,
			quantityDecimal: qty.decimal,
			quantityLegacyInt: qty.legacyInt,
			unitPriceMinor,
			selectedModifierOptionIds,
			selectedAttributes,
			totalModifiersDeltaMinor: expectedDeltaMinor,
			modifierRows: selectionValidation.selectedOptionRows.map((m) => ({
				modifierOptionId: m.id,
				optionName: m.name,
				priceDeltaMinor: m.priceDeltaMinor,
			})),
			lineTotalMinor,
		});
	}

	// Aggregate requested quantities for stock checks/movements.
	const requestedQtyMap = new Map<string, Prisma.Decimal>();
	for (const item of cartComputed) {
		const current = requestedQtyMap.get(item.productId) ?? D0;
		requestedQtyMap.set(item.productId, current.add(item.quantityDecimal));
	}

	for (const product of products) {
		if (!product.trackInventory) continue;
		const requested = requestedQtyMap.get(product.id) ?? D0;
		if (requested.lte(D0)) continue;
		const available = product.onHandCached ?? D0;
		if (available.sub(requested).isNegative()) {
			throw new AppError(
				StatusCodes.CONFLICT,
				`Insufficient stock for "${product.name}". Requested ${requested.toString()} > available ${available.toString()}.`,
				"OUT_OF_STOCK",
			);
		}
	}

	let subtotalMinor = 0n;
	for (const line of cartComputed) subtotalMinor += line.lineTotalMinor;

	const discountIds = (input.discounts ?? []).map((d) => d.discountId);
	const uniqueDiscountIds = [...new Set(discountIds)];
	const activeDiscounts = await getActiveDiscountsByIds({ prisma }, businessId, uniqueDiscountIds);
	const discountById = new Map(activeDiscounts.map((d) => [d.id, d]));
	for (const id of uniqueDiscountIds) {
		if (!discountById.has(id)) {
			throw new AppError(StatusCodes.NOT_FOUND, "Discount not found or inactive.", "DISCOUNT_NOT_FOUND");
		}
	}

	let netBeforeTaxMinor = subtotalMinor;
	const discountSnapshots: Array<{
		discountId: string | null;
		scope: "SALE" | "LINE_ITEM";
		nameSnapshot: string;
		typeSnapshot: "PERCENT" | "FIXED";
		valueSnapshotMinor: bigint;
		amountAppliedMinor: bigint;
		valueSnapshotLegacyDecimal: string;
		amountAppliedLegacyDecimal: string;
	}> = [];

	for (const requested of discountIds) {
		const discount = discountById.get(requested)!;
		let valueSnapshotMinor: bigint;
		let amountAppliedMinor: bigint;
		let valueSnapshotLegacyDecimal: string;

		if (discount.type === "FIXED") {
			valueSnapshotMinor =
				discount.valueMinor != null ? BigInt(discount.valueMinor) : decimalLikeToMinorUnitsBigInt(discount.value);
			if (valueSnapshotMinor < 0n) {
				throw new AppError(StatusCodes.BAD_REQUEST, "Fixed discount cannot be negative.", "DISCOUNT_INVALID_VALUE");
			}
			amountAppliedMinor = valueSnapshotMinor > netBeforeTaxMinor ? netBeforeTaxMinor : valueSnapshotMinor;
			valueSnapshotLegacyDecimal = minorUnitsToDecimalString(valueSnapshotMinor);
		} else {
			valueSnapshotMinor =
				discount.valueMinor != null
					? BigInt(discount.valueMinor)
					: percentStringToBasisPoints(discount.value.toString());
			if (valueSnapshotMinor < 0n || valueSnapshotMinor > 10000n) {
				throw new AppError(
					StatusCodes.BAD_REQUEST,
					"Percent discount must be between 0 and 100.",
					"DISCOUNT_INVALID_VALUE",
				);
			}
			amountAppliedMinor = applyPercentMinor(netBeforeTaxMinor, valueSnapshotMinor);
			if (amountAppliedMinor > netBeforeTaxMinor) amountAppliedMinor = netBeforeTaxMinor;
			valueSnapshotLegacyDecimal = basisPointsToPercentString(valueSnapshotMinor);
		}

		netBeforeTaxMinor -= amountAppliedMinor;
		discountSnapshots.push({
			discountId: discount.id,
			scope: "SALE",
			nameSnapshot: discount.name,
			typeSnapshot: discount.type,
			valueSnapshotMinor,
			amountAppliedMinor,
			valueSnapshotLegacyDecimal,
			amountAppliedLegacyDecimal: minorUnitsToDecimalString(amountAppliedMinor),
		});
	}

	const discountTotalMinor = subtotalMinor - netBeforeTaxMinor;
	const taxTotalMinor = 0n;
	const totalMinor = netBeforeTaxMinor + taxTotalMinor;

	const payments = input.payments.map((p) => {
		const amountMinor = parseMinorOrLegacyMoney(
			{
				minor: p.amountMinor ?? undefined,
				legacyDecimal: p.amount ?? undefined,
			},
			"amountMinor",
		);
		if (amountMinor < 0n) {
			throw new AppError(StatusCodes.BAD_REQUEST, "Invalid payment amount.", "INVALID_PAYMENT_AMOUNT");
		}
		return {
			method: p.method,
			amountMinor,
		};
	});

	let paidTotalMinor = 0n;
	for (const payment of payments) paidTotalMinor += payment.amountMinor;
	if (paidTotalMinor < totalMinor) {
		throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient payment.", "INSUFFICIENT_PAYMENT");
	}

	const trackedProductIds = products.filter((p) => p.trackInventory).map((p) => p.id);
	const movements = trackedProductIds
		.map((productId) => ({
			productId,
			quantityDelta: (requestedQtyMap.get(productId) ?? D0).neg(),
			reason: "SALE" as const,
			idempotencyKey: movementIdempotencyKey(idempotencyKey, productId),
			enforceNonNegative: true,
		}))
		.filter((movement) => movement.quantityDelta.lt(D0));

	const sale = await createCheckoutTransaction(
		{ prisma },
		{
			businessId,
			deviceId,
			idempotencyKey,
			subtotalMinor,
			totalMinor,
			discountTotalMinor,
			taxTotalMinor,
			lineItems: cartComputed.map((li) => ({
				productId: li.productId,
				productName: li.productName,
				quantityDecimal: li.quantityDecimal,
				quantityLegacyInt: li.quantityLegacyInt,
				unitPriceMinor: li.unitPriceMinor,
				lineTotalMinor: li.lineTotalMinor,
				selectedModifierOptionIds: li.selectedModifierOptionIds,
				selectedAttributes: li.selectedAttributes,
				totalModifiersDeltaMinor: li.totalModifiersDeltaMinor,
				modifiers: li.modifierRows,
			})),
			payments,
			discounts: discountSnapshots,
			movements,
		},
	);

	return shapeCheckoutResult(sale);
}

function shapeCheckoutResult(sale: any): CheckoutResult {
	const subtotalMinor = readMinorFromRow(sale, "subtotalMinor", "subtotal");
	const totalMinor = readMinorFromRow(sale, "totalMinor", "total");
	const discountTotalMinor = readMinorFromRow(sale, "discountTotalMinor", "discountTotal");
	const taxTotalMinor = readMinorFromRow(sale, "taxTotalMinor", "taxTotal");

	let paidTotalMinor = 0n;
	for (const p of sale.payments ?? []) {
		paidTotalMinor += readMinorFromRow(p, "amountMinor", "amount");
	}
	const changeDueMinor = paidTotalMinor > totalMinor ? paidTotalMinor - totalMinor : 0n;

	return {
		sale: {
			id: sale.id,
			status: "COMPLETED",
			createdAt: sale.createdAt.toISOString(),
			idempotencyKey: sale.idempotencyKey,
			deviceId: sale.deviceId,
			subtotalMinor: formatBigIntToMinorUnitsString(subtotalMinor),
			totalMinor: formatBigIntToMinorUnitsString(totalMinor),
			discountTotalMinor: formatBigIntToMinorUnitsString(discountTotalMinor),
			taxTotalMinor: formatBigIntToMinorUnitsString(taxTotalMinor),
			subtotal: minorUnitsToDecimalString(subtotalMinor),
			total: minorUnitsToDecimalString(totalMinor),
			discountTotal: minorUnitsToDecimalString(discountTotalMinor),
			taxTotal: minorUnitsToDecimalString(taxTotalMinor),
			lineItems: (sale.lineItems ?? []).map((li: any) => {
				const unitPriceMinor = decimalLikeToMinorUnitsBigInt(li.unitPrice);
				const lineTotalMinor = decimalLikeToMinorUnitsBigInt(li.lineTotal);
				const quantityString =
					li.quantityV2 != null ? normalizeDecimalString(li.quantityV2.toString()) : String(li.quantity ?? "0");
				return {
					id: li.id,
					productId: li.productId,
					productName: li.productName,
					quantity: quantityString,
					unitPriceMinor: formatBigIntToMinorUnitsString(unitPriceMinor),
					lineTotalMinor: formatBigIntToMinorUnitsString(lineTotalMinor),
					selectedModifierOptionIds: Array.isArray(li.selectedModifierOptionIds) ? li.selectedModifierOptionIds : [],
					selectedAttributes: Array.isArray(li.selectedAttributes) ? li.selectedAttributes : [],
					totalModifiersDeltaMinor: formatBigIntToMinorUnitsString(BigInt(li.totalModifiersDeltaMinor ?? 0)),
					unitPrice: minorUnitsToDecimalString(unitPriceMinor),
					lineTotal: minorUnitsToDecimalString(lineTotalMinor),
				};
			}),
			payments: (sale.payments ?? []).map((p: any) => {
				const amountMinor = readMinorFromRow(p, "amountMinor", "amount");
				return {
					id: p.id,
					method: p.method,
					amountMinor: formatBigIntToMinorUnitsString(amountMinor),
					amount: minorUnitsToDecimalString(amountMinor),
				};
			}),
			discounts: (sale.discounts ?? []).map((d: any) => {
				const valueSnapshotMinor =
					d.valueSnapshotMinor != null
						? BigInt(d.valueSnapshotMinor)
						: d.typeSnapshot === "PERCENT"
							? percentStringToBasisPoints(d.valueSnapshot.toString())
							: decimalLikeToMinorUnitsBigInt(d.valueSnapshot);
				const amountAppliedMinor = readMinorFromRow(d, "amountAppliedMinor", "amountApplied");
				return {
					id: d.id,
					discountId: d.discountId ?? null,
					scope: d.scope,
					nameSnapshot: d.nameSnapshot,
					typeSnapshot: d.typeSnapshot,
					valueSnapshotMinor: formatBigIntToMinorUnitsString(valueSnapshotMinor),
					amountAppliedMinor: formatBigIntToMinorUnitsString(amountAppliedMinor),
					valueSnapshot:
						d.typeSnapshot === "PERCENT"
							? basisPointsToPercentString(valueSnapshotMinor)
							: minorUnitsToDecimalString(valueSnapshotMinor),
					amountApplied: minorUnitsToDecimalString(amountAppliedMinor),
				};
			}),
		},
		receipt: {
			saleId: sale.id,
			subtotalMinor: formatBigIntToMinorUnitsString(subtotalMinor),
			taxTotalMinor: formatBigIntToMinorUnitsString(taxTotalMinor),
			discountTotalMinor: formatBigIntToMinorUnitsString(discountTotalMinor),
			totalMinor: formatBigIntToMinorUnitsString(totalMinor),
			paidTotalMinor: formatBigIntToMinorUnitsString(paidTotalMinor),
			changeDueMinor: formatBigIntToMinorUnitsString(changeDueMinor),
			subtotal: minorUnitsToDecimalString(subtotalMinor),
			taxTotal: minorUnitsToDecimalString(taxTotalMinor),
			discountTotal: minorUnitsToDecimalString(discountTotalMinor),
			total: minorUnitsToDecimalString(totalMinor),
			paidTotal: minorUnitsToDecimalString(paidTotalMinor),
			changeDue: minorUnitsToDecimalString(changeDueMinor),
			itemCount: (sale.lineItems ?? []).length,
		},
	};
}
