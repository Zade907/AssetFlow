import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __assetflowPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__assetflowPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__assetflowPrisma = prisma;
}
