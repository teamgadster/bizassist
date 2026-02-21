import { beforeEach, describe, expect, jest, test } from "@jest/globals";

import { commitUploadedObject } from "@/modules/media/media.service";
import { MAX_PRODUCT_IMAGES } from "@/shared/catalogLimits";

const mockProductFindFirst = jest.fn<(...args: any[]) => Promise<any>>();
const mockTransaction = jest.fn<(...args: any[]) => Promise<any>>();
const mockVerifyUploadedObject = jest.fn<(...args: any[]) => Promise<any>>();
const mockGetPublicUrl = jest.fn<(...args: any[]) => any>();
const mockStorageFrom = jest.fn<(...args: any[]) => any>();

jest.mock("@/core/config/env", () => ({
	env: {
		supabaseEnabled: true,
		supabaseUrl: "https://example.supabase.co",
		supabaseServiceRoleKey: "service-role-key",
		supabaseStorageProductBucket: "product-bucket",
	},
}));

jest.mock("@/lib/prisma", () => ({
	prisma: {
		product: {
			findFirst: (...args: unknown[]) => mockProductFindFirst(...args),
		},
		$transaction: (...args: unknown[]) => mockTransaction(...args),
	},
}));

jest.mock("@/lib/supabase/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({
		storage: {
			from: (...args: unknown[]) => mockStorageFrom(...args),
		},
	}),
}));

jest.mock("@/modules/media/media.verify", () => ({
	verifyUploadedObject: (...args: unknown[]) => mockVerifyUploadedObject(...args),
}));

jest.mock("@/modules/media/media.resolve", () => ({
	resolveProductImageUrl: jest.fn(async (value: string | null) => value),
}));

describe("media product-image cap", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockProductFindFirst.mockResolvedValue({ id: "product_1", primaryImageUrl: null });
		mockVerifyUploadedObject.mockResolvedValue({ contentType: "image/jpeg", contentLength: 5120 });
		mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example.com/image.jpg" } });
		mockStorageFrom.mockReturnValue({ getPublicUrl: mockGetPublicUrl, remove: jest.fn() });
	});

	test("rejects commit when non-primary image exceeds per-product cap", async () => {
		const tx = {
			productImage: {
				findFirst: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(null),
				count: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(MAX_PRODUCT_IMAGES),
				create: jest.fn<(...args: any[]) => Promise<any>>(),
				update: jest.fn<(...args: any[]) => Promise<any>>(),
				updateMany: jest.fn<(...args: any[]) => Promise<any>>(),
			},
			product: {
				update: jest.fn<(...args: any[]) => Promise<any>>(),
			},
		};

		mockTransaction.mockImplementation(async (callback: any) => callback(tx));

		await expect(
			commitUploadedObject(
				{ id: "user_1", activeBusinessId: "biz_1" },
				{
					kind: "product-image",
					bucket: "product-bucket",
					path: "business/biz_1/products/product_1/gallery_01.jpg",
					productId: "product_1",
					isPrimary: false,
					sortOrder: 1,
				} as any,
			),
		).rejects.toMatchObject({
			code: "MEDIA_LIMIT_REACHED",
		});

		expect(tx.productImage.count).toHaveBeenCalledWith({
			where: { businessId: "biz_1", productId: "product_1" },
		});
		expect(tx.productImage.create).not.toHaveBeenCalled();
	});
});
