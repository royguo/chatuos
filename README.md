# GPT Proxy

Cloudflare-hosted MVP for a Codex/GPT capacity sharing platform.

## Stack

- Next.js on Cloudflare via OpenNext
- GitHub login through NextAuth
- Cloudflare D1 for users, API keys, wallets, workers, and ledger data
- Python local worker for contributor-side Codex execution

## Development

```bash
npm install
npm run dev
```

Configure GitHub OAuth and Cloudflare secrets using `.env.local.example`.

## Worker

The contributor worker lives in `worker/`. It is a Python standard-library-first runner that polls the platform, runs `codex exec`, and reports events back.
