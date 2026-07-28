# Terra Rossa — Active LLM Implementation Plan

Status: Active

Source of truth: `spec.md`

Historical plans: `TODOS.md` and `solo-spec.md` are superseded and must not be implemented unless the user explicitly restores them.

## 1. Purpose

This plan breaks the continuous four-player PvPvE MVP into small, dependency-ordered tasks that an LLM can implement and verify without inventing later systems.

The primary acceptance case is a four-player free-for-all. Rooms may start with two or three players, but no task should add teams, packs, progression, or more than four players.

This file contains instructions only. Implementation belongs in the project source files created by the tasks.

## 2. Mandatory agent workflow

For every task in this file, the implementing LLM must:

1. Read `AGENTS.md`, `spec.md`, `TODO.md`, and the relevant sections of `why.html` before editing.
2. Inspect the current repository and Git status. Preserve unrelated user files and changes.
3. Confirm every prerequisite listed by the task is complete.
4. Work on exactly one task unless the user explicitly groups tasks.
5. Mark the selected task `[~]` only while actively working on it.
6. Implement the smallest solution that satisfies the task acceptance criteria.
7. Add or update automated tests proportionate to the change.
8. Update documentation when commands, architecture, deployment, or behaviour changed.
9. Update `why.html` with what was decided, what was learned, and why the implementation took its chosen shape. Make the explanation useful to a junior developer.
10. Mark the task `[x]` only after every acceptance criterion passes. If blocked, mark `[!]` and record the exact blocker beneath the task.
11. Review the final diff and exclude unrelated work from the commit.
12. Commit the task with a concise message naming the completed capability.
13. Push the current branch to its configured upstream.
14. Deploy the current client and server artifacts using the established staging or production workflows whenever the task changes deployable code.
15. Verify the deployed client, server health, and the capability changed by the task when remote verification is practical.
16. Report tests, commit SHA, push result, deployment URLs, deployment verification, and any remaining risk.

### Deployment rule

- Tasks before deployment infrastructure exists must still produce a locally runnable artifact and document that remote deployment is unavailable.
- Task T0.7 establishes the first client and server deployments. After T0.7, a deployable-code task is not complete until both affected artifacts are deployed and verified.
- Documentation-only changes do not require deployment unless the user explicitly requests it.
- Never invent credentials, hosting projects, DNS records, or secrets. When authority or credentials are missing, preserve the completed local work, mark the deployment portion blocked, and state the exact user action required.
- Never hide a failed deployment by marking a task complete.

### Task status

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete, verified, committed, pushed, and deployed when applicable
- `[!]` Blocked with the reason recorded beneath the task

### Scope guardrails

- Use TypeScript throughout client, server, and shared packages.
- Use Vite, Three.js, a small React shell, Node.js, Colyseus 0.17, and Vitest.
- Support two to four players; optimize and test for four.
- Keep PvP and PvE active from the start of play.
- Do not add XP, levels, feats, armour, relics, teams, packs, alpha, revival, accounts, public matchmaking, procedural maps, or more than four players.
- Keep React out of the frame-by-frame entity renderer.
- Keep Three.js, React, DOM, audio, and presentation assets out of the authoritative simulation.
- Never accept client-authored damage, health, ammunition, reload result, pickup success, creature state, darkness, death, or victory.
- Use schema state for durable facts and messages for transient events. Do not maintain conflicting sources of truth.
- Prefer authored map and spawn data over premature general-purpose editors or procedural systems.
- Use placeholders until combat, networking, and performance gates pass.

---

# Phase 0 — Repository, toolchain, and deployment baseline

Goal: replace uncertainty about the starter repository with a documented, runnable, tested, and deployable TypeScript client/server foundation.

## T0.1 — Audit the repository and protect existing work

- [x] Inspect the repository root, Git history, tracked files, untracked Godot starter files, nested directories, ignore rules, and configured remote.

Prerequisites: none.

Deliverables:

- A short repository audit in `README.md` or a dedicated architecture note.
- A list of existing Godot files and whether each will be retained temporarily, migrated, or left untouched.
- Confirmation of the actual Git root and intended application root.
- Confirmation that `C:\Users\James\Documents\Code\deathRace` is reference material only.
- A documented migration approach that does not delete or overwrite unrelated user work.

Acceptance:

- The repository root is unambiguous.
- No existing user file is deleted.
- Generated files and source files are distinguishable.
- The next task can scaffold the web stack without guessing where it belongs.

Do not:

- Install dependencies.
- Move or delete the Godot starter.
- Copy Death Race source code.

## T0.2 — Establish the TypeScript workspace

- [x] Create the minimal package structure for client, server, shared logic, tests, and static assets.

Prerequisites: T0.1.

Deliverables:

- One package manager and lockfile.
- Pinned Node.js version policy.
- TypeScript configuration with strict checking.
- Vite client entry.
- React application shell entry.
- Three.js dependency.
- Compatible Colyseus 0.17 client and server dependencies.
- Vitest configuration.
- Formatting and linting configuration.
- Scripts for development, client build, server start, tests, type checking, linting, and combined local play.

Acceptance:

- Dependencies install from a clean checkout.
- Type checking, linting, tests, and client build execute successfully.
- Client and server imports do not cross forbidden boundaries.
- Package versions are documented, not floating silently.

Do not:

- Add gameplay.
- Add a database, authentication, CSS framework, state-management framework, physics engine, or monorepo tool unless a demonstrated requirement exists.

## T0.3 — Define configuration and environment boundaries

- [x] Establish safe configuration for local, test, staging, and production environments.

Prerequisites: T0.2.

Deliverables:

- Example environment file containing names but no secrets.
- Client configuration for the Colyseus endpoint.
- Server configuration for host, port, allowed origins, environment, and health-check metadata.
- Startup validation that reports missing or invalid required values.
- Documentation explaining local defaults and hosted overrides.

Acceptance:

- Local development starts without production credentials.
- Production builds do not silently connect to localhost.
- Secrets and local environment files are ignored by Git.
- Tests can override configuration without depending on the developer machine.

## T0.4 — Render the first Three.js scene

- [ ] Render a stable placeholder world inside the React application shell.

Prerequisites: T0.2.

Deliverables:

- Orthographic Three.js scene.
- Explicit render-loop ownership and teardown.
- Responsive canvas resizing.
- Low-resolution or pixel-consistent render strategy documented.
- Placeholder ground, obstacle, and dog marker.
- React title/menu shell outside the render loop.
- Reduced-motion handling for nonessential presentation.

Acceptance:

- The placeholder scene renders in current Chrome and Firefox.
- Resizing does not stretch aim/world coordinates incorrectly.
- React rerenders do not recreate the Three.js scene continuously.
- Unmounting removes frame callbacks, listeners, and renderer resources.
- Client build succeeds.

Do not:

- Add network state or gameplay.
- Add production art.

## T0.5 — Start the minimal Colyseus server

- [x] Create one versioned Colyseus room that accepts a browser connection and assigns a server identity.

Prerequisites: T0.2 and T0.3.

Deliverables:

- Colyseus server bootstrap.
- Room name and maximum of four clients.
- Minimal schema containing protocol version, room phase, and connected players.
- Sanitized display names.
- Server-assigned stable player IDs distinct from connection session IDs.
- Health endpoint.
- Structured startup, join, leave, and shutdown logging.
- Room and server lifecycle tests.

Acceptance:

- A test client connects and receives a unique identity.
- A fifth client is rejected.
- Incompatible protocol versions receive an actionable error.
- Empty rooms dispose without leaked timers or listeners.
- Health endpoint reports a usable status.

Do not:

- Add movement or lobby controls.
- Trust a client-provided player ID.

## T0.6 — Connect the rendered client to synchronized room state

- [ ] Display the local server-owned player placeholder in the Three.js scene.

Prerequisites: T0.4 and T0.5.

Deliverables:

- Colyseus client transport isolated from React and Three.js presentation.
- Connection states: idle, connecting, connected, failed, and closed.
- Client view adapter that converts schema state into renderer-friendly data.
- Placeholder object keyed by stable player ID.
- Clean disconnect and teardown.
- Tests for transport lifecycle and state adaptation.

Acceptance:

- The browser connects and renders the player identity supplied by the server.
- Refresh and disconnect do not leave duplicate objects or subscriptions.
- Connection failures display an actionable React error.
- Three.js never mutates Colyseus schema state.

## T0.7 — Establish deployable client and server baselines

- [ ] Create the first repeatable hosted client and Colyseus server deployments.

Prerequisites: T0.6.

Deliverables:

- Static client deployment workflow, expected to use Cloudflare Pages unless repository constraints dictate otherwise.
- WebSocket-capable Node deployment workflow, expected to use Fly.io unless repository constraints dictate otherwise.
- WSS client endpoint configuration.
- Allowed-origin configuration.
- Server health check and restart policy.
- Deployment and rollback documentation.
- Smoke procedure that connects the hosted browser to the hosted room.

Acceptance:

- Hosted client loads over HTTPS.
- Hosted client connects to the server over WSS.
- Server health endpoint is reachable.
- One hosted client receives and renders its server identity.
- Build and deploy are repeatable without undocumented local state.
- No credential is committed.

Do not:

- Add custom domains.
- Add production databases or accounts.
- Copy Death Race deployment identifiers or secrets.

## Phase 0 gate

- [ ] Verify clean install, type check, lint, tests, production client build, local client/server play, hosted client, hosted WSS connection, and server health.

Pass only when:

- The human developer can explain how browser input will reach a Colyseus room and how schema state reaches Three.js.
- The client and server have separate deployment paths.
- Every later task can finish with a real deployment.

---

# Phase 1 — Authoritative movement and map foundation

Goal: four clients move responsively through one server-owned authored map.

## T1.1 — Define shared coordinates and time conventions

- [ ] Establish the numeric conventions used by simulation, protocol, and renderer.

Prerequisites: Phase 0 gate.

Deliverables:

- Documented world axes, units, angles, time units, and coordinate conversion.
- Finite-number and bounds-validation helpers.
- Fixed simulation-step convention.
- Seeded random utility for testable authored spawn choices.
- Unit tests covering boundary and invalid-number cases.

Acceptance:

- Server simulation has no dependency on render frame rate.
- Client and server agree on world-to-render conversion.
- NaN, Infinity, and out-of-range values are rejected before simulation.

## T1.2 — Define the command protocol

- [ ] Create versioned, validated command envelopes and input ordering rules.

Prerequisites: T1.1.

Deliverables:

- Command types for ready, start, movement, aim, dash, fire, reload start, reload attempt, melee, interact, rematch, and leave.
- Room and match identity.
- Monotonic sequence numbers for ordered input.
- Per-command payload validation and numeric bounds.
- Error-envelope format.
- Protocol round-trip, stale-order, wrong-room, wrong-match, and malformed-payload tests.

Acceptance:

- Unknown commands are rejected.
- Stale or duplicate ordered commands cannot affect simulation twice.
- A client cannot embed authoritative outcomes in any command.
- Protocol errors are safe and actionable.

Do not:

- Implement command effects yet.

## T1.3 — Create the authored collision map

- [ ] Define one fixed map suitable for two, three, and four-player testing.

Prerequisites: T1.1.

Deliverables:

- Server-readable map bounds and collision obstacles.
- Client-readable visual representation derived from the same authored source.
- Four named spawn regions around the perimeter.
- At least two inward routes from every spawn.
- Central conflict area with multiple entries and cover.
- Deterministic map validation tests.

Acceptance:

- No spawn pair has an opening direct sightline.
- Every spawn reaches the centre by at least two routes.
- Collision geometry is simpler than visual geometry.
- Server and client do not maintain divergent hand-authored obstacle copies.
- Map loads without runtime editor tooling.

## T1.4 — Implement authoritative player movement

- [ ] Process movement intent in the Colyseus simulation.

Prerequisites: T1.2 and T1.3.

Deliverables:

- Server-owned position, movement vector, speed, and collision radius.
- Movement command handling.
- Fixed-step integration.
- Map-bound and obstacle collision.
- Sequence acknowledgement needed for later reconciliation.
- Simulation tests for speed, diagonal normalization, bounds, obstacles, stale input, and frame-rate independence.

Acceptance:

- Clients cannot exceed configured speed or leave valid map space.
- Equivalent elapsed time produces equivalent movement across different update partitions.
- Four simulated players move independently without sharing input.

## T1.5 — Render remote synchronized movement

- [ ] Present all synchronized player entities in Three.js without prediction.

Prerequisites: T1.4.

Deliverables:

- Player render-object registry keyed by server ID.
- Creation, update, and disposal from room state.
- Distinct local and remote placeholder treatments.
- Snapshot buffer and remote interpolation.
- Frame-rate-independent presentation.

Acceptance:

- Four browser clients see the same legal positions.
- Remote motion is smooth at the target patch rate.
- Leaving players are disposed exactly once.
- No React component updates entity transforms each frame.

## T1.6 — Add local prediction and reconciliation

- [ ] Make local movement responsive while preserving server authority.

Prerequisites: T1.4 and T1.5.

Deliverables:

- Local input history keyed by sequence.
- Immediate local movement prediction.
- Server acknowledgement.
- Replay of unacknowledged inputs after authoritative correction.
- Soft correction threshold and hard-snap safety threshold.
- Latency/jitter test harness.

Acceptance:

- Local input feels immediate at 150 ms simulated round-trip latency.
- Ordinary reconciliation does not routinely snap.
- Deliberately illegal local movement is corrected.
- Remote clients never observe the predicted illegal state as authoritative.

## T1.7 — Implement authoritative dash

- [ ] Add the shared dash as a server-validated movement action.

Prerequisites: T1.6.

Deliverables:

- Dash intent, duration, distance, cooldown, and recovery data.
- Server collision and cooldown enforcement.
- Client prediction and reconciliation support.
- Distinct presentation event.
- Tests for cooldown, obstacles, map bounds, repeated commands, and latency.

Acceptance:

- Dash cannot cross blocked geometry or exceed its configured distance.
- Repeated dash commands cannot bypass cooldown.
- Presentation remains responsive without deciding legality.
- Invulnerability is not added unless separately approved.

## Phase 1 gate

- [ ] Complete a hosted four-browser movement test under simulated and real latency.

Pass only when:

- All four players receive unique spawns and identities.
- Movement and dash are responsive and authoritative.
- Client, server, and deployed builds pass their checks.
- `why.html` explains prediction, interpolation, and why they are different.

---

# Phase 2 — Combat toy

Goal: make firing, active reload, melee, health, and death satisfying before building a full match.

## T2.1 — Define combat data and damage flow

- [ ] Establish data-driven weapon and damage definitions without implementing the full weapon set.

Prerequisites: Phase 1 gate.

Deliverables:

- Starting firearm definition.
- Damage-event pathway.
- Fire interval, magazine, reserve, range, spread, knockback, and reload timing data.
- Validation for incomplete or contradictory combat data.
- Tests for configuration and damage ordering.

Acceptance:

- Simulation code does not read values from React or Three.js objects.
- Invalid weapon data fails clearly during development.
- Health changes through one authoritative pathway.

## T2.2 — Implement server-authoritative firing and ammunition

- [ ] Fire the starting hitscan weapon from validated client intent.

Prerequisites: T2.1 and T1.2.

Deliverables:

- Aim intent with bounded update rate.
- Server-owned magazine and reserve.
- Fire-rate validation.
- Server ray test against map, players, and later creature-compatible targets.
- Shot event containing presentation-safe results.
- Dry-fire state and event.
- Tests for ammo accounting, rate limits, range, obstacles, stale commands, and duplicate hits.

Acceptance:

- Client cannot fire without ammunition or faster than the weapon allows.
- Walls block shots consistently.
- One valid shot consumes one round exactly once.
- Presentation may predict muzzle feedback but not damage.

## T2.3 — Implement active reload

- [ ] Add normal, good, perfect, and failed reload outcomes with latency-aware server validation.

Prerequisites: T2.2.

Deliverables:

- Server-owned reload start time and phase.
- One reload-attempt command per reload.
- Bounded client timestamp compensation.
- Data-driven good, perfect, normal, and failed completion times.
- Temporary timing presentation near the local player or reticle.
- Fumble feedback for failure.
- Tests for every outcome, duplicate attempts, early/late input, reload cancellation policy, and ammunition transfer.

Acceptance:

- The client never submits the result category.
- Reload cannot duplicate or destroy rounds outside documented magazine rules.
- A bad attempt is slower than no attempt.
- Timing remains usable at 150 ms simulated latency.
- Colour is not the only timing signal.

## T2.4 — Implement infinite melee

- [ ] Add the server-validated fallback melee attack.

Prerequisites: T2.1 and T1.7.

Deliverables:

- Forward arc, range, damage, knockback, wind-up, and recovery.
- Server hit test.
- Presentation event and placeholder animation.
- Interaction rule with reload commitment.
- Tests for range, arc, recovery, obstacle interaction, repeated input, and reload lockout.

Acceptance:

- Melee works with an empty gun.
- Melee cannot cancel a committed or failed reload.
- It cannot permanently stun-lock an equivalent player.
- Client animation never creates a server hit.

## T2.5 — Implement health, damage, death, and simultaneous resolution

- [ ] Resolve player damage and elimination authoritatively.

Prerequisites: T2.2 and T2.4.

Deliverables:

- Server-owned health and alive state.
- Damage ordering within one simulation step.
- Immediate death at zero health.
- Dead-player input rejection.
- Simultaneous lethal-damage rule.
- Death event and presentation state.
- Tests for overkill, duplicate damage, mutual kills, dead input, and exactly-once elimination.

Acceptance:

- Health never comes from client state.
- A player dies once.
- Mutual lethal damage is deterministic.
- Dead players cannot move, attack, pick up, or affect victory.

## T2.6 — Add punch feedback within strict budgets

- [ ] Make the combat toy readable and forceful without changing authority.

Prerequisites: T2.2 through T2.5.

Deliverables:

- Local muzzle flash, recoil, impact, hit reaction, knockback presentation, restrained hit-stop, capped camera shake, and placeholder audio hooks.
- Separate feedback for shooter, victim, miss, dry fire, reload success, perfect, and fumble.
- Hard caps and teardown for transient presentation objects.
- Reduced-motion and reduced-effects behaviour.

Acceptance:

- Feedback remains understandable with four players visible.
- Effects cannot change hit timing or simulation state.
- Repeated firing does not leak objects, sounds, listeners, or timers.
- Reduced-effects mode preserves necessary telegraphs.

## Phase 2 gate

- [ ] Run a ninety-second hosted combat toy with four connected clients and no match rules.

Pass only when:

- Movement, shooting, reload timing, melee, damage, and death are understandable.
- Combat feels responsive under hosted latency.
- Automated tests and deployment verification pass.
- The developer can explain the complete input-to-damage-to-render path.

---

# Phase 3 — Four-player free-for-all match

Goal: complete the player-versus-player match before adding creatures or darkness.

## T3.1 — Build the private lobby

- [ ] Implement create, join, ready, start, leave, and room-code flow for two to four players.

Prerequisites: Phase 2 gate.

Deliverables:

- Create-room and join-by-code screens.
- Sanitized display names.
- Short room codes.
- Roster and ready state.
- Host-only start.
- Minimum two ready connected players.
- Maximum four clients.
- Actionable full, missing, closed, and invalid-code errors.
- Room and UI tests.

Acceptance:

- Room starts with two, three, or four players.
- Host cannot start while any connected player is unready.
- Fifth client cannot reserve or consume a seat.
- Lobby state resets cleanly after rematch or leave.

## T3.2 — Allocate concealed spawns

- [ ] Assign unique, maximally separated spawn regions for the current room size.

Prerequisites: T3.1 and T1.3.

Deliverables:

- Seeded server spawn selection for two, three, and four players.
- Unique spawn guarantee.
- Separation scoring.
- Per-client initial state that does not reveal other spawn assignments before visibility permits.
- Tests across many seeds and room sizes.

Acceptance:

- No players share a spawn.
- Four-player rooms use all four regions.
- Two- and three-player rooms choose a balanced subset.
- Opponent spawn positions are absent from unauthorized client state.

## T3.3 — Implement match phases and countdown

- [ ] Add server-owned lobby, countdown, playing, round-over, and closed phases.

Prerequisites: T3.1 and T3.2.

Deliverables:

- Server-timed countdown.
- Input restrictions by phase.
- Room lock at match start.
- Match/round identity increment.
- Clean reset for rematch.
- Phase-transition and stale-command tests.

Acceptance:

- Movement and combat cannot affect the match before “Go.”
- PvP becomes active immediately at “Go.”
- Late join is rejected after lock.
- Old-round commands cannot affect a rematch.

## T3.4 — Implement last-player-standing victory

- [ ] End the free-for-all when zero or one living player remains.

Prerequisites: T2.5 and T3.3.

Deliverables:

- Living-player tracking.
- Winner or draw result.
- Exactly-once round end.
- Results state and basic results screen.
- Host rematch and room reset.
- Tests for two-, three-, and four-player elimination orders and simultaneous deaths.

Acceptance:

- Correct winner for every tested elimination order.
- Draw only under documented simultaneous conditions.
- No combat affects a completed round.
- Rematch restores health, ammo, alive state, entities, sequences, and spawn assignments.

## T3.5 — Implement per-client opponent visibility

- [ ] Prevent clients from receiving exact positions for currently hidden opponents.

Prerequisites: T1.3 and T3.3.

Deliverables:

- Documented visibility rule using range, map occlusion, and later darkness-compatible inputs.
- Server-side eligibility per viewer and target.
- Colyseus synchronization approach that supports different views per client.
- Safe reveal and conceal transitions.
- Tests proving hidden coordinates are absent, not merely invisible.

Acceptance:

- Each of four clients may receive a different opponent view.
- Hidden positions cannot be read from schema state, debug view, or ordinary events.
- Revealed opponents interpolate cleanly.
- Firing may disclose only the approved approximate or temporary information.

Do not:

- Implement the darkness contraction yet.
- Send all positions and hide them only in Three.js.

## T3.6 — Add disconnect outcome

- [ ] Define and implement the minimal fair disconnect rule for an active short match.

Prerequisites: T3.4.

Deliverables:

- Explicit grace duration or immediate-forfeit decision recorded in `why.html`.
- Disconnected player state.
- Input rejection after disconnect.
- Winner reevaluation.
- Room cleanup.
- Tests for lobby disconnect, active disconnect, host disconnect, multiple disconnects, and rematch.

Acceptance:

- A disconnect cannot leave an immortal body or stall victory.
- The rule behaves consistently for two, three, and four-player rooms.
- Remaining players receive an understandable event.

## T3.7 — Complete the four-client integration harness

- [ ] Automate complete free-for-all room scenarios without creatures.

Prerequisites: T3.1 through T3.6.

Deliverables:

- Four automated clients joining one room.
- Ready, countdown, movement, visibility, combat, eliminations, result, and rematch actions.
- Latency and jitter options.
- Structured logs and deterministic seeds.
- Repeated-room cleanup test.

Acceptance:

- Accelerated full match completes with one valid result.
- Every client agrees on public outcome.
- Hidden-state assertions pass from every client perspective.
- Repeated matches show no unbounded room, entity, listener, or timer growth.

## Phase 3 gate

- [ ] Complete repeated hosted two-, three-, and four-player free-for-all sessions.

Pass only when:

- Four-player is the primary acceptance test.
- Early combat works with no protected preparation phase.
- Visibility filtering is server-side.
- Victory and rematch are reliable.
- All deployable changes are committed, pushed, deployed, and remotely verified.

---

# Phase 4 — PvE, loot, and continuous pressure

Goal: add only the systems required to turn direct free-for-all combat into continuous PvPvE.

## T4.1 — Create the creature simulation foundation

- [ ] Add server-owned creature identity, lifecycle, targeting, movement, health, and damage pathways.

Prerequisites: Phase 3 gate.

Deliverables:

- Creature schema/view state compatible with per-client visibility.
- Runtime entity registry.
- Fixed-step update.
- Target-selection interface.
- Spatial query support.
- Hard population cap.
- Spawn and dispose tests.

Acceptance:

- Clients cannot spawn, move, damage, kill, or retarget creatures authoritatively.
- Creature lifecycle does not leak schema or runtime entries.
- Simulation remains independent of Three.js.

## T4.2 — Implement the swarmer

- [ ] Add the weak direct-pressure creature.

Prerequisites: T4.1.

Deliverables:

- Server pursuit, attack warning, contact attack, damage, hit reaction event, death, and optional ammo-drop hook.
- Simple steering around authored obstacles.
- Placeholder Three.js presentation.
- Tests for target selection, movement, warning, attack rate, damage, death, and cap behaviour.

Acceptance:

- Swarmer always telegraphs before damage.
- It cannot attack through blocked geometry.
- Groups create movement pressure without trapping a player through overlapping collision.

## T4.3 — Implement the spitter

- [ ] Add the fragile ranged-pressure creature.

Prerequisites: T4.1 and T4.2.

Deliverables:

- Range selection, wind-up, server projectile or equivalent attack representation, collision, damage, cooldown, death, and presentation telegraph.
- Hard projectile cap and cleanup.
- Tests for line of sight, range, warning, collision, damage, expiration, and cap behaviour.

Acceptance:

- Projectile is avoidable after its warning.
- Hidden spitter cannot inflict an unreadable attack.
- Projectile entities cannot grow without bound.

## T4.4 — Add authored creature placement and pacing

- [ ] Populate the fixed map with creature zones that shape routes without deciding spawns unfairly.

Prerequisites: T4.2 and T4.3.

Deliverables:

- Authored spawn zones.
- Seeded selection from authored points.
- Normal population budget of 12–24.
- Stress budget of 48.
- Spawn safety checks around players.
- Debug metrics for population and update cost.

Acceptance:

- All four starting regions receive comparable initial pressure.
- Direct cross-map routes are costly but possible.
- Creatures do not appear on top of visible players.
- Population cap degrades gracefully.

## T4.5 — Add ammunition and healing pickups

- [ ] Create server-owned, single-consumption supplies.

Prerequisites: T4.1 and T2.2.

Deliverables:

- Ammo and small-heal pickup definitions.
- Authored spawn points and seeded selection.
- Hold or immediate interaction decision documented.
- Server eligibility, consumption, and respawn/non-respawn rules.
- Per-client visibility.
- Tests for single consumption, simultaneous claims, caps, visibility, ammo limits, and health limits.

Acceptance:

- One pickup benefits one valid claimant exactly once.
- Client cannot claim from invalid range or hidden state.
- Ordinary ammunition expenditure does not make continued participation impossible.

## T4.6 — Add the centre-biased shotgun

- [ ] Create one situational weapon pickup that attracts conflict.

Prerequisites: T2.3 and T4.5.

Deliverables:

- Shotgun data, pellet/ray behaviour, spread, damage, knockback, magazine, reserve, and active-reload timing.
- Distinct placeholder silhouette and feedback.
- Authored centre-biased spawn possibilities.
- Weapon replacement and old-found-weapon drop rule.
- Server tests for pickup race, firing, pellets, obstacles, ammo, reload, and drop lifecycle.

Acceptance:

- Shotgun is strong at short range but not a universal upgrade.
- First possession does not guarantee victory.
- Ammunition constrains repeated use.
- Dropped weapons cannot duplicate.

## T4.7 — Add darkness visibility

- [ ] Apply server-controlled darkness range to per-client visibility.

Prerequisites: T3.5 and T4.4.

Deliverables:

- Authoritative visibility radius or authored visibility regions.
- Interaction with map occlusion.
- Approved approximate gunfire/creature-activity cues.
- Client presentation that obscures only state the server already filtered.
- Tests for each viewer/target combination across light, darkness, occlusion, and gunfire.

Acceptance:

- Removing the visual darkness layer cannot reveal hidden coordinates.
- Required attacks remain telegraphed.
- Players can infer activity without exact enemy markers.

## T4.8 — Add staged darkness contraction

- [ ] Compress the playable area until one player remains.

Prerequisites: T4.7 and T3.4.

Deliverables:

- Server-controlled stages and timers.
- Environmental warnings.
- Authoritative boundary state.
- Reduced information, increased pressure, and lethal outside damage progression.
- Final region with multiple approaches and cover.
- Tests for timing, boundary agreement, damage, simultaneous deaths, and victory.

Acceptance:

- Every client receives the same boundary.
- Camping outside cannot win.
- The boundary does not require teleporting players.
- Matches resolve before the hard maximum in representative tests.

## T4.9 — Tune third-party and creature interference

- [ ] Evaluate whether creatures improve or randomize four-player fights.

Prerequisites: T4.4 through T4.8.

Deliverables:

- Debug telemetry for creature damage to players, player damage to creatures, encounter locations, PvP deaths during creature pressure, ammo expenditure, and match duration.
- At least one four-player playtest session.
- Written findings in `why.html`.
- Data-only tuning changes justified by findings.

Acceptance:

- Creature involvement is measurable.
- No untested architecture is added in response to balance observations.
- If creatures routinely decide fights unfairly, the task records a concrete next experiment rather than hiding the result.

## Phase 4 gate

- [ ] Complete repeated hosted four-player continuous PvPvE matches.

Pass only when:

- PvP and PvE are active continuously.
- Central loot and darkness cause natural convergence.
- Early encounters remain possible.
- Creature pressure is understandable.
- Matches finish within the target duration.
- Current deployments and remote smoke tests pass.

---

# Phase 5 — Presentation, accessibility, hardening, and MVP release

Goal: turn the proven systems into a stable, understandable browser game without expanding design scope.

## T5.1 — Establish the chunky 2.5D visual language

- [ ] Replace the most confusing placeholders with a coherent, low-cost presentation.

Prerequisites: Phase 4 gate.

Deliverables:

- Orthographic camera and render-resolution decision.
- Compact upright dog sprite/billboard or minimal geometry treatment.
- Distinct four-player colours or markers.
- Starting firearm and shotgun silhouettes.
- Swarmer and spitter silhouettes.
- Red-earth, moonlight, obstruction, pickup, and darkness palette.
- Asset scale and nearest-neighbour rules.

Acceptance:

- Players, weapons, creatures, pickups, cover, and telegraphs are distinguishable at actual laptop scale.
- Colour is not the sole player or danger identifier.
- Asset approach remains sustainable for a non-artist.
- Performance remains inside budget.

Do not:

- Add multiple dog characters.
- Build a full animation pipeline before the required poses are proven.

## T5.2 — Complete combat and environmental audio

- [ ] Add a small, capped audio system that communicates gameplay state.

Prerequisites: T2.6 and T4.8.

Deliverables:

- Browser audio activation.
- Fire, dry fire, melee, impact, reload start, good, perfect, fumble, damage, death, creature warning, pickup, darkness warning, countdown, and victory cues.
- Concurrent-sound caps and priority.
- Master and effects volume.
- Mute setting persisted locally.

Acceptance:

- Important cues remain audible during four-player creature combat.
- Repeated events do not create unbounded audio nodes.
- The game remains playable muted through visual cues.

## T5.3 — Complete minimal interface and settings

- [ ] Present only the information required for informed play.

Prerequisites: T3.4, T4.5, T4.8, and T5.1.

Deliverables:

- Health presentation.
- Contextual magazine/reserve ammunition.
- Reload timing.
- Darkness safety direction when necessary.
- Connection-quality warning.
- Lobby, countdown, results, rematch, settings, and actionable error states.
- Screen shake, reduced effects, audio, and resolution settings.

Acceptance:

- No minimap, enemy markers, kill feed, XP, feat, armour, relic, or inventory UI appears.
- Players understand health, ammo, reload, opponent visibility, pickups, darkness, death, and victory.
- UI is keyboard accessible and readable at 1280×720.

## T5.4 — Add performance instrumentation and budgets

- [ ] Measure client, server, and network costs under the four-player stress case.

Prerequisites: Phase 4 gate.

Deliverables:

- Client frame-time, object count, draw call, and memory observations available in development.
- Server simulation p50/p95/p99, room/entity counts, and memory.
- Bandwidth by schema patch and event class.
- Four-player plus 48-creature stress scenario.
- Documented representative hardware and browsers.

Acceptance:

- Representative load targets 60 FPS.
- Stress stays above 30 FPS.
- Server p95 simulation step remains below 20 ms.
- Downstream and upstream remain within `spec.md` hypotheses or the spec is revised with evidence.
- Repeated matches show stable resource use.

## T5.5 — Security and abuse hardening

- [ ] Verify that hostile clients cannot author consequential state or exhaust a room trivially.

Prerequisites: complete gameplay protocol.

Deliverables:

- Message-rate limits.
- Payload-size and numeric validation.
- Phase, identity, sequence, range, and cooldown enforcement.
- Allowed-origin configuration.
- Structured violation logging without unnecessary personal data.
- Tests for malformed, excessive, stale, impossible, and unauthorized commands.

Acceptance:

- Client cannot invent movement, dash, damage, ammo, reload category, pickup, creature state, darkness, death, or victory.
- Invalid traffic cannot crash the room or affect other rooms.
- Administrative capabilities are inaccessible to game clients.

## T5.6 — Browser and hardware matrix

- [ ] Verify the production-like game across target browsers and machines.

Prerequisites: T5.1 through T5.5.

Required matrix:

- Current Chrome.
- Current Firefox.
- Safari on the target MacBook.
- Apple Silicon MacBook Air baseline.
- Integrated-graphics Windows laptop baseline.
- Hosted four-player match at realistic latency.

Acceptance:

- Input, audio, rendering, resize, visibility, networking, and rematch work.
- Performance results are recorded.
- Unsupported combinations show an actionable message.
- Browser-specific workarounds are documented and tested.

## T5.7 — Deployment reliability and rollback

- [ ] Harden the client and server release process used after every task.

Prerequisites: T0.7 and T5.6.

Deliverables:

- Repeatable client build and deploy.
- Repeatable server build and deploy.
- Health check and smoke match.
- Environment and secret documentation.
- Logs and restart behaviour.
- Rollback instructions for both artifacts.
- Version/commit identifier visible in diagnostics.

Acceptance:

- A release can be deployed from a clean checkout.
- Hosted client connects to the intended WSS server.
- A failed release can be rolled back without editing source.
- Commit, client version, and server version can be correlated.

## T5.8 — Final MVP playtest and scope decision

- [ ] Test whether the continuous four-player PvPvE hypothesis is actually fun.

Prerequisites: T5.1 through T5.7.

Deliverables:

- Multiple full four-player friend matches.
- Recorded observations for opening routes, spawn rushing, PvE pressure, ammo scarcity, active reload, melee, centre shotgun, third-party fights, darkness, match duration, and rematch demand.
- Decision journal entry separating evidence from opinion.
- Prioritized fixes limited to the current MVP.
- Explicit recommendation: continue, revise the loop, return to solo, or stop.

Acceptance:

- The decision is based on observed play, not feature completeness.
- No expansion feature is added to rescue an unproven core loop.
- The developer can explain every major client/server boundary.

## MVP release gate

- [ ] Verify every acceptance criterion in `spec.md`.
- [ ] Verify every active task above is complete or explicitly deferred with user approval.
- [ ] Run type checking, linting, unit tests, protocol tests, room tests, four-client integration tests, production build, and soak/stress checks.
- [ ] Complete a hosted four-player WSS match on the production-like deployment.
- [ ] Confirm current client and server health after deployment.
- [ ] Confirm all shipped audiovisual assets are original, licensed, or clearly temporary.
- [ ] Update `README.md`, `spec.md`, `TODO.md`, and `why.html` to match the released implementation.
- [ ] Commit, push, deploy, verify, and report the release commit and URLs.

---

# Deferred work

Do not begin these items unless the MVP playtest passes and the user explicitly reprioritizes them:

- XP, levels, and feats.
- Armour and relics.
- Additional weapons, creatures, maps, or dogs.
- Procedural maps.
- Teams, two-versus-two packs, revival, courage, or alpha.
- More than four players.
- Public matchmaking, ranking, or accounts.
- Reconnection beyond the minimal disconnect rule.
- Spectators, chat, or social systems.
- Permanent progression, cosmetics, purchases, or trading.
- Mobile, native desktop, or console clients.
