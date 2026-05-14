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
      `OPENAI_API_KEY=${input.apiKey ?? "chatuos_..."}`,
    ].join("\n"),
    curl: [
      `curl ${input.publicAppUrl}/api/gpt/v1/responses \\`,
      `  -H "Authorization: Bearer ${input.apiKey ?? "chatuos_..."}" \\`,
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
  const apiKey = "paste-full-api-key";
  const config = {
    endpoint: input.publicAppUrl,
    user_id: input.userId,
    worker_key: apiKey,
    plans: [
      {
        name: "default-codex",
        model: "gpt-5.3-codex",
        codex_home: "~/.codex",
        workspace_root: "~/.chatuos/jobs/default-codex",
        max_concurrency: 1,
      },
      {
        name: "secondary-codex",
        model: "gpt-5.3-codex",
        codex_home: "~/.codex-secondary",
        workspace_root: "~/.chatuos/jobs/secondary-codex",
        max_concurrency: 1,
      },
    ],
  };

  return {
    endpoint: input.publicAppUrl,
    userId: input.userId,
    apiKey: input.apiKey ?? "Create a contributor API key in Settings",
    installCommand: [
      `curl -fsSL ${input.publicAppUrl}/api/worker/install | env \\`,
      `  CHATUOS_USER_ID="${input.userId}" \\`,
      `  CHATUOS_WORKER_KEY="${apiKey}" \\`,
      "  bash",
    ].join("\n"),
    configJson: JSON.stringify(config, null, 2),
    command: [
      "python -m codex_share_worker \\",
      `  --endpoint ${input.publicAppUrl} \\`,
      `  --worker-key ${apiKey} \\`,
      "  --plans ./plans.json",
    ].join("\n"),
  };
}
