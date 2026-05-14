import { getAppEnv, getPublicAppUrl } from "@/lib/auth/env";

export async function GET() {
  const endpoint = getPublicAppUrl(await getAppEnv());

  const script = `#!/usr/bin/env bash
set -euo pipefail

: "\${CHATUOS_USER_ID:?Set CHATUOS_USER_ID to your dashboard user id}"
: "\${CHATUOS_WORKER_KEY:?Set CHATUOS_WORKER_KEY to your full ChatUOS API key}"

CONFIG_PATH="\${CHATUOS_CONFIG_PATH:-$HOME/.chatuos/settings.json}"
if [[ "$CONFIG_PATH" == "~/"* ]]; then
  CONFIG_PATH="$HOME/\${CONFIG_PATH:2}"
fi
CONFIG_DIR="$(dirname "$CONFIG_PATH")"
mkdir -p "$CONFIG_DIR"

python3 -m pip install --user --upgrade "git+https://github.com/royguo/chatuos.git#subdirectory=worker"

cat > "$CONFIG_PATH" <<JSON
{
  "endpoint": "${endpoint}",
  "user_id": "\${CHATUOS_USER_ID}",
  "worker_key": "\${CHATUOS_WORKER_KEY}",
  "plans": [
    {
      "name": "default-codex",
      "model": "gpt-5.3-codex",
      "codex_home": "\${CHATUOS_CODEX_HOME:-$HOME/.codex}",
      "workspace_root": "$HOME/.chatuos/jobs/default-codex",
      "max_concurrency": 1
    }
  ]
}
JSON

echo "ChatUOS worker installed."
echo "Config: $CONFIG_PATH"
echo "Start worker:"
echo "python3 -m codex_share_worker --configs $CONFIG_PATH"
`;

  return new Response(script, {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
