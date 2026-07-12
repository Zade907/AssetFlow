import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema";

const categoryInclude = {
  _count: { select: { assets: true } },
} satisfies Prisma.AssetCategoryInclude;

export function listCategories() {
  return prisma.assetCategory.findMany({
    include: categoryInclude,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

function categoryData(input: CreateCategoryInput | UpdateCategoryInput): Prisma.AssetCategoryUpdateInput {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.customFields === undefined
      ? {}
      : { customFields: input.customFields === null ? Prisma.JsonNull : input.customFields as Prisma.InputJsonValue }),
    ...(input.status === undefined ? {} : { status: input.status }),
  };
}

export function createCategory(input: CreateCategoryInput) {
  return prisma.assetCategory.create({
    data: categoryData(input) as Prisma.AssetCategoryCreateInput,
    include: categoryInclude,
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.assetCategory.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Asset category not found");
  }

  return prisma.assetCategory.update({
    where: { id },
    data: categoryData(input),
    include: categoryInclude,
  });
}

export async function deleteCategory(id: string) {
  const category = await prisma.assetCategory.findUnique({
    where: { id },
    include: { _count: { select: { assets: true } } },
  });
  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Asset category not found");
  }
  if (category._count.assets > 0) {
    throw new AppError(
      409,
      "CATEGORY_IN_USE",
      "Asset category cannot be deleted while assets use it",
      { assets: category._count.assets },
    );
  }

  await prisma.assetCategory.delete({ where: { id } });
}
