import {
  apiKeyErrorResponse,
  authenticateBearerApiKey,
} from "@/lib/api-keys";
import { listModels } from "@/lib/mock-openai";
import { getApiDb } from "@/lib/server-context";
import { ensureUserWallet } from "@/lib/wallets";

export async function GET(request: Request) {
  const { db } = await getApiDb();
  const authResult = await authenticateBearerApiKey(db, request);

  if (!authResult.ok) {
    return apiKeyErrorResponse(authResult);
  }

  const wallet = await ensureUserWallet(db, authResult.key.userId);

  return Response.json({
    object: "chatuos.status",
    user_id: authResult.key.userId,
    key_prefix: `${authResult.key.keyPrefix}...`,
    credits: wallet.balanceCredits,
    remaining_credits: wallet.balanceCredits,
    mode: "mock",
    models: listModels().data.map((model) => model.id),
  });
}
