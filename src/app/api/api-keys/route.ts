import {
  createUserApiKey,
  listUserApiKeys,
} from "@/lib/api-keys";
import { getAuthenticatedDb } from "@/lib/server-context";

export async function GET() {
  const context = await getAuthenticatedDb();
  if ("error" in context) return context.error;

  const keys = await listUserApiKeys(context.db, context.userId);
  return Response.json({ keys });
}

export async function POST(request: Request) {
  const context = await getAuthenticatedDb();
  if ("error" in context) return context.error;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const payload =
    body && typeof body === "object"
      ? (body as { name?: unknown })
      : {};
  const result = await createUserApiKey(context.db, {
    userId: context.userId,
    name: payload.name,
  });

  return Response.json(result, { status: 201 });
}
