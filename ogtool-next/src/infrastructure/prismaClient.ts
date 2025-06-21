// infrastructure/prismaClient.ts

import { PrismaClient } from "../generated/prisma/client";

let prismaMain: PrismaClient;

/**
 * Now returns the intersection type directly,
 * so callers get full IntelliSense on every model.
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prismaMain) prismaMain = new PrismaClient();
  return prismaMain as PrismaClient;
};


