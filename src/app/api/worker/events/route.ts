import {
  apiKeyErrorResponse,
  authenticateBearerApiKey,
} from "@/lib/api-keys";
import { getApiDb } from "@/lib/server-context";

export async function POST(request: Request) {
  const { db } = await getApiDb();
  const authResult = await authenticateBearerApiKey(db, request);

  if (!authResult.ok) {
    return apiKeyErrorResponse(authResult);
  }

  let event: unknown = null;
  try {
    event = await request.json();
  } catch {
    event = null;
  }

  console.log(
    JSON.stringify({
      message: "worker_event_received",
      keyPrefix: authResult.key.keyPrefix,
      event,
    }),
  );

  return Response.json({ ok: true });
}
