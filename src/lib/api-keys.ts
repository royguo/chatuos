import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

const KEY_PREFIX = "chatuos";
const KEY_VISIBLE_PREFIX_LENGTH = 18;
const DEFAULT_KEY_NAME = "Default access key";
const MAX_KEY_NAME_LENGTH = 64;

export type ApiKeyListItem = {
  id: string;
  name: string;
  purpose: string;
  keyPrefix: string;
  status: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type AuthenticatedApiKey = {
  id: string;
  userId: string;
  purpose: string;
  keyPrefix: string;
};

export type ApiKeyAuthResult =
  | { ok: true; key: AuthenticatedApiKey }
  | {
      ok: false;
      status: 401 | 403;
      error: "MISSING_BEARER_TOKEN" | "INVALID_API_KEY" | "REVOKED_API_KEY";
      message: string;
    };

function normalizeName(name: unknown) {
  if (typeof name !== "string") return DEFAULT_KEY_NAME;
  const compact = name.trim().replace(/\s+/g, " ");
  return compact ? compact.slice(0, MAX_KEY_NAME_LENGTH) : DEFAULT_KEY_NAME;
}

function normalizePurpose(purpose: unknown) {
  if (purpose === "consumer" || purpose === "contributor" || purpose === "both") {
    return purpose;
  }

  return "both";
}

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeApiKey(row: typeof apiKeys.$inferSelect): ApiKeyListItem {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    keyPrefix: row.keyPrefix,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: serializeDate(row.lastUsedAt),
  };
}

function generateApiKeyValue() {
  const random = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  return `${KEY_PREFIX}_${random}`;
}

export async function hashApiKey(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function listUserApiKeys(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));

  return rows.map(serializeApiKey);
}

export async function createUserApiKey(
  db: Database,
  input: { userId: string; name?: unknown; purpose?: unknown },
) {
  const value = generateApiKeyValue();
  const now = new Date();
  const row = {
    id: `key_${crypto.randomUUID()}`,
    userId: input.userId,
    name: normalizeName(input.name),
    purpose: normalizePurpose(input.purpose),
    keyHash: await hashApiKey(value),
    keyPrefix: value.slice(0, KEY_VISIBLE_PREFIX_LENGTH),
    status: "active",
    lastUsedAt: null,
    createdAt: now,
  } satisfies typeof apiKeys.$inferInsert;

  await db.insert(apiKeys).values(row);

  return {
    key: value,
    item: serializeApiKey(row),
  };
}

export async function revokeUserApiKey(
  db: Database,
  input: { userId: string; keyId: string },
) {
  const existing = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, input.userId)))
    .get();

  if (!existing) return false;

  await db
    .update(apiKeys)
    .set({ status: "revoked" })
    .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, input.userId)));

  return true;
}

export async function authenticateBearerApiKey(
  db: Database,
  request: Request,
): Promise<ApiKeyAuthResult> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const rawKey = match?.[1]?.trim();

  if (!rawKey) {
    return {
      ok: false,
      status: 401,
      error: "MISSING_BEARER_TOKEN",
      message: "Provide an API key in the Authorization bearer header.",
    };
  }

  const keyHash = await hashApiKey(rawKey);
  const row = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .get();

  if (!row) {
    return {
      ok: false,
      status: 403,
      error: "INVALID_API_KEY",
      message: "The API key is invalid.",
    };
  }

  if (row.status !== "active") {
    return {
      ok: false,
      status: 403,
      error: "REVOKED_API_KEY",
      message: "The API key is not active.",
    };
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return {
    ok: true,
    key: {
      id: row.id,
      userId: row.userId,
      purpose: row.purpose,
      keyPrefix: row.keyPrefix,
    },
  };
}

export function apiKeyErrorResponse(result: Extract<ApiKeyAuthResult, { ok: false }>) {
  return Response.json(
    {
      error: result.error,
      message: result.message,
    },
    { status: result.status },
  );
}
