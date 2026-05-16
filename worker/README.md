# ChatUOS Python Worker

This worker runs on a contributor machine. It polls the platform for jobs,
executes Codex locally, and reports structured events back to the platform.

It intentionally keeps dependencies minimal and uses Python standard-library
HTTP polling for the MVP. A WebSocket transport can be added later.

Requires Python 3.8 or newer.

## Quick start

```bash
python -m codex_share_worker \
  --configs ~/.chatuos/settings.json
```

The worker never uploads Codex credentials. Each plan chooses a local
`codex_home`, workspace root, model, and concurrency cap.

## Config file

The default config path is `~/.chatuos/settings.json`. You can point the worker
at another file with `--configs /path/to/settings.json`.

```json
{
  "endpoint": "https://your-platform.example",
  "user_id": "user_id_from_dashboard",
  "worker_key": "chatuos_your_full_key",
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
```

For multiple local accounts, create multiple plans and point each one at a
different `codex_home`. For stronger isolation, run one worker process per OS
user.
