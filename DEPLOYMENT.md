# Terra Rossa deployment

Terra Rossa uses two independent deployments: the Vite output is static on Cloudflare Pages, while the authoritative Colyseus process runs on Fly.io in Sydney. Neither service requires a custom domain, database, or committed credential.

## Prerequisites

- Node.js and pnpm versions from `package.json`.
- Wrangler authenticated to the intended Cloudflare account.
- Fly CLI authenticated to the intended Fly.io organization.
- The Fly app `terra-rossa-server` and Pages project `terra-rossa` created once by an account owner.

## Release order

1. Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
2. Deploy the server with `fly deploy --remote-only --ha=false --build-arg SERVICE_VERSION=<git-sha>`.
3. Verify `https://terra-rossa-server.fly.dev/health` reports the new version.
4. Build the client with `VITE_COLYSEUS_URL=wss://terra-rossa-server.fly.dev pnpm build:client` (PowerShell: `$env:VITE_COLYSEUS_URL='wss://terra-rossa-server.fly.dev'; pnpm build:client`).
5. Run `pnpm deploy:client` and note the production alias returned by Wrangler.
6. Run the hosted protocol smoke check with `HEALTH_URL=https://terra-rossa-server.fly.dev COLYSEUS_URL=wss://terra-rossa-server.fly.dev pnpm smoke:hosted`, using equivalent PowerShell environment assignments when applicable.
7. Open `https://terra-rossa.pages.dev` in current desktop Chrome and confirm one dog plus a server-issued identity appears.

The Pages origin is the only production browser origin allowed by `fly.toml`. Preview deployment URLs intentionally cannot open game sockets; use the stable production alias for multiplayer verification. Keep exactly one Fly machine: Colyseus matchmaking and seat reservations are currently in memory, so multiple machines would require a shared presence service. The `--ha=false` release flag preserves this intentional MVP topology.

## Rollback

For the server, inspect releases with `fly releases --app terra-rossa-server`, then run `fly releases rollback <version> --app terra-rossa-server`. Verify `/health` and the hosted smoke check afterward.

For the client, list deployments with `wrangler pages deployment list --project-name terra-rossa`, then roll back from the Cloudflare Pages deployment dashboard to the prior known-good production deployment. Repeat the Chrome identity check after rollback.

If either artifact fails, do not promote a mismatched pair. Roll back the changed artifact or redeploy both from the last known-good Git commit. Credentials remain in the CLIs' user stores and must never be copied into `.env`, `fly.toml`, `wrangler.jsonc`, or GitHub.
