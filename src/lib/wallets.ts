import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { wallets } from "@/lib/db/schema";

const INITIAL_CREDITS = 1000;

export async function ensureUserWallet(db: Database, userId: string) {
  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .get();

  if (existing) return existing;

  const now = new Date();
  const row = {
    id: `wal_${crypto.randomUUID()}`,
    userId,
    balanceCredits: INITIAL_CREDITS,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof wallets.$inferInsert;

  await db.insert(wallets).values(row);
  return row;
}
