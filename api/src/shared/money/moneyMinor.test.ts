// BizAssist_api
// path: src/shared/money/moneyMinor.test.ts

import { describe, expect, test } from "@jest/globals";

import {
	decimalStringToMinorUnitsBigInt,
	multiplyMinorByQuantityDecimal,
	minorUnitsToDecimalString,
} from "@/shared/money/moneyMinor";
import { applyPercentMinor, percentStringToBasisPoints } from "@/shared/money/percentMath";

describe("moneyMinor", () => {
	test("decimal money converts to minor units with HALF_UP rounding", () => {
		expect(decimalStringToMinorUnitsBigInt("12.344")).toBe(1234n);
		expect(decimalStringToMinorUnitsBigInt("12.345")).toBe(1235n);
		expect(decimalStringToMinorUnitsBigInt("0.005")).toBe(1n);
	});

	test("quantity multiplication uses scaled decimal + HALF_UP", () => {
		const totalMinor = multiplyMinorByQuantityDecimal(1299n, "1.25000", 5);
		expect(totalMinor).toBe(1624n);
		expect(minorUnitsToDecimalString(totalMinor)).toBe("16.24");
	});

	test("percent discounts use basis points and HALF_UP", () => {
		expect(percentStringToBasisPoints("10.25")).toBe(1025n);
		expect(applyPercentMinor(999n, 1025n)).toBe(102n);
		expect(applyPercentMinor(105n, 1000n)).toBe(11n);
	});
});
