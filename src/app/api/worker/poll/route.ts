import {
  apiKeyErrorResponse,
  authenticateBearerApiKey,
} from "@/lib/api-keys";
import { getApiDb } from "@/lib/server-context";
import {
  parseWorkerProfiles,
  recordWorkerProfiles,
} from "@/lib/worker-profiles";

export async function POST(request: Request) {
  const { db } = await getApiDb();
  const authResult = await authenticateBearerApiKey(db, request);

  if (!authResult.ok) {
    return apiKeyErrorResponse(authResult);
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const profiles = parseWorkerProfiles(body);
  await recordWorkerProfiles(db, {
    key: authResult.key,
    profiles,
  });

  return Response.json({
    type: "no_job",
    profiles_seen: profiles.length,
    message: "Worker polling is connected. Job assignment storage is not implemented yet.",
  });
}
