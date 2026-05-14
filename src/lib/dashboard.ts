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
  const baseUrl = `${input.publicAppUrl}/api/gpt/v1`;
  const apiKey = input.apiKey ?? "chatuos_...";
  const model = "gpt-5.3-codex";

  return {
    endpoint: baseUrl,
    apiKey: input.apiKey ?? "Create an API key in Settings",
    model,
    env: [
      `export OPENAI_BASE_URL=${baseUrl}`,
      `export OPENAI_API_KEY=${apiKey}`,
      `export CHATUOS_API_KEY=${apiKey}`,
    ].join("\n"),
    codexConfig: [
      "# ~/.codex/config.toml",
      `model = "${model}"`,
      'model_provider = "chatuos"',
      "",
      "[model_providers.chatuos]",
      'name = "ChatUOS"',
      `base_url = "${baseUrl}"`,
      'env_key = "CHATUOS_API_KEY"',
      'wire_api = "responses"',
      "",
      "# Then run:",
      `# CHATUOS_API_KEY="${apiKey}" codex -m ${model}`,
    ].join("\n"),
    curl: [
      `curl ${baseUrl}/responses \\`,
      `  -H "Authorization: Bearer ${apiKey}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"model":"${model}","input":"Say hello from ChatUOS"}'`,
    ].join("\n"),
    streamCurl: [
      `curl -N ${baseUrl}/responses \\`,
      `  -H "Authorization: Bearer ${apiKey}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"model":"${model}","input":"Stream a mock Codex response","stream":true}'`,
    ].join("\n"),
    statusCurl: [
      `curl ${baseUrl}/status \\`,
      `  -H "Authorization: Bearer ${apiKey}"`,
    ].join("\n"),
    modelsCurl: [
      `curl ${baseUrl}/models \\`,
      `  -H "Authorization: Bearer ${apiKey}"`,
    ].join("\n"),
  };
}

export function buildWorkerConfig(input: {
  publicAppUrl: string;
  userId: string;
  apiKey: string | null;
}) {
  const apiKey = "paste-full-api-key";
  const configPath = "~/.chatuos/settings.json";
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
      `  --configs ${configPath}`,
    ].join("\n"),
  };
}
