import { listUserApiKeys } from "@/lib/api-keys";
import { getPublicAppUrl } from "@/lib/auth/env";
import { getAuthenticatedDb } from "@/lib/server-context";

export async function GET() {
  const context = await getAuthenticatedDb();
  if ("error" in context) return context.error;

  const keys = await listUserApiKeys(context.db, context.userId);
  const firstKey = keys.find((key) => key.status === "active");
  const endpoint = getPublicAppUrl(context.env);

  const script = `#!/usr/bin/env bash
set -euo pipefail

echo "ChatUOS contributor worker bootstrap"
echo "User ID: ${context.userId}"
echo "Endpoint: ${endpoint}"

cat > plans.json <<'JSON'
{
  "endpoint": "${endpoint}",
  "user_id": "${context.userId}",
  "worker_key": "\${CHATUOS_WORKER_KEY:-paste-your-full-api-key-here}",
  "plans": [
    {
      "name": "default-codex-plan",
      "model": "gpt-5.3-codex",
      "codex_home": "~/.codex",
      "workspace_root": "~/.chatuos/jobs",
      "max_concurrency": 1
    }
  ]
}
JSON

echo
echo "Created plans.json."
echo "Set CHATUOS_WORKER_KEY to your full API key before running the Python worker."
echo "Visible key prefix from dashboard: ${firstKey?.keyPrefix ?? "no-key-created-yet"}"
`;

  return new Response(script, {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "content-disposition": 'attachment; filename="chatuos-worker-bootstrap.sh"',
    },
  });
}
