import {
  apiKeyErrorResponse,
  authenticateBearerApiKey,
} from "@/lib/api-keys";
import {
  createResponsesJson,
  createResponsesStream,
  parseResponsesInput,
  readJsonBody,
  streamResponse,
} from "@/lib/mock-openai";
import { getApiDb } from "@/lib/server-context";

export async function POST(request: Request) {
  const { db } = await getApiDb();
  const authResult = await authenticateBearerApiKey(db, request);

  if (!authResult.ok) {
    return apiKeyErrorResponse(authResult);
  }

  const input = parseResponsesInput(await readJsonBody(request));
  const context = {
    apiKey: authResult.key,
    endpoint: "responses" as const,
  };

  if (input.stream) {
    return streamResponse(createResponsesStream(input, context));
  }

  return Response.json(createResponsesJson(input, context));
}
