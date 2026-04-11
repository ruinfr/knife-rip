import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export type BaltopRow = {
  discordUserId: string;
  cash: bigint;
  bankCash: bigint;
};

const TOP_SQL = 15;

/**
 * Global richest by wallet + bank (same semantics as Discord `.baltop`).
 */
export async function queryBaltopRows(
  prisma: PrismaClient,
): Promise<BaltopRow[]> {
  return prisma.$queryRaw<BaltopRow[]>(Prisma.sql`
    SELECT "discordUserId", "cash", "bankCash"
    FROM "EconomyUser"
    WHERE ("cash" + "bankCash") > 0
    ORDER BY ("cash" + "bankCash") DESC
    LIMIT ${TOP_SQL}
  `);
}

export const BALTOP_LIMIT = TOP_SQL;
