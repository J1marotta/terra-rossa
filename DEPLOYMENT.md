# Deployment runbook

Terra Rossa ships two independently rollbackable artifacts: a static Chrome
client on Cloudflare Pages and an authoritative Colyseus server on Fly.io.
Every release uses the full Git commit SHA as both artifacts' version.

## Prerequisites and configuration

Start from a clean checkout of the commit being released. Install Node
24.14.x, pnpm 10.15.1, Fly CLI, and Wrangler; authenticate the two CLIs through
their normal local login flows. Never commit access tokens.

The server receives `SERVICE_VERSION` at image build time and uses the
non-secret values in `fly.toml`. Production secrets belong in Fly secrets.
The browser build receives `VITE_COLYSEUS_URL` and `VITE_SERVICE_VERSION`.
Vite variables are public and must never contain secrets. See `.env.example`
for the complete local environment.

Before deploying, run `pnpm install --frozen-lockfile`, `pnpm typecheck`,
`pnpm lint`, `pnpm test`, `pnpm stress:performance`, and `pnpm build`.

## Release

Let `COMMIT` be the full SHA from `git rev-parse HEAD`.

1. Deploy the server with
   `fly deploy --remote-only --ha=false --build-arg SERVICE_VERSION=$COMMIT`.
2. Build the client with
   `VITE_COLYSEUS_URL=wss://terra-rossa-server.fly.dev VITE_SERVICE_VERSION=$COMMIT pnpm build:client`.
3. Deploy that exact output with
   `wrangler pages deploy dist/client --project-name terra-rossa --branch master --commit-hash $COMMIT`.
4. Set `HEALTH_URL=https://terra-rossa-server.fly.dev`,
   `COLYSEUS_URL=wss://terra-rossa-server.fly.dev`, and
   `EXPECTED_VERSION=$COMMIT`, then run `pnpm smoke:hosted`.
5. Set `CLIENT_URL=https://terra-rossa.pages.dev` as well and run
   `pnpm verify:release`.

The health endpoint reports the server version. The lobby reports the client
build. The two verification commands fail if either artifact differs from the
expected commit or a real room cannot be joined over WSS.

## Logs, restarts, and health

Use `fly logs -a terra-rossa-server` for structured server events and
`fly status -a terra-rossa-server` for machine health. The platform starts the
zero-minimum machine on demand. SIGTERM triggers graceful Colyseus shutdown;
Fly allows ten seconds before termination. Restart with
`fly machine restart <machine-id> -a terra-rossa-server`, then repeat both
verification commands. Cloudflare deployment details are available with
`wrangler pages deployment list --project-name terra-rossa`.

## Rollback without source edits

Select a previously successful Git SHA, then use a detached clean worktree for
that exact commit. Do not modify its source.

- Server: inspect `fly releases --image -a terra-rossa-server`, select the
  earlier healthy image, and deploy that immutable image with
  `fly deploy --image <image-reference> --ha=false -a terra-rossa-server`.
- Client: from the clean worktree at the selected SHA, repeat the client build
  and Pages deploy commands above with that SHA. This creates a new Pages
  deployment containing the old immutable source revision.

After either rollback, run the hosted smoke and release verification using the
selected SHA. Record the failing release, restored SHA, reason, and verification
result in `why.html`.
