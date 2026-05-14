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

  return Response.json(
    {
      error: "NOT_IMPLEMENTED",
      message:
        "The OpenAI-compatible chat endpoint is scaffolded. Next step: translate this request into an internal Codex job.",
      owner: authResult.key.userId,
    },
    { status: 501 },
  );
}
