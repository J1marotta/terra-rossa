# Terra Rossa

Terra Rossa is a browser-first, continuous PvPvE survival shooter for two to four players. The active product and technical requirements live in [`spec.md`](spec.md), and the dependency-ordered implementation plan lives in [`TODO.md`](TODO.md).

## Repository audit

Audited for task T0.1 on 28 July 2026.

### Authoritative locations

- Git root and intended application root: `C:\Users\James\Documents\Code\terra-rossa`.
- The web workspace will be scaffolded directly beneath this root. It must not be created inside the nested `terra-rossa` directory.
- `C:\Users\James\Documents\Code\deathRace` is read-only reference material for architecture and deployment lessons. Terra Rossa must not import, modify, or copy its source code.
- The `origin` remote is `git@github.com:J1marotta/terra-rossa.git`.

### Existing file ownership

| Path | Kind | Decision |
| --- | --- | --- |
| `AGENTS.md`, `spec.md`, `TODO.md`, `why.html` | Tracked project documentation | Maintain as the active instructions, specification, roadmap, and decision journal. |
| `TODOS.md`, `solo-spec.md` | Tracked historical documentation | Preserve for context; do not implement unless explicitly restored. |
| `.editorconfig`, `.gitattributes`, `.gitignore` | Untracked repository configuration from the Godot starter | Leave untouched until the web workspace task deliberately reconciles and tracks repository configuration. |
| `project.godot`, `node_2d.tscn`, `icon.svg` | Untracked Godot source assets | Retain temporarily and do not overwrite, move, or delete. They are not part of the active web build. |
| `icon.svg.import` | Untracked Godot-generated import metadata | Leave untouched with the starter; do not treat it as web source. |
| `.godot/` | Ignored Godot editor and import cache | Generated output. Keep ignored and never commit it. |
| `terra-rossa/.codex-remote-attachments/` | Untracked conversation attachments | User-owned inputs. Do not use as the application root or commit without an explicit asset decision. |

Tracked files are the current repository source of truth. Untracked files listed above remain user-owned even when a later task creates adjacent web files.

### Migration boundary

The browser implementation will be added alongside the retained Godot starter, using clearly named client, server, shared, test, and public-asset locations. Each scaffolding task must inspect Git status first, add only the files it intentionally creates, and avoid broad staging commands. Generated dependency folders, build output, coverage, logs, local environment files, and Godot caches must be ignored; source, tests, manifests, lockfiles, examples, and documentation should be tracked.

No migration task may delete the Godot starter or nested attachments. Removing or archiving them requires a separate user-approved decision after the web version is established.

## Web workspace

The active web application uses one root pnpm workspace with explicit source boundaries:

- `client/` contains the Vite, React, and Three.js browser application.
- `server/` contains the Node.js and Colyseus authoritative server.
- `shared/` contains framework-neutral contracts and deterministic logic used by either side.
- `tests/` contains cross-boundary and workspace tests.

Use Node.js 24.14.x and pnpm 10.15.1. The Node policy is pinned in `.node-version` and `package.json`; dependency versions are exact in `package.json` and reproducible through `pnpm-lock.yaml`. The initial pinned runtime packages are React 19.2.8, Three.js 0.185.1, Colyseus 0.17.45, Colyseus SDK 0.17.43, and Colyseus WebSocket transport 0.17.13.

### Local commands

| Command | Purpose |
| --- | --- |
| `pnpm install --frozen-lockfile` | Reproduce the locked dependency tree. |
| `pnpm dev` | Start the Vite client. |
| `pnpm dev:server` | Start the server in watch mode. |
| `pnpm dev:all` | Run client and server together. |
| `pnpm start:server` | Start the server once. |
| `pnpm typecheck` | Check every strict TypeScript project. |
| `pnpm lint` | Check source lint and formatting rules. |
| `pnpm test` | Run the Vitest suite, including import-boundary checks. |
| `pnpm build:client` | Produce the browser bundle in `dist/client`. |
| `pnpm build` | Type-check and build the browser bundle. |

The workspace intentionally has no gameplay, database, authentication, CSS framework, state framework, or physics engine yet.

### Environment configuration

Copy `.env.example` to `.env.local` for personal overrides; never commit the copied file. Local development needs no credentials and defaults to a client endpoint of `ws://localhost:2567`, a server on `127.0.0.1:2567`, and the Vite origin `http://localhost:5173`.

The client reads only `VITE_COLYSEUS_URL`. A `staging` or `production` client rejects missing, insecure, and local endpoints; hosted values must use public `wss://` URLs. Vite exposes `VITE_` values to browser code, so never place secrets in them.

The server accepts these process variables:

| Variable | Local default | Hosted rule |
| --- | --- | --- |
| `APP_ENV` | `development` | Use `staging` or `production`. |
| `HOST` | `127.0.0.1` | Set the interface required by the host, commonly `0.0.0.0`. |
| `PORT` | `2567` | Must be an integer from 1 to 65535. |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Required comma-separated HTTP(S) origins. |
| `SERVICE_NAME` | `terra-rossa-server` | Required health-check identity. |
| `SERVICE_VERSION` | `dev` | Required deploy or commit identity. |

Configuration parsers accept an explicit value source, so tests are isolated from each developer’s machine. Invalid hosted configuration fails at startup with the missing or malformed variable named in the error.

### Minimal multiplayer server

The versioned room name is `terra_rossa_v1`, and its protocol version is `0.1.0`. A client joins with that protocol version and an optional display name. The server sanitizes the name, assigns a UUID that is deliberately different from the transport session ID, and synchronizes the waiting room plus up to four connected players. A mismatched client receives an error naming both versions; a fifth client is rejected.

The server exposes `GET /health` with service, release, environment, and protocol metadata. Requests carrying a browser origin are accepted only when that exact origin appears in `ALLOWED_ORIGINS`. Startup, room creation, joins, leaves, room disposal, and shutdown use one-line JSON logs so local and hosted events can be searched and correlated.

There is no movement or gameplay in this room yet. The server owns identity and lifecycle only, creating the smallest trustworthy network boundary for the next slice.

### First rendered scene

The client owns one orthographic Three.js scene beneath a separate React title layer. Its geometric placeholder world contains a ground plane, obstacle, and upright dog marker. A `ResizeObserver` updates an aspect-correct camera while preserving vertical world scale, and the renderer caps its pixel ratio at one so a high-density laptop screen does not silently multiply the fragment workload. CSS scales the canvas with pixel-consistent sampling.

React creates the scene once and calls its explicit disposal method on unmount. Disposal cancels the animation frame, disconnects resize observation, releases geometry, materials, and renderer resources, and removes the canvas. Reduced-motion preference disables the placeholder dog’s idle bob.

The supported MVP browser is current desktop Google Chrome. Firefox, Safari, Edge, mobile browsers, and native clients are outside the acceptance matrix unless the scope is changed explicitly.

### First synchronized player

The Chrome client now joins `terra_rossa_v1` automatically and presents the display name plus short form of the stable player ID assigned by the server. The React layer reports idle, connecting, connected, failed, and closed states; failures name the attempted endpoint and tell a local developer to start the server and reload Chrome.

Network schema objects stop at a dedicated view adapter. That adapter copies each update into sorted, immutable plain data before React or Three.js sees it. The scene reconciles upright dog placeholders by stable player ID, so a state update reuses an existing object while a departure removes and disposes it. Unmounting removes Colyseus listeners, leaves the room, and invalidates late connection promises to prevent stale subscriptions after refresh.

Run `pnpm dev:all`, then open `http://localhost:5173` in current desktop Chrome to exercise the local handshake. The on-screen connection line should change to `Connected as Scout` followed by the server-owned ID; refreshing should yield exactly one connected dog and a new identity.
