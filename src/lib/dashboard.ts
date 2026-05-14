import type { Session } from "next-auth";
import type { ApiKeyListItem } from "@/lib/api-keys";

export type DashboardConfig = {
  user: NonNullable<Session["user"]>;
  publicAppUrl: string;
  credits: number;
  apiKeys: ApiKeyListItem[];
};

export function buildConsumerConfig(input: {
  publicAppUrl: string;
  apiKey: string | null;
}) {
  return {
    endpoint: `${input.publicAppUrl}/api/gpt/v1`,
    apiKey: input.apiKey ?? "Create an API key in Settings",
    model: "gpt-5.3-codex",
    env: [
      `OPENAI_BASE_URL=${input.publicAppUrl}/api/gpt/v1`,
      `OPENAI_API_KEY=${input.apiKey ?? "gsp_..."}`,
    ].join("\n"),
    curl: [
      `curl ${input.publicAppUrl}/api/gpt/v1/responses \\`,
      `  -H "Authorization: Bearer ${input.apiKey ?? "gsp_..."}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"model":"gpt-5.3-codex","input":"Say hello"}'`,
    ].join("\n"),
  };
}

export function buildWorkerConfig(input: {
  publicAppUrl: string;
  userId: string;
  apiKey: string | null;
}) {
  return {
    endpoint: input.publicAppUrl,
    userId: input.userId,
    apiKey: input.apiKey ?? "Create a contributor API key in Settings",
    command: [
      "python -m codex_share_worker \\",
      `  --endpoint ${input.publicAppUrl} \\`,
      `  --worker-key ${input.apiKey ?? "gsp_..."} \\`,
      "  --plans ./plans.json",
    ].join("\n"),
  };
}
