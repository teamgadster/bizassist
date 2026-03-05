import { Router } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { authMiddleware } from "@/core/middleware/auth";
import { requireActiveBusiness } from "@/core/middleware/requireActiveBusiness";
import { AppError } from "@/core/errors/AppError";
import { prisma } from "@/lib/prisma";
import { MAX_OPTION_SETS_PER_BUSINESS, MAX_OPTION_VALUES_PER_SET } from "@/shared/catalogLimits";
import { FIELD_LIMITS } from "@/shared/fieldLimits.server";
import { trimmedStringBase, uuidSchema, zSanitizedString } from "@/shared/validators/zod.shared";

export const optionsRouter = Router();

const optionSetNameSchema = zSanitizedString(
  trimmedStringBase().min(FIELD_LIMITS.modifierSetNameMin).max(FIELD_LIMITS.modifierSetName),
  { allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
);
const optionValueNameSchema = zSanitizedString(
  trimmedStringBase().min(FIELD_LIMITS.modifierNameMin).max(FIELD_LIMITS.modifierName),
  { allowNewlines: false, allowTabs: false, normalizeWhitespace: true },
);
const optionSetIdParamSchema = z.object({ id: uuidSchema });
const optionValueIdParamSchema = z.object({ id: uuidSchema });
const listOptionSetsQuerySchema = z.object({
  includeArchived: z
    .preprocess(
      (v) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : v),
      z.boolean().optional(),
    )
    .optional(),
});
const createOptionSetSchema = z.object({
  name: optionSetNameSchema,
  displayName: optionSetNameSchema.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
const updateOptionSetSchema = z
  .object({
    name: optionSetNameSchema.optional(),
    displayName: optionSetNameSchema.optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });
const createOptionValueSchema = z.object({
  name: optionValueNameSchema,
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
const updateOptionValueSchema = z
  .object({
    name: optionValueNameSchema.optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update." });

function getBusinessId(req: any): string {
  return req.user.activeBusinessId;
}

function mapSet(set: any) {
  const values = (set.optionValues ?? []).map((value: any) => ({
    id: value.id,
    optionSetId: value.optionSetId,
    name: value.value,
    sortOrder: value.sortOrder,
    isArchived: !value.isActive,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  }));
  return {
    id: set.id,
    name: set.name,
    displayName: set.displayName,
    sortOrder: set.sortOrder,
    isArchived: !set.isActive,
    attachedProductCount: Array.isArray(set.productLinks) ? set.productLinks.length : 0,
    activeValuesCount: values.filter((v: { isArchived: boolean }) => !v.isArchived).length,
    archivedValuesCount: values.filter((v: { isArchived: boolean }) => v.isArchived).length,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    values,
  };
}

async function getOptionSetOr404(businessId: string, id: string) {
  const set = await prisma.optionSet.findFirst({
    where: { businessId, id },
    include: {
      optionValues: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      productLinks: { select: { productId: true } },
    },
  });
  if (!set) throw new AppError(StatusCodes.NOT_FOUND, "Option set not found.", "OPTION_SET_NOT_FOUND");
  return set;
}

optionsRouter.use(authMiddleware);
optionsRouter.use(requireActiveBusiness);

optionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const query = listOptionSetsQuerySchema.parse(req.query);
    const sets = await prisma.optionSet.findMany({
      where: { businessId, ...(query.includeArchived ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        optionValues: {
          where: query.includeArchived ? undefined : { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        productLinks: { select: { productId: true } },
      },
    });
    res.status(StatusCodes.OK).json({ success: true, data: { items: sets.map(mapSet) } });
  }),
);

optionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionSetIdParamSchema.parse(req.params);
    const set = await getOptionSetOr404(businessId, id);
    res.status(StatusCodes.OK).json({ success: true, data: { item: mapSet(set) } });
  }),
);

optionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const body = createOptionSetSchema.parse(req.body);
    const count = await prisma.optionSet.count({ where: { businessId } });
    if (count >= MAX_OPTION_SETS_PER_BUSINESS) {
      throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, `Max ${MAX_OPTION_SETS_PER_BUSINESS} option sets per business.`, "OPTION_SET_LIMIT_REACHED");
    }
    const duplicate = await prisma.optionSet.findFirst({
      where: { businessId, isActive: true, nameNormalized: body.name.trim().toLowerCase() },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "An active option set with this name already exists.", "OPTION_SET_NAME_DUPLICATE");
    }
    const created = await prisma.optionSet.create({
      data: {
        businessId,
        name: body.name,
        displayName: body.displayName ?? body.name,
        nameNormalized: body.name.trim().toLowerCase(),
        sortOrder: body.sortOrder ?? count,
      },
      include: {
        optionValues: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        productLinks: { select: { productId: true } },
      },
    });
    res.status(StatusCodes.CREATED).json({ success: true, data: { item: mapSet(created) } });
  }),
);

optionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionSetIdParamSchema.parse(req.params);
    const body = updateOptionSetSchema.parse(req.body);
    await getOptionSetOr404(businessId, id);
    if (body.name) {
      const duplicate = await prisma.optionSet.findFirst({
        where: {
          businessId,
          id: { not: id },
          isActive: true,
          nameNormalized: body.name.trim().toLowerCase(),
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "An active option set with this name already exists.", "OPTION_SET_NAME_DUPLICATE");
      }
    }
    const updated = await prisma.optionSet.update({
      where: { id },
      data: {
        name: body.name,
        displayName: body.displayName ?? (body.name !== undefined ? body.name : undefined),
        nameNormalized: body.name ? body.name.trim().toLowerCase() : undefined,
        sortOrder: body.sortOrder,
      },
      include: {
        optionValues: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        productLinks: { select: { productId: true } },
      },
    });
    res.status(StatusCodes.OK).json({ success: true, data: { item: mapSet(updated) } });
  }),
);

optionsRouter.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionSetIdParamSchema.parse(req.params);
    await getOptionSetOr404(businessId, id);
    await prisma.optionSet.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
    res.status(StatusCodes.OK).json({ success: true });
  }),
);

optionsRouter.post(
  "/:id/restore",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionSetIdParamSchema.parse(req.params);
    await getOptionSetOr404(businessId, id);
    await prisma.optionSet.update({ where: { id }, data: { isActive: true, archivedAt: null } });
    res.status(StatusCodes.OK).json({ success: true });
  }),
);

optionsRouter.post(
  "/:id/values",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionSetIdParamSchema.parse(req.params);
    const body = createOptionValueSchema.parse(req.body);
    await getOptionSetOr404(businessId, id);
    const count = await prisma.optionValue.count({ where: { businessId, optionSetId: id } });
    if (count >= MAX_OPTION_VALUES_PER_SET) {
      throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, `Max ${MAX_OPTION_VALUES_PER_SET} values per option set.`, "OPTION_VALUE_LIMIT_REACHED");
    }
    const duplicate = await prisma.optionValue.findFirst({
      where: {
        businessId,
        optionSetId: id,
        isActive: true,
        valueNormalized: body.name.trim().toLowerCase(),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "An active option value with this name already exists.", "OPTION_VALUE_NAME_DUPLICATE");
    }
    await prisma.optionValue.create({
      data: {
        businessId,
        optionSetId: id,
        value: body.name,
        valueNormalized: body.name.trim().toLowerCase(),
        sortOrder: body.sortOrder ?? count,
      },
    });
    const set = await getOptionSetOr404(businessId, id);
    res.status(StatusCodes.CREATED).json({ success: true, data: { item: mapSet(set) } });
  }),
);

optionsRouter.patch(
  "/values/:id",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionValueIdParamSchema.parse(req.params);
    const body = updateOptionValueSchema.parse(req.body);
    const value = await prisma.optionValue.findFirst({ where: { businessId, id }, select: { id: true, optionSetId: true } });
    if (!value) throw new AppError(StatusCodes.NOT_FOUND, "Option value not found.", "OPTION_VALUE_NOT_FOUND");
    if (body.name) {
      const duplicate = await prisma.optionValue.findFirst({
        where: {
          businessId,
          optionSetId: value.optionSetId,
          id: { not: id },
          isActive: true,
          valueNormalized: body.name.trim().toLowerCase(),
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "An active option value with this name already exists.", "OPTION_VALUE_NAME_DUPLICATE");
      }
    }
    await prisma.optionValue.update({
      where: { id },
      data: {
        value: body.name,
        valueNormalized: body.name ? body.name.trim().toLowerCase() : undefined,
        sortOrder: body.sortOrder,
      },
    });
    const set = await getOptionSetOr404(businessId, value.optionSetId);
    res.status(StatusCodes.OK).json({ success: true, data: { item: mapSet(set) } });
  }),
);

optionsRouter.post(
  "/values/:id/archive",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionValueIdParamSchema.parse(req.params);
    const value = await prisma.optionValue.findFirst({ where: { businessId, id }, select: { id: true, optionSetId: true } });
    if (!value) throw new AppError(StatusCodes.NOT_FOUND, "Option value not found.", "OPTION_VALUE_NOT_FOUND");
    await prisma.optionValue.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
    const set = await getOptionSetOr404(businessId, value.optionSetId);
    res.status(StatusCodes.OK).json({ success: true, data: { item: mapSet(set) } });
  }),
);

optionsRouter.post(
  "/values/:id/restore",
  asyncHandler(async (req, res) => {
    const businessId = getBusinessId(req);
    const { id } = optionValueIdParamSchema.parse(req.params);
    const value = await prisma.optionValue.findFirst({ where: { businessId, id }, select: { id: true, optionSetId: true } });
    if (!value) throw new AppError(StatusCodes.NOT_FOUND, "Option value not found.", "OPTION_VALUE_NOT_FOUND");
    await prisma.optionValue.update({ where: { id }, data: { isActive: true, archivedAt: null } });
    const set = await getOptionSetOr404(businessId, value.optionSetId);
    res.status(StatusCodes.OK).json({ success: true, data: { item: mapSet(set) } });
  }),
);
