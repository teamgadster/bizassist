// BizAssist_api
// path: src/shared/money/percentMath.ts

import { divideRoundHalfUp } from "@/shared/money/moneyMinor";
import { parseDecimalStringToScaledInt } from "@/shared/quantity/quantityDecimal";

const MAX_PERCENT_BASIS_POINTS = 10000n; // 100.00%

export function percentStringToBasisPoints(percent: string): bigint {
	const bps = parseDecimalStringToScaledInt(percent, 2);
	if (bps < 0n || bps > MAX_PERCENT_BASIS_POINTS) {
		throw new Error("Percent value must be between 0 and 100.00.");
	}
	return bps;
}

export function basisPointsToPercentString(bps: bigint): string {
	if (bps < 0n || bps > MAX_PERCENT_BASIS_POINTS) {
		throw new Error("Basis points out of range.");
	}

	const whole = bps / 100n;
	const frac = bps % 100n;
	const fracStr = frac.toString().padStart(2, "0");
	return `${whole.toString()}.${fracStr}`;
}

export function applyPercentMinor(subtotalMinor: bigint, basisPoints: bigint): bigint {
	if (subtotalMinor < 0n) throw new Error("subtotalMinor cannot be negative.");
	if (basisPoints < 0n || basisPoints > MAX_PERCENT_BASIS_POINTS) {
		throw new Error("basisPoints out of range.");
	}
	const numerator = subtotalMinor * basisPoints;
	return divideRoundHalfUp(numerator, 10000n);
}

