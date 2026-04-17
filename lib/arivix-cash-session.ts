import { db } from "@/lib/db";

export async function getDiscordAccountIdForUserId(
  internalUserId: string,
): Promise<string | null> {
  const acc = await db.account.findFirst({
    where: { userId: internalUserId, provider: "discord" },
    select: { providerAccountId: true },
  });
  return acc?.providerAccountId ?? null;
}
