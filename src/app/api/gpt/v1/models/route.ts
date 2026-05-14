import {
  apiKeyErrorResponse,
  authenticateBearerApiKey,
} from "@/lib/api-keys";
import { listModels } from "@/lib/mock-openai";
import { getApiDb } from "@/lib/server-context";

export async function GET(request: Request) {
  const { db } = await getApiDb();
  const authResult = await authenticateBearerApiKey(db, request);

  if (!authResult.ok) {
    return apiKeyErrorResponse(authResult);
  }

  return Response.json(listModels());
}
