import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { workerPlans } from "@/lib/db/schema";
import { hashApiKey, type AuthenticatedApiKey } from "@/lib/api-keys";

export type WorkerProfileListItem = {
  id: string;
  name: string;
  status: string;
  maxConcurrency: number;
  workerKeyPrefix: string;
  lastSeenAt: string | null;
  createdAt: string;
};

type WorkerProfileInput = {
  name: string;
  maxConcurrency: number;
};

function serializeWorkerProfile(
  row: typeof workerPlans.$inferSelect,
): WorkerProfileListItem {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    maxConcurrency: row.maxAccounts,
    workerKeyPrefix: row.workerTokenPrefix,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeProfileName(value: unknown) {
  if (typeof value !== "string") return "default-codex";
  const compact = value.trim().replace(/\s+/g, "-").slice(0, 64);
  return compact || "default-codex";
}

function normalizeMaxConcurrency(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.trunc(parsed), 1), 16);
}

export function parseWorkerProfiles(value: unknown): WorkerProfileInput[] {
  const rawPlans =
    value && typeof value === "object" && Array.isArray((value as { plans?: unknown }).plans)
      ? (value as { plans: unknown[] }).plans
      : [];

  const profiles = rawPlans
    .filter((plan): plan is Record<string, unknown> => Boolean(plan) && typeof plan === "object")
    .map((plan) => ({
      name: normalizeProfileName(plan.name),
      maxConcurrency: normalizeMaxConcurrency(plan.max_concurrency),
    }));

  return profiles.length > 0 ? profiles : [{ name: "default-codex", maxConcurrency: 1 }];
}

export async function listUserWorkerProfiles(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(workerPlans)
    .where(and(eq(workerPlans.userId, userId), eq(workerPlans.status, "active")))
    .orderBy(desc(workerPlans.lastSeenAt), desc(workerPlans.createdAt));

  return rows.map(serializeWorkerProfile);
}

export async function recordWorkerProfiles(
  db: Database,
  input: {
    key: AuthenticatedApiKey;
    profiles: WorkerProfileInput[];
  },
) {
  const now = new Date();

  for (const profile of input.profiles) {
    const profileHash = await hashApiKey(`${input.key.id}:${profile.name}`);
    const existing = await db
      .select({ id: workerPlans.id })
      .from(workerPlans)
      .where(eq(workerPlans.workerTokenHash, profileHash))
      .get();

    if (existing) {
      await db
        .update(workerPlans)
        .set({
          name: profile.name,
          status: "active",
          maxAccounts: profile.maxConcurrency,
          workerTokenPrefix: input.key.keyPrefix,
          lastSeenAt: now,
        })
        .where(eq(workerPlans.id, existing.id));
      continue;
    }

    await db.insert(workerPlans).values({
      id: `wpr_${crypto.randomUUID()}`,
      userId: input.key.userId,
      name: profile.name,
      status: "active",
      maxAccounts: profile.maxConcurrency,
      workerTokenHash: profileHash,
      workerTokenPrefix: input.key.keyPrefix,
      lastSeenAt: now,
      createdAt: now,
    });
  }
}
