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

| Path                                            | Kind                                                      | Decision                                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`, `spec.md`, `TODO.md`, `why.html`   | Tracked project documentation                             | Maintain as the active instructions, specification, roadmap, and decision journal.                        |
| `TODOS.md`, `solo-spec.md`                      | Tracked historical documentation                          | Preserve for context; do not implement unless explicitly restored.                                        |
| `.editorconfig`, `.gitattributes`, `.gitignore` | Untracked repository configuration from the Godot starter | Leave untouched until the web workspace task deliberately reconciles and tracks repository configuration. |
| `project.godot`, `node_2d.tscn`, `icon.svg`     | Untracked Godot source assets                             | Retain temporarily and do not overwrite, move, or delete. They are not part of the active web build.      |
| `icon.svg.import`                               | Untracked Godot-generated import metadata                 | Leave untouched with the starter; do not treat it as web source.                                          |
| `.godot/`                                       | Ignored Godot editor and import cache                     | Generated output. Keep ignored and never commit it.                                                       |
| `terra-rossa/.codex-remote-attachments/`        | Untracked conversation attachments                        | User-owned inputs. Do not use as the application root or commit without an explicit asset decision.       |

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

| Command                          | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Reproduce the locked dependency tree.                   |
| `pnpm dev`                       | Start the Vite client.                                  |
| `pnpm dev:server`                | Start the server in watch mode.                         |
| `pnpm dev:all`                   | Run client and server together.                         |
| `pnpm start:server`              | Start the server once.                                  |
| `pnpm typecheck`                 | Check every strict TypeScript project.                  |
| `pnpm lint`                      | Check source lint and formatting rules.                 |
| `pnpm test`                      | Run the Vitest suite, including import-boundary checks. |
| `pnpm build:client`              | Produce the browser bundle in `dist/client`.            |
| `pnpm build`                     | Type-check and build the browser bundle.                |

The workspace intentionally has no gameplay, database, authentication, CSS framework, state framework, or physics engine yet.

### Environment configuration

Copy `.env.example` to `.env.local` for personal overrides; never commit the copied file. Local development needs no credentials and defaults to a client endpoint of `ws://localhost:2567`, a server on `127.0.0.1:2567`, and the Vite origin `http://localhost:5173`.

The client reads only `VITE_COLYSEUS_URL`. A `staging` or `production` client rejects missing, insecure, and local endpoints; hosted values must use public `wss://` URLs. Vite exposes `VITE_` values to browser code, so never place secrets in them.

The server accepts these process variables:

| Variable          | Local default           | Hosted rule                                                 |
| ----------------- | ----------------------- | ----------------------------------------------------------- |
| `APP_ENV`         | `development`           | Use `staging` or `production`.                              |
| `HOST`            | `127.0.0.1`             | Set the interface required by the host, commonly `0.0.0.0`. |
| `PORT`            | `2567`                  | Must be an integer from 1 to 65535.                         |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Required comma-separated HTTP(S) origins.                   |
| `SERVICE_NAME`    | `terra-rossa-server`    | Required health-check identity.                             |
| `SERVICE_VERSION` | `dev`                   | Required deploy or commit identity.                         |

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

## Hosted baseline

- Client: `https://terra-rossa.pages.dev` on Cloudflare Pages.
- Server: `https://terra-rossa-server.fly.dev` on one auto-stopping Fly.io machine in Sydney.
- WebSocket endpoint: `wss://terra-rossa-server.fly.dev`.
- Health endpoint: `https://terra-rossa-server.fly.dev/health`.

The server intentionally runs as one machine because room discovery and seat reservations are still held in process memory. Fly deployment uses `--ha=false`; adding machines before shared Colyseus presence exists can send matchmaking and WebSocket traffic to different processes. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for release, smoke, and rollback commands.

## Authority path

Phase 0 proves the complete path before adding controls. A future browser input handler will convert keyboard or pointer state into a versioned command and send it through `GameConnection` to the Colyseus room. The room—not React or Three.js—will validate the command and update authoritative schema state. Colyseus synchronizes that state back to each browser, where `viewAdapter.ts` copies it into immutable presentation data. React reports connection and menu state; `GameScene` reconciles frame-rendered objects by stable server ID.

In short: browser intent travels inward as commands, while server truth travels outward as schema. The client may predict presentation later, but it never gets to author the consequential result.

Phase 0 passed with a pnpm 10.15.1 frozen install, strict type checking, lint and formatting, 24 automated tests, a production client build, local Chrome play, hosted HTTPS and WSS play, a synchronized server UUID, and a versioned Fly health check. Client and server release independently through the procedures in `DEPLOYMENT.md`.

## Simulation conventions

Gameplay is simulated on a flat world plane measured in metres. World `x` maps directly to Three.js `x`, world `z` maps directly to Three.js `z`, and render `y` is presentation elevation only. Direction is radians in the X/Z plane: zero points along positive X and increasing angles turn toward positive Z. Canonical angles occupy `[-π, π)`.

The server will advance integer ticks at a fixed 30 Hz (`1/30` second per tick), independent of browser render frames. Durations are expressed in milliseconds at configuration and protocol boundaries, then rounded up to whole ticks for simulation. Positions are limited to ±2,048 metres per axis, render elevation to ±256, and tick counters to unsigned 32-bit range. Shared validators reject non-numbers, `NaN`, infinities, fractions where integers are required, and values outside those bounds.

`SeededRandom` supplies repeatable pseudo-random choices for authored spawn allocation and tests. It is deterministic simulation tooling, not security or gambling randomness.

## Command protocol

Every client intent uses one exact envelope: protocol version, Colyseus room ID, nullable match ID, unsigned sequence number, command type, and a command-specific payload. The allowed vocabulary is ready, start, move, aim, dash, fire, reload start, reload attempt, melee, interact, rematch, and leave. Movement carries only a normalized X/Z input vector, aim carries one canonical radian angle, and ready carries one boolean; every action command has an empty payload.

The parser rejects unknown or extra fields, unsafe IDs, invalid numbers, diagonal movement above unit length, incompatible protocol versions, and any attempt to attach outcomes such as damage or a claimed hit. A room checks its own room/match context before consuming sequence order, then accepts only a strictly increasing sequence for that client. Replays, duplicates, and late commands return structured errors instead of affecting simulation twice.

## Authored map

`red_hollow_v1` is a fixed 60-by-44-metre collision map loaded directly from `shared/map.ts`. Northwest, northeast, southeast, and southwest spawn regions sit around the perimeter. Short screening ruins block all six opening spawn-to-spawn sightlines; each spawn has two authored, collision-free waypoint routes into a 20-by-16-metre central conflict area with three cover structures and entries from every side.

The authoritative map contains only bounds, spawn data, routes, and axis-aligned collision boxes. Three.js derives its ground and all obstacle meshes from those records, adding a decorative cap per box without creating a second hand-authored layout. Tests validate IDs, bounds, cover, route reachability, segment collision, and sightlines deterministically at build time; no runtime map editor or procedural geometry is involved.

## Authoritative movement

Each synchronized player now owns position, movement input, speed, collision radius, and last processed command sequence. The room validates a movement envelope against its room identity and per-client order, acknowledges the accepted sequence in schema state, and advances all players at exactly 30 fixed steps per second. A late or duplicate command receives a protocol error and cannot replace current input.

Movement is capped at six metres per second with a 0.55-metre collision circle. Axis-separated circle-versus-box resolution blocks Red Hollow’s simple collision obstacles while allowing wall sliding, and map bounds include the full player radius. The integrator normalizes input defensively even after protocol validation. A millisecond accumulator produces the same number of fixed steps regardless of callback partitioning, separating simulation results from Node timer or browser frame cadence.

Until the dedicated spawn-allocation task, join order assigns the four authored regions cyclically. This is only a visible movement-testing baseline; it does not claim the later maximally separated allocation rule.

## Synchronized movement presentation

The schema adapter now copies authoritative X/Z position and processed sequence into immutable player views. Three.js owns a presentation registry keyed by the server UUID: new IDs create one dog, updates append position snapshots, departures dispose one dog exactly once, and scene teardown disposes everything still registered. React only passes a new room snapshot into the scene; it never updates transforms in the animation frame.

Remote dogs render 100 milliseconds behind receipt time and interpolate between the surrounding snapshots using elapsed timestamps, not frame counts. This small buffer trades a little visual latency for smooth 20 Hz schema patches. The local dog uses the newest authoritative sample as its reconciliation base, and the camera follows its predicted presentation from the same isometric offset.

## Local movement prediction

WASD is sampled at the shared 30 Hz step. Each normalized input receives the next sequence number, travels as a movement command with no claimed position, and is applied immediately to a client-side copy of the same map collision integrator. Pending inputs remain keyed by sequence until schema state acknowledges them.

On an authoritative update, the client drops acknowledged inputs, resets its simulation to server X/Z, and replays the remainder. Errors up to 0.15 metres settle immediately; ordinary larger drift blends toward the corrected target at a frame-rate-independent rate; divergence above two metres hard-snaps as a safety boundary. A deterministic delay harness verifies immediate response and reconciliation at 150 ms round-trip latency with jitter, while an intentionally illegal multi-metre prediction is always corrected. Remote clients still receive only the server position.

## Authoritative dash

Space requests a 4.5-metre dash along the current movement direction. The dash lasts six fixed ticks (200 ms), then applies five ticks of movement recovery; its 1.2-second cooldown begins on acceptance. The room rejects zero-direction, active, recovering, and cooling-down requests, while still acknowledging their ordered command. Dash movement uses the same circle, obstacle, and map-bound resolver as walking, so it stops at walls and edges rather than tunnelling through them. It grants no invulnerability.

The client predicts only after it has movement intent and replays dash commands alongside movement history during reconciliation. A successful server dash increments a synchronized event counter; the scene uses predicted input for an immediate squash and the server event for remote confirmation. Presentation can react quickly but cannot decide cooldown or legality.

## Phase 1 verification

Phase 1 passed against release `9f79483`. Four current Chrome tabs joined `https://terra-rossa.pages.dev`, each rendered four dogs, received a different server UUID, and occupied one of the four authored coordinates. The hosted WSS harness then connected four independent SDK clients, moved and dashed all of them, observed four server dash events, and confirmed every client agreed on every final position within one centimetre.

Run the real-network gate with `$env:COLYSEUS_URL='wss://terra-rossa-server.fly.dev'; pnpm smoke:four` in PowerShell. The deterministic unit harness separately covers 150 ms simulated round-trip latency plus jitter, so the gate exercises both repeatable adverse timing and actual Sydney hosting. Prediction affects only the local presentation; interpolation deliberately delays remote presentation between server snapshots. They solve different problems and never replace authoritative state.
