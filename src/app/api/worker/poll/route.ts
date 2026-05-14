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

  return Response.json({
    type: "no_job",
    message: "Worker polling is connected. Job assignment storage is not implemented yet.",
  });
}
