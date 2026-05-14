import {
  apiKeyErrorResponse,
  authenticateBearerApiKey,
} from "@/lib/api-keys";
import {
  createChatJson,
  createChatStream,
  parseChatInput,
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

  const input = parseChatInput(await readJsonBody(request));
  const context = {
    apiKey: authResult.key,
    endpoint: "chat.completions" as const,
  };

  if (input.stream) {
    return streamResponse(createChatStream(input, context));
  }

  return Response.json(createChatJson(input, context));
}
