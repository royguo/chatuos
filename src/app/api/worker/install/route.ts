import { getAppEnv, getPublicAppUrl } from "@/lib/auth/env";

export async function GET() {
  const endpoint = getPublicAppUrl(await getAppEnv());

  const script = `#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="\${CHATUOS_ENDPOINT:-${endpoint}}"
DRY_RUN="\${CHATUOS_DRY_RUN:-0}"

fail() {
  echo "ERROR: $*" >&2
  echo "Re-copy the worker install command from the ChatUOS dashboard and replace paste-full-api-key with your full key." >&2
  exit 1
}

info() {
  echo "==> $*"
}

: "\${CHATUOS_USER_ID:?Set CHATUOS_USER_ID to your dashboard user id}"
: "\${CHATUOS_WORKER_KEY:?Set CHATUOS_WORKER_KEY to your full ChatUOS API key}"

if [[ "\${CHATUOS_USER_ID}" == "paste-user-id-here" || "\${CHATUOS_USER_ID}" == *"..."* ]]; then
  fail "CHATUOS_USER_ID is not a real dashboard user id."
fi

if [[ "\${CHATUOS_WORKER_KEY}" == "paste-full-api-key" || "\${CHATUOS_WORKER_KEY}" == *"..."* ]]; then
  fail "CHATUOS_WORKER_KEY is still the placeholder."
fi

command -v python3 >/dev/null 2>&1 || fail "python3 is required before installing the worker."
python3 -m pip --version >/dev/null 2>&1 || fail "python3 -m pip is required before installing the worker."
python3 - <<'PY'
from __future__ import annotations

import sys

if sys.version_info < (3, 9):
    print("ERROR: Python 3.9 or newer is required.", file=sys.stderr)
    sys.exit(1)
PY

info "Validating ChatUOS user id and worker key"
CHATUOS_ENDPOINT="$ENDPOINT" python3 <<'PY'
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

endpoint = os.environ["CHATUOS_ENDPOINT"].rstrip("/")
worker_key = os.environ["CHATUOS_WORKER_KEY"]
expected_user_id = os.environ["CHATUOS_USER_ID"]

request = urllib.request.Request(
    f"{endpoint}/api/gpt/v1/status",
    headers={
        "Authorization": f"Bearer {worker_key}",
        "User-Agent": "chatuos-worker-installer/0.1.0",
    },
)

try:
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
except urllib.error.HTTPError as error:
    detail = error.read().decode("utf-8", errors="replace")
    print(f"ERROR: worker key validation failed: HTTP {error.code}: {detail}", file=sys.stderr)
    sys.exit(1)
except Exception as error:
    print(f"ERROR: worker key validation failed: {error}", file=sys.stderr)
    sys.exit(1)

actual_user_id = payload.get("user_id")
if actual_user_id != expected_user_id:
    print(
        "ERROR: CHATUOS_USER_ID does not match CHATUOS_WORKER_KEY owner. "
        f"expected {expected_user_id}, got {actual_user_id}",
        file=sys.stderr,
    )
    sys.exit(1)

print(f"Validated worker key for user {actual_user_id}.")
PY

USER_BIN="$(python3 - <<'PY'
from __future__ import annotations

import os
import site

print(os.path.join(site.getuserbase(), "bin"))
PY
)"

CONFIG_PATH="\${CHATUOS_CONFIG_PATH:-$HOME/.chatuos/settings.json}"
if [[ "$CONFIG_PATH" == "~/"* ]]; then
  CONFIG_PATH="$HOME/\${CONFIG_PATH:2}"
fi
CONFIG_DIR="$(dirname "$CONFIG_PATH")"

if [[ "$DRY_RUN" == "1" || "$DRY_RUN" == "true" ]]; then
  info "Dry run passed"
  echo "Would install Python package: git+https://github.com/royguo/chatuos.git#subdirectory=worker"
  echo "Would write config: $CONFIG_PATH"
  echo "Python user bin: $USER_BIN"
  echo "Start command after install:"
  echo "  python3 -m codex_share_worker --configs $CONFIG_PATH"
  echo "  # or, after PATH reload: chatuos-worker --configs $CONFIG_PATH"
  exit 0
fi

mkdir -p "$CONFIG_DIR"

info "Installing ChatUOS worker package"
python3 -m pip install --user --upgrade "git+https://github.com/royguo/chatuos.git#subdirectory=worker"

cat > "$CONFIG_PATH" <<JSON
{
  "endpoint": "$ENDPOINT",
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

PATH_PROFILE=""
PATH_PROFILE_UPDATED=0
if [[ ":\${PATH}:" != *":$USER_BIN:"* ]]; then
  export PATH="$USER_BIN:$PATH"
  PROFILE="\${CHATUOS_SHELL_PROFILE:-}"
  if [[ -z "$PROFILE" ]]; then
    if [[ "\${SHELL:-}" == */zsh ]]; then
      PROFILE="$HOME/.zshrc"
    elif [[ "\${SHELL:-}" == */bash ]]; then
      PROFILE="$HOME/.bashrc"
    else
      PROFILE="$HOME/.profile"
    fi
  fi

  touch "$PROFILE"
  if ! grep -F "$USER_BIN" "$PROFILE" >/dev/null 2>&1; then
    {
      echo ""
      echo "# ChatUOS worker CLI"
      echo "export PATH=\\"$USER_BIN:\\$PATH\\""
    } >> "$PROFILE"
    echo "Added $USER_BIN to PATH in $PROFILE"
    PATH_PROFILE_UPDATED=1
  fi
  PATH_PROFILE="$PROFILE"
fi

echo "ChatUOS worker installed and validated."
echo "Config: $CONFIG_PATH"
if [[ "$PATH_PROFILE_UPDATED" == "1" ]]; then
  echo "PATH updated: $PATH_PROFILE"
  echo "Open a new terminal or run: source \\"$PATH_PROFILE\\""
fi
echo "Start worker:"
echo "python3 -m codex_share_worker --configs $CONFIG_PATH"
echo "# or, after PATH reload:"
echo "chatuos-worker --configs $CONFIG_PATH"
echo ""
echo "Dry-run check:"
echo "curl -fsSL $ENDPOINT/api/worker/install | env CHATUOS_DRY_RUN=1 CHATUOS_USER_ID=\\"$CHATUOS_USER_ID\\" CHATUOS_WORKER_KEY=\\"<your-full-key>\\" bash"
`;

  return new Response(script, {
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
