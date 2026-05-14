# ChatUOS

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

## Cloudflare Workers deploy

This project uses OpenNext for Cloudflare Workers. Do not deploy it as a
Cloudflare Pages project.

For Cloudflare Workers automatic Git deploys, use:

```bash
Install command: npm ci
Build command: npm run cf:build
Deploy command: npm run cf:deploy
```

If the Cloudflare UI only exposes one command field, use:

```bash
npm run deploy
```

The deploy step expects the OpenNext build output in `.open-next/`. Running
`npx wrangler deploy` by itself will fail because it does not create that output.

Before the first deploy, create a Cloudflare D1 database, replace the
`database_id` placeholder in `wrangler.jsonc`, and run:

```bash
npm run db:migrate:remote
```

Set production variables and secrets in the Cloudflare Worker dashboard:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `AUTH_URL`
- `PUBLIC_APP_URL`

## Worker

The contributor worker lives in `worker/`. It is a Python standard-library-first runner that polls the platform, runs `codex exec`, and reports events back.
