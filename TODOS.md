# Terra Rossa — Superseded Pack Royale LLM Build Backlog

This document converts the multiplayer `spec.md` into small, dependency-ordered tasks that an LLM agent can implement safely.

> **Do not execute this backlog:** it describes the former sixteen-player Pack Royale plan and no longer matches the active two-player Three.js/Colyseus `spec.md`. It remains only as historical design material. A new implementation backlog should be derived from the current specification before game work begins.

## How an agent should use this backlog

Before starting any task:

1. Read `AGENTS.md`, `spec.md`, `why.html`, and this task in full.
2. Inspect the repository and preserve unrelated user changes.
3. Confirm every prerequisite task is complete in the repository.
4. Implement only the selected task. Do not silently begin later tasks.
5. Prefer the smallest architecture that satisfies the acceptance criteria.
6. Do not replace an established project convention without documenting why.
7. Update this checklist and `why.html` when the task changes a decision or provides new evidence.
8. Run the checks named by the task plus any cheaper relevant checks.
9. Commit, push, and deploy when required by `AGENTS.md`.

Task status:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete and verified
- `[!]` Blocked; document the blocker beneath the task

## Global implementation rules

- Desktop web is the primary client target.
- Use a pinned Godot 4.x release, typed GDScript, and the Compatibility renderer.
- Consequential state is server authoritative.
- Keep simulation rules separate from presentation.
- Do not add a system merely because it appears later in the backlog.
- Do not add final art before the relevant performance and gameplay gate passes.
- Use placeholder assets that are original, generated for the project, or clearly marked temporary.
- Treat performance budgets as product requirements, not final polish.
- Use deterministic seeds for maps, loot, and repeatable tests where appropriate.
- Make important tuning values data-driven.
- Avoid large autoloads, implicit scene-tree dependencies, and unbounded node creation.
- The compass is the only persistent gameplay HUD.
- Temporary contextual UI is permitted for loading, lobby, item inspection, reload timing, feat selection, settings, errors, and results.

---

# Phase 0 — Repository and web feasibility

Goal: prove that the chosen Godot/web/server approach is viable before building game content.

## P0.1 — Baseline repository audit

- [ ] Inspect the existing Godot project, Git state, ignore rules, scenes, imports, and project settings.

Prerequisites: none.

Deliverables:

- A short repository structure documented in the README.
- Confirmation of the current Godot project entry scene and renderer.
- A list of generated/imported files that should remain ignored.
- Any broken starter references corrected only when necessary to open the project.

Acceptance:

- The project opens without missing-resource errors.
- Git status distinguishes source files from generated Godot files.
- No gameplay system is introduced.

Do not:

- Reorganize the entire repository.
- Add networking, combat, or production art.

## P0.2 — Pin the Godot toolchain

- [ ] Select and document one supported Godot 4.x minor release and matching export templates.

Prerequisites: P0.1.

Deliverables:

- Pinned engine version in project documentation.
- Compatibility renderer configured for editor and web builds.
- Typed GDScript conventions documented.
- Reproducible commands or documented steps for editor, headless checks, web export, and server export.

Acceptance:

- A developer can identify and install the exact required Godot version.
- The project reports the Compatibility renderer.
- The version choice and web limitations are added to `why.html`.

Do not:

- Use C#.
- Depend on Forward+ or Mobile renderer features.

## P0.3 — Minimal browser export

- [ ] Produce the smallest working browser export of the current project.

Prerequisites: P0.2.

Deliverables:

- Web export preset.
- Minimal boot scene.
- Loading/start interaction that satisfies browser audio requirements.
- Documented local serving procedure.

Acceptance:

- The game loads in current Chrome and Firefox from a local HTTP server.
- It does not require an account or installation.
- Browser console contains no release-blocking errors.
- Export size is recorded.

Do not:

- Build the final menu.
- Enable threaded web export.

## P0.4 — Minimal dedicated server

- [ ] Export and run a headless authoritative Godot server.

Prerequisites: P0.2.

Deliverables:

- Dedicated-server export preset.
- Minimal server entry path.
- Clear separation between client boot and server boot.
- Startup and clean-shutdown logging.

Acceptance:

- The server starts without graphics or audio dependencies.
- It exits cleanly.
- Server-only execution does not load unnecessary presentation resources.

Do not:

- Implement matchmaking or persistence.

## P0.5 — Browser-to-server connection spike

- [ ] Connect one web client to the headless server over WebSocket.

Prerequisites: P0.3 and P0.4.

Deliverables:

- Connection lifecycle with connecting, connected, failed, and disconnected states.
- Server-assigned immutable peer ID.
- Small versioned handshake.
- Actionable client error on protocol mismatch or connection failure.

Acceptance:

- A browser client connects, receives its ID, exchanges a test message, and disconnects cleanly.
- The server rejects malformed or incompatible handshakes.
- Production transport expectations are documented as HTTPS/WSS.

Do not:

- Trust a client-provided identity.
- Add game-state replication yet.

## P0.6 — Performance stress harness

- [ ] Build a temporary feasibility scene representing the projected worst browser load.

Prerequisites: P0.3.

Deliverables:

- Sixteen animated placeholder dogs.
- One hundred very-low-poly animated creature placeholders.
- One hundred pooled projectile or equivalent effect representatives.
- Representative armour attachments, one relic effect, darkness overlay, and static occluders.
- On-screen or logged frame time, node count, draw calls, and memory indicators available in a debug build.
- Low, medium, and high quality toggles for comparison.

Acceptance:

- Representative load targets 60 FPS on the selected MacBook baseline.
- Deliberate stress remains at or above 30 FPS.
- Results are recorded by browser, hardware, resolution, and quality.
- Production caps are revised in `spec.md` and `why.html` if evidence contradicts current hypotheses.

Do not:

- Treat placeholder behaviour as production AI.
- Continue to Phase 1 if the hard minimum fails without revising and retesting.

---

# Phase 1 — Offline combat feel

Goal: prove that one dog fighting creatures is responsive, readable, and fun before networking the full game.

## P1.1 — Input and isometric movement

- [ ] Implement one locally controlled dog with independent movement and aiming.

Prerequisites: Phase 0 gate passed.

Deliverables:

- WASD movement.
- Mouse world-space aiming.
- Orthographic isometric camera.
- Shared dash with cooldown.
- No player collision assumptions embedded in movement.

Acceptance:

- Movement is frame-rate independent.
- Aim remains accurate at supported render resolutions.
- Dash direction and recovery feel consistent.
- The local dog remains readable at the intended MacBook camera scale.

Do not:

- Add dog-specific abilities.
- Add networking.

## P1.2 — Combat data definitions

- [ ] Define data resources for weapons, damage, ammunition, and common combat modifiers.

Prerequisites: P1.1.

Deliverables:

- Weapon definition schema.
- Ammunition category schema.
- Damage event schema.
- Validation that rejects incomplete or contradictory definitions.
- Two placeholder weapon definitions with different firing rhythms.

Acceptance:

- Weapon behaviour is configured through data rather than UI or character code.
- Invalid definitions fail loudly in development.
- No weapon assumes unlimited ammunition.

Do not:

- Create the full weapon catalogue.

## P1.3 — Firing and ammunition

- [ ] Implement firing, magazines, reserve ammunition, and empty-weapon behaviour.

Prerequisites: P1.2.

Deliverables:

- One hitscan weapon.
- One visible-projectile weapon.
- Magazine and reserve consumption.
- Dry-fire feedback.
- Pooled projectile lifecycle.

Acceptance:

- Fire rate cannot exceed weapon data.
- Ammunition never becomes negative.
- Empty weapons remain equipped but cannot fire.
- Projectile and effect counts remain bounded.

## P1.4 — Active reload

- [ ] Implement normal, good, perfect, and failed reload outcomes.

Prerequisites: P1.3.

Deliverables:

- Manual reload start.
- One timing attempt per reload.
- World-attached timing line near the dog or reticle.
- Shape-supported good/perfect zones.
- Fumble animation/audio hook for a failed attempt.
- Per-weapon timing configuration.

Acceptance:

- No input completes the normal reload.
- Good and perfect results shorten it according to data.
- A bad input adds the configured penalty.
- Reload cannot duplicate ammunition.
- The cue remains readable over representative combat effects.

## P1.5 — Universal melee

- [ ] Implement the infinite-use baseline melee attack.

Prerequisites: P1.1.

Deliverables:

- Short forward hit shape.
- Modest damage, strong knockback, and recovery.
- Interaction rule with reload commitment.
- Hooks for distinct dog animations without changing the common power budget.

Acceptance:

- Melee works with an empty weapon.
- It cannot cancel a committed or failed reload.
- Repeated melee cannot permanently lock an equivalent target.
- Hit detection matches the visible attack.

## P1.6 — Creature foundation

- [ ] Implement one inexpensive common creature using production-oriented pooling and steering.

Prerequisites: P1.3 and P1.5.

Deliverables:

- Spawn, pursue, telegraph, attack, react, die, and return-to-pool states.
- Very-low-poly placeholder visual.
- Shared spatial query service.
- Batched decision updates.
- Simple local avoidance.

Acceptance:

- Creature behaviour is independent of render frame rate.
- Spawning and killing repeatedly does not grow node count.
- Attacks always provide a readable warning.
- The creature does not run a full navigation query every frame.

## P1.7 — Punch feedback pass

- [ ] Make the two weapons and melee feel forceful without exceeding web budgets.

Prerequisites: P1.3 through P1.6.

Deliverables:

- Hit reactions.
- Knockback.
- Restrained local hit-stop.
- Layered but capped impact audio.
- Capped particles, decals, and camera shake.
- Reduced-effects setting.

Acceptance:

- Combat remains readable with a representative creature group.
- Feedback never changes authoritative hit timing.
- Effect pools and concurrent audio remain capped.
- Reduced-effects mode preserves telegraph clarity.

## Phase 1 gate

- [ ] Conduct a focused playtest of the offline combat slice.

Pass when:

- Movement, firing, active reload, melee, and creature reactions are understandable without instruction.
- Testers describe combat as responsive and punchy.
- The slice meets the web frame budget.
- Recorded problems are converted into bounded backlog tasks before Phase 2.

---

# Phase 2 — Authoritative multiplayer foundation

Goal: make combat correct and responsive across browser clients before adding progression or content.

## P2.1 — Network entity registry

- [ ] Create stable server-owned network identities and lifecycle rules.

Prerequisites: P0.5 and Phase 1 gate.

Deliverables:

- Stable network entity IDs.
- Server-owned spawn/despawn.
- Full baseline state for a joining client.
- Protection against duplicate, stale, and unknown IDs.

Acceptance:

- Repeated spawn/despawn cycles do not leak or reuse live identities.
- A client cannot create an authoritative entity.

## P2.2 — Authoritative dog movement

- [ ] Replicate dog input and movement with local prediction and server reconciliation.

Prerequisites: P2.1.

Deliverables:

- Compact sequenced input commands.
- Thirty-Hz server simulation target.
- Local prediction.
- Server acknowledgement and reconciliation.
- Remote interpolation.

Acceptance:

- Movement is playable at 150 ms simulated round-trip latency.
- Reconciliation does not routinely snap during normal movement.
- Speed, dash, and collision limits are server validated.

## P2.3 — Authoritative combat

- [ ] Move firing, ammunition, reload results, melee, hits, and damage under server authority.

Prerequisites: P2.2.

Deliverables:

- Validated fire and melee requests.
- Server-owned ammunition and reload state.
- Latency-tolerant active-reload timestamp validation.
- Server ray tests and projectile simulation.
- Reliable damage/death events.

Acceptance:

- Clients cannot exceed fire rate, invent ammunition, choose reload outcomes, or declare damage.
- Local feedback remains immediate.
- Two clients agree on health and combat results under latency.

## P2.4 — Visibility and interest management

- [ ] Prevent clients from receiving exact state for entities they should not know about.

Prerequisites: P2.1.

Deliverables:

- Spatial sectors.
- Server line-of-sight and darkness eligibility.
- Near, distant, hidden, and globally important update policies.
- Safe reveal/hide transitions.

Acceptance:

- Hidden enemy positions are absent from client game state.
- Revealed entities interpolate without an obvious invalid jump.
- Bandwidth is measured by message class.

## P2.5 — Disconnect and reconnect

- [ ] Preserve a player's slot and build through a short connection loss.

Prerequisites: P2.2 and P2.3.

Deliverables:

- Thirty-second grace target.
- Reconnect token that is not the public player ID.
- Inactive noncontributing dog state.
- Expiry and slot-release behaviour.

Acceptance:

- A client can reconnect and resume the same dog.
- A different client cannot claim the slot.
- Exact pack-elimination behaviour for all-inactive members is documented and tested.

## P2.6 — Multiplayer bot harness

- [ ] Create headless bots that exercise connection, movement, and combat.

Prerequisites: P2.3.

Deliverables:

- Configurable bot count.
- Plausible movement, aim, fire, melee, reload, and disconnect actions.
- Latency/jitter configuration.
- Metrics export for server tick, bandwidth, entity count, and errors.

Acceptance:

- Repeatable 1-, 4-, 8-, 12-, and 16-client runs complete.
- A 20-minute soak shows stable memory and node/entity counts.
- Failures produce actionable logs.

## Phase 2 gate

- [ ] Complete a browser-versus-browser combat test and a 16-bot soak.

Pass when:

- Combat remains authoritative and responsive.
- No hidden-position leak is observed.
- Client and server meet hard performance budgets.
- Reconnect behaviour is deterministic.

---

# Phase 3 — Packs and match rules

Goal: complete the social survival loop that distinguishes Pack Royale.

## P3.1 — Lobby and random pack assignment

- [ ] Create the smallest private-room lobby and balanced random pack assignment.

Prerequisites: Phase 2 gate.

Deliverables:

- Display-name entry.
- Private room creation and joining.
- Ready state.
- Automatic pack count and balanced distribution.
- Server-owned random assignment.

Acceptance:

- Player counts 2 through 16 produce exactly the distributions in `spec.md`.
- No pack exceeds four.
- Pack sizes differ by no more than one.
- Players cannot select or change packs.

Do not:

- Add ranked matchmaking or public skill matching.

## P3.2 — Dog selection

- [ ] Let assigned packmates privately choose from the initial placeholder roster.

Prerequisites: P3.1.

Deliverables:

- Pack-private selection state.
- Starting weapon and ability preview.
- Duplicate prevention within a pack.
- Timeout-safe automatic selection.

Acceptance:

- Rival packs may choose the same dog.
- One pack cannot contain duplicate dogs.
- Selection never blocks match start indefinitely.

## P3.3 — Pack relationships

- [ ] Enforce ally/enemy relationships without friendly collision or friendly fire.

Prerequisites: P3.1.

Deliverables:

- Server-owned pack membership.
- Ally targeting and damage rules.
- Pack-private pings and relevant state.
- Enemy identity reveal only when visibility allows.

Acceptance:

- Allies cannot damage or block each other.
- Enemies can damage one another from match start.
- Clients cannot change pack membership.

## P3.4 — Down, crawl, revive, and wipe

- [ ] Implement the complete pack survival rule.

Prerequisites: P3.3 and P2.3.

Deliverables:

- Downed state at zero health.
- Slow crawl.
- Disabled fire, melee, dash, and ability.
- Ally revive interaction.
- Partial-health recovery and brief protection.
- Immediate pack elimination when every member is down.

Acceptance:

- Enemy players cannot finish a downed dog.
- Any standing ally can revive.
- Simultaneous final downs eliminate exactly once.
- An eliminated pack cannot affect the match.

## P3.5 — Pack courage and isolation

- [ ] Implement overlapping pack proximity as a server-owned gameplay input.

Prerequisites: P3.3 and P2.4.

Deliverables:

- Courage contribution from nearby allies.
- Visibility improvement while packed.
- Reduced information and increased creature pressure while isolated.
- Debug visualization available only in development.

Acceptance:

- An isolated dog suffers without weakening distant teammates.
- Two or more nearby allies improve the local state.
- Courage does not depend solely on alpha.
- Values are data-driven and observable in tests.

## P3.6 — Alpha lifecycle and scoring

- [ ] Implement one non-power alpha per pack.

Prerequisites: P3.3.

Deliverables:

- Random initial alpha.
- Fixed evaluation interval.
- Rolling contribution inputs.
- Succession.
- Accumulated alpha time.
- Clear world and compass presentation.

Acceptance:

- Alpha grants no combat stats or loot authority.
- Raw damage alone cannot guarantee leadership.
- Disconnect triggers valid succession.
- Results report total alpha time.

## P3.7 — Match victory and results

- [ ] Complete last-pack-standing match state and minimal results.

Prerequisites: P3.4.

Deliverables:

- Match start, active, ended, and rematch states.
- Last-pack-standing victory.
- Server-validated team and personal results.
- Alpha time, downs, revives, creature contribution, PvP contribution, and survival.

Acceptance:

- The match ends once and names the correct pack.
- Results cannot be supplied by clients.
- Rematch returns all connected players to a clean lobby state.

## Phase 3 gate

- [ ] Complete repeated two-pack friend tests with placeholder content.

Pass when:

- Random packs, encounters, revival, wipe, alpha, victory, and rematch work.
- Players understand why a pack was eliminated.
- Pack systems improve cooperation without requiring text or voice chat.

---

# Phase 4 — Progression and physical loot

Goal: make each match produce different builds without inventory bureaucracy.

## P4.1 — Individual XP and levels

- [ ] Implement individual levels fed by nearby shared creature XP and pack PvP rewards.

Prerequisites: Phase 3 gate.

Deliverables:

- Individual XP and level state.
- Nearby creature-XP sharing.
- Pack-wide PvP elimination award.
- Server validation and deterministic thresholds.

Acceptance:

- Final-hit ownership does not control creature XP.
- Isolated dogs may fall behind naturally.
- XP cannot be duplicated through down, revive, reconnect, or elimination.

## P4.2 — Feat definitions and offers

- [ ] Create the feat data model and first small test pool.

Prerequisites: P4.1.

Deliverables:

- Feat definition schema.
- Prerequisite, exclusion, stacking, and tag support.
- Deterministic three-choice offers.
- One reroll per match.
- Selection timeout and safe automatic choice.

Acceptance:

- Each dog chooses independently.
- The match never pauses.
- Invalid combinations are never offered.
- Feats modify simulation through defined modifier interfaces rather than special UI code.

## P4.3 — Equipment slots and physical exchange

- [ ] Implement one weapon, one armour, and one relic slot with world pickup/drop interaction.

Prerequisites: P2.3.

Deliverables:

- Hold-to-pick-up.
- Occupied-slot swap onto the ground.
- Short-distance pack throw/drop.
- Temporary item name and one-sentence description.
- Server-owned item entities and ownership changes.

Acceptance:

- There is no inventory grid or loot vote.
- Simultaneous pickup attempts resolve once.
- Equipment cannot duplicate through swapping, reconnect, downing, or elimination.
- Only found equipped weapons drop after pack elimination.

## P4.4 — Armour framework

- [ ] Implement visible armour attachments and two behaviourally distinct test pieces.

Prerequisites: P4.3.

Deliverables:

- Shared character attachment contract.
- Visible silhouette/material change.
- Impact/activation feedback.
- Temporary inspection description.
- Data-driven effect hook.

Acceptance:

- Armour state is understandable without a persistent armour panel.
- Armour has no durability.
- Starting base stats remain equal before equipment and feats.

## P4.5 — Relic framework

- [ ] Implement the consistent relic attachment and two clear test relics.

Prerequisites: P4.3.

Deliverables:

- Provisional belt-charm or chosen shared attachment.
- Unique dropped silhouettes.
- Distinct activation visuals and sounds.
- One reload-related and one dash-, melee-, revive-, visibility-, or ability-related effect.

Acceptance:

- Each effect fits in one sentence.
- Players can tell when it activates.
- Relics change behaviour rather than applying invisible generic percentages.
- The system supports an initial pool of approximately six without hard-coded dog dependencies.

## P4.6 — Loot director

- [ ] Generate randomized but budgeted loot opportunity.

Prerequisites: P4.3.

Deliverables:

- Functional categories and power tiers.
- Offered-value budget per starting region.
- Inward quality gradient.
- Darkness bounty locations.
- Configurable rare jackpot promotion.
- Match-seed reproducibility and debug report.

Acceptance:

- Starting regions offer comparable value within a documented tolerance.
- Exact loot differs by pack route and seed.
- The system does not compensate for loot a pack ignored.
- Jackpot probability is tiny, measurable, and ammunition-constrained.

## Phase 4 gate

- [ ] Run build-variety and equipment-sharing playtests.

Pass when:

- Players can exchange equipment without an inventory or vote.
- Individual feats create distinct builds.
- Loot variance creates stories without routinely deciding the winner at spawn.
- No duplication or invalid modifier stacking is found.

---

# Phase 5 — Island, sightlines, and shrinking darkness

Goal: turn the systems into one continuous, replayable PvPvE journey.

## P5.1 — Handcrafted island greybox

- [ ] Build one complete fixed-layout island with one central arena.

Prerequisites: Phase 3 gate.

Deliverables:

- Maximally separated outer spawn territories.
- At least two inward routes per territory.
- Outer, middle, and centre risk bands.
- Cover, sightline breaks, choke alternatives, and recognizable landmarks.
- Static occluders suitable for the Compatibility renderer.

Acceptance:

- No spawn pair has an opening sightline.
- Every spawn reaches the centre by at least two routes.
- No spawn has a clearly dominant travel time or basic-loot position.
- Camera occlusion never hides the local dog without a readability treatment.

## P5.2 — Creature encounter director

- [ ] Populate the island with budgeted creature encounters.

Prerequisites: P1.6 and P5.1.

Deliverables:

- Region encounter budgets.
- Time, location, player-count, and isolation inputs.
- Creature dens and inward difficulty gradient.
- Hard server/client entity caps.

Acceptance:

- Normal visible load remains within measured production budget.
- Isolated dogs experience more pressure.
- Encounters do not spawn unreadable attacks on top of players.
- The director degrades gracefully at the entity cap.

## P5.3 — Closing darkness

- [ ] Implement staged contraction from island edge to centre.

Prerequisites: P5.1 and P3.5.

Deliverables:

- Deterministic contraction schedule.
- Environmental warnings.
- Reduced visibility, increased threat, then lethal pressure.
- Direction-to-safety guidance consistent with minimal HUD.

Acceptance:

- Players understand which direction is safer without a minimap.
- Permanent outer camping is impossible.
- Darkness does not cut every route from a valid region at once.
- Contraction ends matches within the target session range.

## P5.4 — Compass

- [ ] Implement the only persistent HUD element.

Prerequisites: P3.3, P3.6, and P5.1.

Deliverables:

- Cardinal direction.
- Island-centre landmark.
- Living and downed packmates.
- Current alpha.
- Temporary pack pings.

Acceptance:

- It never automatically exposes enemies, creatures, loot, or gunfire.
- Downed allies are urgent and shape-distinct.
- It is readable at 1280×720 and scalable.

## P5.5 — Modular-region schema

- [ ] Define how proven island regions may later be rearranged without building full generation yet.

Prerequisites: P5.1 playtested.

Deliverables:

- Region connection sockets.
- Spawn, route, loot, encounter, cover, and occluder metadata.
- Validation contract.
- Seeded assembly test using a very small subset of regions.

Acceptance:

- Generated test layouts can be rejected with a specific validation reason.
- Connectivity, path tolerance, sightline, loot budget, and route-count checks exist.
- The fixed handcrafted island remains available as the fallback.

## P5.6 — Validated island randomization

- [ ] Expand modular assembly only after the schema and fixed island prove useful.

Prerequisites: P5.5 and Phase 4 gate.

Deliverables:

- Seeded region arrangement.
- Randomized cover variants, creature dens, loot positions, and sightlines.
- Bounded regeneration attempts.
- Guaranteed fallback layout.

Acceptance:

- Every accepted seed satisfies all `spec.md` generation rules.
- Failed generation cannot block a match indefinitely.
- A recorded seed reproduces the same structural map and offered loot.

## Phase 5 gate

- [ ] Complete repeated 4-, 8-, 12-, and 16-player island matches.

Pass when:

- Packs naturally move inward without teleportation or a PvP activation timer.
- Early encounters are possible but spawn rushing is not dominant.
- Sightlines, darkness, and compass provide enough information without a minimap.
- Match duration and performance remain inside target budgets.

---

# Phase 6 — First content set

Goal: replace system placeholders with the smallest coherent, balanceable game.

## P6.1 — Six-dog roster brief

- [ ] Define six visually and mechanically distinct dog heroes.

Prerequisites: Phase 1 gate and P4.2.

Deliverables for each dog:

- Name and concise personality.
- Breed/silhouette direction.
- Starting weapon.
- One active ability.
- Distinct melee presentation.
- Readability and effect budget.
- Intended strengths without a class label.

Acceptance:

- Starting health, speed, armour, regeneration, dash, revive, and total melee power remain equal.
- Starting weapons are sidegrades.
- No ability is mandatory for a viable pack.

## P6.2 — Initial weapon set

- [ ] Define and implement the smallest weapon set that supports the six dogs and found upgrades.

Prerequisites: P6.1 and P1.4.

Deliverables:

- Strong silhouettes and carry poses.
- Distinct firing, reload, and impact rhythm.
- Limited ammunition categories.
- Active-reload windows.
- PvE and PvP tuning data.

Acceptance:

- Weapons are recognizable without reading names.
- No starting weapon strictly dominates across common situations.
- Projectile-heavy choices remain within performance caps.

## P6.3 — Initial feat set

- [ ] Create a compact feat pool covering the major build axes.

Prerequisites: P4.2 and P6.2.

Coverage:

- Reload.
- Ammunition.
- Melee.
- Dash.
- Weapon behaviour.
- Survivability.
- Visibility/darkness.
- Revival.
- Dog ability synergy.

Acceptance:

- Every offer presents meaningful alternatives.
- No feat removes the core active-reload decision entirely.
- PvP crowd control and burst cannot create unavoidable kills.

## P6.4 — Initial armour set

- [ ] Create a small readable armour catalogue.

Prerequisites: P4.4.

Initial families:

- Plated.
- Spiked.
- Insulated.
- Medic.
- Shadow.

Acceptance:

- Each changes the visible dog silhouette.
- Each effect is understandable through inspection and activation feedback.
- None requires a persistent HUD stat panel.

## P6.5 — Six relics

- [ ] Create exactly one memorable initial relic for each agreed family.

Prerequisites: P4.5.

Families:

- Reload.
- Melee.
- Dash.
- Revival.
- Darkness/visibility.
- Ability.

Acceptance:

- Every relic has a unique dropped silhouette, attachment treatment, sound, and activation.
- Every effect fits in one sentence.
- Relics are desirable to different builds rather than forming one universal ranking.

## P6.6 — Creature roster

- [ ] Implement the initial creature roles.

Prerequisites: P1.6 and P5.2.

Roles:

- Swarmer.
- Brute.
- Spitter.
- Charger.
- Brood creature.
- Elite modifier framework.

Acceptance:

- Role is readable from silhouette and telegraph.
- Common creatures follow the low-poly and shared-rig budgets.
- Mixed encounters create decisions without unreadable overlap.

## P6.7 — Optional centre boss

- [ ] Add one high-risk centre objective only if normal matches already converge reliably.

Prerequisites: P6.6 and Phase 5 gate.

Deliverables:

- Multi-stage readable boss.
- Broadcast environmental cue.
- Superior but budgeted reward.
- Third-party interruption considered in encounter design.

Acceptance:

- The boss attracts conflict without becoming mandatory.
- Fighting it is a strategic risk, not free loot.
- Effects and spawned adds remain within caps.

---

# Phase 7 — Product shell and release readiness

Goal: make the proven match accessible and operable for groups of friends.

## P7.1 — Browser boot and settings

- [ ] Complete loading, audio activation, settings, accessibility, and recoverable errors.

Prerequisites: Phase 5 gate.

Acceptance:

- Start requires an intentional browser interaction.
- Volume, screen shake, gore, particles, resolution scale, and reload audio cue are configurable.
- Settings persist locally when browser storage is available.
- Failure states offer a clear retry or return path.

## P7.2 — Private-room experience

- [ ] Polish create, join, ready, pack assignment, dog selection, and rematch for friends.

Prerequisites: P3.1, P3.2, and P3.7.

Acceptance:

- A new player can join from a room code without documentation.
- A match cannot start with an invalid roster or stale peer.
- Room state survives ordinary reconnects.

## P7.3 — Contextual interface and accessibility audit

- [ ] Audit every gameplay fact against the minimal-HUD rule.

Prerequisites: P4.3, P4.4, P4.5, and P5.4.

Acceptance:

- Compass remains the only persistent HUD.
- Health, armour, ammo, reload, ability, item effects, and downed state remain understandable.
- Colour is never the only critical signal.
- Temporary panels are keyboard accessible and readable at 1280×720.

## P7.4 — Results, analytics, and operational metrics

- [ ] Record only the information needed to balance and operate matches.

Prerequisites: P3.7.

Metrics:

- Match starts, completions, duration, and pack sizes.
- Disconnect and reconnect outcomes.
- Client FPS and quality level with appropriate privacy treatment.
- Server tick, memory, entity count, and bandwidth.
- Dog, weapon, feat, armour, and relic selections.
- Damage, assists, downs, revives, creature kills, PvP eliminations, and alpha time.

Acceptance:

- Results are server validated.
- No unnecessary personal data or raw chat is collected.
- Metrics failures cannot break a match.

## P7.5 — Browser and hardware matrix

- [ ] Test production-like builds across target browsers and representative laptops.

Prerequisites: P7.1 and complete initial content.

Required:

- Current Chrome.
- Current Firefox.
- Safari on the target MacBook.
- Apple Silicon MacBook Air baseline.
- Integrated-graphics Windows laptop baseline.

Acceptance:

- Representative play targets 60 FPS.
- Deliberate stress stays at or above 30 FPS.
- Load size, load time, audio, input, memory, disconnects, and long-session stability are recorded.
- Unsupported combinations receive a useful message.

## P7.6 — Security and abuse pass

- [ ] Test protocol validation, rate limits, identity, visibility, and authoritative state.

Prerequisites: complete multiplayer feature set.

Acceptance:

- Clients cannot invent damage, XP, equipment, alpha score, pack membership, or visibility.
- Malformed and excessive messages are rejected without crashing the server.
- Administrative actions are unavailable to game peers.
- Production transport uses HTTPS/WSS.

## P7.7 — Deployment and operations

- [ ] Establish the production web-client, match-server, and room-allocation deployment path.

Prerequisites: P7.5 and P7.6.

Deliverables:

- Repeatable web deployment.
- Repeatable headless-server deployment.
- Environment and secret management.
- Health checks and structured logs.
- Crash/restart handling.
- Rollback procedure.
- Basic incident notes.

Acceptance:

- A hosted private 16-player friend match completes repeatedly.
- Deployment can be reproduced without undocumented local state.
- A failed release can be rolled back.

## MVP release gate

- [ ] Verify every acceptance criterion in `spec.md`.
- [ ] Resolve or explicitly defer every release-blocking defect.
- [ ] Complete a 16-bot stress run and repeated hosted friend matches.
- [ ] Confirm all shipped audiovisual content is owned, licensed, or clearly temporary.
- [ ] Update `README.md`, `spec.md`, `TODOS.md`, and `why.html` to reflect the released reality.

---

# Deferred work

Do not begin these until the MVP release gate passes or the user explicitly reprioritizes them:

- Lone Dogs free-for-all mode.
- Public matchmaking.
- Ranked play.
- Parties or player-selected packs.
- Additional islands.
- Permanent accounts or progression.
- Cosmetics, purchases, or trading.
- Text or voice chat.
- Mobile-browser support.
- Native desktop or console exports.
- User-generated maps.
