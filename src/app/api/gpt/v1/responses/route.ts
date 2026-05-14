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
        "The GPT routing gateway is scaffolded. Next step: enqueue this request and stream a contributor worker result.",
      owner: authResult.key.userId,
    },
    { status: 501 },
  );
}
