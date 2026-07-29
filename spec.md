# Terra Rossa — Continuous PvPvE MVP Specification

Status: Draft; active implementation target

Target: Current desktop Google Chrome

Client: TypeScript, Vite, Three.js, React application shell

Server: Node.js, Colyseus 0.17, authoritative room simulation

Players: Two to four; four-player free-for-all is the primary target

Genre: Continuous top-down PvPvE survival shooter

## 1. Purpose

This specification defines the smallest networked version of Terra Rossa that can test its central multiplayer idea:

> Up to four armed dog heroes enter the same hostile night, fight creatures for survival and supplies, and may discover, avoid, stalk, or kill one another at any time.

There is no protected preparation phase and no teleport into a final duel. PvE and PvP coexist from the opening second. The map, creatures, ammunition, loot, sightlines, and closing darkness should cause an eventual confrontation naturally.

This MVP is not the former sixteen-player Pack Royale design. It is an evidence-gathering free-for-all for two to four players, designed and balanced primarily around a full four-player room. Teams and packs remain deferred.

## 2. Product hypothesis

Terra Rossa can be compelling if these systems reinforce one another:

- limited ammunition makes every shot and route matter;
- active reload makes downtime skillful and risky;
- infinite melee prevents helplessness but requires dangerous proximity;
- creatures create pressure and reveal player activity;
- stronger supplies toward the centre encourage movement;
- darkness hides information while compressing the battlefield;
- several humans create uncertainty, temporary non-binding alliances, third-party threats, and route choices that scripted enemies cannot.

The game succeeds when players can tell memorable stories about when they first detected an opponent, whether they engaged or retreated, how a third player changed the fight, and how PvE pressure affected the outcome.

The game fails if the optimal strategy is routinely to rush the opposing spawn, hide until the final boundary, or ignore creatures and loot.

## 3. Design pillars

1. **Continuous danger:** PvP and PvE are active throughout the match.
2. **Combat before content:** movement, shooting, reloading, melee, damage feedback, and enemy response must feel good with placeholder art.
3. **Information is a resource:** darkness, sightlines, sound, creature behaviour, and muzzle flashes help players infer danger without a minimap.
4. **Scarcity creates movement:** limited ammunition and stronger central loot produce routes and conflict.
5. **No scripted final duel:** the map closes, but players retain agency over when and how they meet.
6. **The server decides outcomes:** movement legality, creatures, ammunition, reloads, hits, damage, pickups, darkness, death, and victory are authoritative.
7. **Small enough to understand:** the human developer should be able to explain the client, protocol, room, simulation, and rendering flow.
8. **Browser performance is a feature:** rendering, simulation, bandwidth, memory, and download size are measured from the first slice.

## 4. MVP scope

The complete MVP contains:

- two to four human players, with four as the primary acceptance case;
- one shared Colyseus room per match;
- one handcrafted map;
- four concealed and widely separated spawn regions;
- one compact anthropomorphic dog presentation shared by all players, with distinct player colours or markers;
- one starting firearm;
- one stronger centre-biased weapon pickup;
- limited ammunition;
- normal, good, perfect, and failed reload outcomes;
- one infinite-use melee attack;
- health, damage, death, and victory;
- two simple server-controlled creature roles;
- a small set of ammunition and healing pickups;
- darkness that gradually compresses the playable area;
- immediate PvP with no damage-immunity phase;
- minimal lobby, countdown, results, and rematch flow;
- temporary contextual interface and minimal persistent HUD;
- automated simulation, protocol, room, and integration tests;
- browser client deployment and Node server deployment.

Anything beyond this list requires an explicit scope decision.

## 5. Explicit non-goals

The MVP does not include:

- more than four human players;
- packs, teams, alpha, courage, revival, or downed states;
- a protected PvE preparation timer;
- teleporting players into a final arena;
- XP, levels, feats, armour, or relics;
- multiple playable dogs or active abilities;
- procedural maps;
- public matchmaking or skill ratings;
- accounts, permanent progression, purchases, or inventory persistence;
- reconnection unless ordinary disconnects make basic testing impractical;
- spectators;
- text or voice chat;
- mobile browser support;
- Firefox, Safari, Edge, and other desktop browsers as supported MVP targets;
- native desktop or console clients;
- a unique boss;
- production art or a large content catalogue;
- sixteen-player scaling;
- copying Death Race game rules or presentation.

## 6. Match structure

### 6.1 Flow

1. Player enters a display name.
2. Player creates a private match and receives a short room code, or joins with that code.
3. Lobby displays two to four players and their ready states.
4. Host starts after at least two players have joined and every connected player is ready.
5. A short server-timed countdown begins.
6. Each player enters the same map at a different concealed spawn region selected by the server.
7. PvP and PvE are active immediately after “Go.”
8. Creatures, ammunition pressure, central loot, and darkness drive movement.
9. Players die at zero health and leave the active simulation.
10. The last living player wins.
11. Results show the decisive events and offer a fast rematch.

### 6.2 Target length

- Target match duration: 5–8 minutes.
- Hard maximum target: 10 minutes.
- Darkness begins closing after an initial exploration window determined through playtesting.
- Closing pressure accelerates until hiding outside the remaining area is fatal.
- There is no arbitrary score victory while multiple players remain alive.

### 6.3 Victory

- Last living human player wins.
- A match requires at least two players and supports up to four.
- Death is immediate; there is no downed or revive state.
- Simultaneous lethal damage resolves deterministically on the server.
- If all remaining players die on the same authoritative simulation step, the result is a draw unless a clear causal ordering leaves one valid survivor.
- A disconnected player loses after a short, explicit grace period or immediately in the first prototype; final behaviour remains an implementation decision.
- If disconnects leave exactly one living connected player, that player wins through the same authoritative last-survivor rule.

## 7. Shared map

### 7.1 Layout goals

The first map is fixed and handcrafted.

It contains:

- four outer spawn regions with no opening direct sightline between any pair;
- at least two inward routes from every spawn;
- simple landmarks for orientation;
- sightline breaks and flank routes;
- outer supplies sufficient to begin moving;
- stronger weapon and resupply opportunities closer to the centre;
- creature zones that make direct spawn rushing expensive;
- one central conflict space with cover and multiple entries;
- a darkness boundary that can contract cleanly.

### 7.2 Spawn-rush mitigation

Early combat is legal, but the map should make blind spawn rushing a risky strategy.

- Spawn points are distributed around the map perimeter and selected to maximize separation for the current player count.
- Players never receive opponent spawn markers.
- Walls, terrain, and props block opening sightlines.
- Direct cross-map routes pass through creature pressure.
- Useful supplies appear along several inward routes.
- The centre offers more reliable value than searching an enemy spawn.
- Spawn protection is not used unless testing proves unavoidable.

The goal is to discourage spawn rushing through geography and opportunity cost, not an invisible rule.

### 7.3 No procedural generation

The MVP uses one authored layout. Loot and creature placements may vary within authored spawn points using a server seed, but structural map generation is deferred.

## 8. Darkness and information

Darkness is both a visibility system and a match-compression system.

### 8.1 Visibility

- The client renders only information the server permits it to know.
- Walls and major obstacles can occlude enemy players.
- Darkness limits reliable detection range.
- Hidden enemy positions must not remain available in inspectable client state.
- Required attacks always provide a visible or audible warning before damage.
- Gunfire, impacts, disturbed creatures, and environmental audio may reveal approximate activity without exposing an exact position.
- Opponents are not shown on a minimap or compass.

### 8.2 Contraction

- The playable region contracts in server-controlled stages.
- Environmental warnings precede each movement.
- Outside pressure escalates from reduced information to creature danger and finally lethal damage.
- Every client receives the same authoritative boundary state.
- The final region preserves cover and more than one viable approach.
- The boundary is not required to be a perfect battle-royale circle if the authored map supports a better shape.

## 9. Player controls and state

### 9.1 Controls

Provisional keyboard and mouse controls:

- Move: WASD.
- Aim: mouse cursor in world space.
- Fire: left mouse button.
- Melee: right mouse button.
- Dash: Space.
- Start reload: R.
- Reload timing input: X.
- Interact/pick up: E.
- Pause/settings: Escape; the online match continues.

Movement and aiming are independent.

### 9.2 Player state

Authoritative player state includes only what the MVP needs:

- stable player ID;
- connection/session association;
- display name;
- position and facing/aim direction for the local player and every currently visible opponent;
- movement and dash state;
- health and alive state;
- equipped weapon;
- magazine and reserve ammunition;
- reload state and authoritative timing window;
- melee recovery;
- relevant collision state.

Client-only presentation state includes camera, local animation blending, particles, audio, screen shake, and other non-consequential feedback.

## 10. Combat

### 10.1 Combat goals

Combat should be readable and punchy with a small number of entities.

Feedback may include:

- immediate local muzzle flash and recoil;
- directional hit reaction;
- knockback;
- restrained hit-stop in presentation only;
- layered but capped impact audio;
- controlled camera shake;
- clear death feedback;
- simple enemy telegraphs.

Presentation must never decide whether a hit occurred.

### 10.2 Starting firearm

The first weapon should be mechanically simple and suitable for learning the full pipeline.

Required data:

- damage;
- fire interval;
- magazine capacity;
- reserve capacity;
- reload duration;
- good and perfect timing windows;
- failed-reload penalty;
- spread;
- range;
- knockback;
- PvE and PvP damage values if separate tuning becomes necessary.

The starting firearm should use server ray tests rather than networked bullet entities.

### 10.3 Centre weapon

The map offers one stronger or more situational weapon closer to the centre.

It should:

- have a distinct silhouette and firing rhythm;
- create a reason to approach the centre;
- remain constrained by ammunition;
- not guarantee victory merely because one player reaches it first;
- replace the equipped weapon when picked up;
- drop the previous found weapon if one exists.

The initial candidate is a shotgun because it tests spread, short-range risk, knockback, and different reload pacing without requiring explosive projectiles.

### 10.4 Ammunition

- Firearms use limited magazines and reserve ammunition.
- The server owns all ammunition values.
- The client may predict audiovisual firing feedback but cannot invent a valid shot.
- Ammunition pickups are consumed once on the server.
- Pickup placement should prevent a player from being permanently unable to participate after ordinary expenditure.
- The MVP uses one ammunition category unless the second weapon proves a category distinction necessary.

### 10.5 Active reload

Starting a reload creates an authoritative reload timeline and a client-side timing presentation.

- No timing input: normal reload.
- Input in the success zone: fast reload.
- Input in the smaller perfect zone: near-instant reload.
- Bad input: approximately 35 percent longer than the normal reload.
- One timing attempt per reload.
- Failed input receives an obvious fumble animation and sound.
- The timing cue uses position and shape, not colour alone.
- The server validates a client timestamp against bounded latency compensation.
- The client cannot choose or directly submit the result category.

Initial example for a two-second base reload:

| Result | Completion time |
|---|---:|
| Perfect | 0.25 seconds |
| Good | 0.8 seconds |
| No attempt | 2.0 seconds |
| Failed | 2.7 seconds |

Exact timing remains data-driven and testable.

### 10.6 Melee

Every player has an infinite-use melee attack.

- Short forward arc.
- Modest damage.
- Strong knockback.
- Brief recovery.
- Useful against creatures and an empty firearm.
- Cannot cancel a committed or failed reload.
- Cannot permanently stun-lock the opponent.
- Server validates range, arc, recovery, hit, and damage.

## 11. Creatures

The MVP contains two simple creature roles:

1. **Swarmer:** weak, fast, direct pressure.
2. **Spitter:** fragile ranged pressure with a clearly telegraphed projectile.

Creature purposes:

- make direct routes costly;
- consume attention and ammunition;
- expose player activity;
- complicate PvP without deciding every fight;
- encourage movement through the map.

The server owns target selection, movement, attacks, health, damage, death, and drops.

Creature simulation requirements:

- fixed or bounded simulation rate;
- simple steering and spatial queries;
- no expensive full pathfinding per creature per step;
- deterministic behaviour where practical under a match seed;
- hard population cap;
- no client authority over creature outcomes.

Initial normal target: 12–24 active creatures. Scale only after the full four-player networked slice is measured.

## 12. Pickups

MVP pickups:

- ammunition;
- small healing supply;
- one centre-biased weapon.

Rules:

- Spawned and consumed by the server.
- Visible only when the client is eligible to know about them.
- Consumed exactly once.
- No inventory grid.
- Equipped weapon is replaced through a deliberate hold interaction.
- Pickups do not persist between matches.
- Random placement uses authored points and a reproducible match seed.

## 13. Art and presentation

### 13.1 Rendering direction

The working client presentation is chunky, low-resolution 2.5D rendered with Three.js:

- orthographic top-down camera;
- low internal render resolution scaled cleanly to the browser;
- nearest-neighbour sampling for sprite textures;
- compact upright anthropomorphic dog sprites or billboarded planes;
- freely aimed weapon layer or simple weapon mesh/sprite;
- simple 3D ground and obstruction geometry where it improves depth and sightlines;
- bold occult-western palette: red earth, cold moonlight, iron, bone, and shadow;
- strong silhouettes rather than detailed animation;
- simple shadows and tightly capped effects.

The MVP may begin with geometric placeholders. Final pixel art is not required to validate combat.

### 13.2 React boundary

React is used for:

- title and connection screens;
- lobby and ready state;
- settings;
- temporary contextual panels;
- results and rematch;
- errors and connection status.

React does not create or update every live game entity. Three.js owns the render scene and frame presentation.

### 13.3 Minimal interface

Persistent interface should be limited to information that cannot be read reliably from the world.

Initial allowance:

- compact health state;
- contextual ammunition near the reticle or weapon;
- reload timing only while reloading;
- darkness boundary/safety direction when required;
- connection warning.

There is no minimap, enemy marker, kill feed, XP bar, feat panel, armour display, or inventory.

Clarity is more important than preserving a strict no-HUD rule during early tests.

## 14. Technology architecture

### 14.1 Repository direction

The implementation should use one TypeScript ecosystem with clear client, server, shared, and test boundaries.

Suggested logical areas:

- `client`: React shell, input, Three.js scene, interpolation, audiovisual presentation;
- `server`: Colyseus room, authoritative simulation, validation, room lifecycle;
- `shared`: protocol types, schemas where safe, data definitions, mathematical helpers, seeded randomness;
- `tests`: unit, room, protocol, integration, and browser-facing smoke checks;
- `public`: static client assets.

The exact folder layout should be chosen after auditing the current repository and should not blindly copy Death Race paths.

### 14.2 Client stack

- TypeScript.
- Vite.
- Three.js.
- React for application shell only.
- Colyseus browser SDK.
- Vitest for testable client and shared logic.
- Web Audio or a small dedicated audio layer; no heavy audio framework required initially.

### 14.3 Server stack

- Node.js.
- Colyseus 0.17 packages pinned to compatible versions.
- Colyseus schema state for persistent synchronized match state.
- Colyseus messages for commands and transient events.
- Vitest for simulation, protocol, room, and integration tests.
- WebSocket transport.

### 14.4 Death Race relationship

`C:\Users\James\Documents\Code\deathRace` is a reference implementation, not a source dependency.

Reuse its proven concepts:

- Vite and React application shell;
- Colyseus room lifecycle;
- authoritative simulation interval;
- schema-based state;
- validated command envelopes and input ordering;
- short room codes and private lobbies;
- room/server tests;
- Cloudflare Pages and Fly.io deployment shape;
- decision and architecture documentation.

Do not copy its game-specific lane simulation, hidden identity, shot model, NPC rules, DOM playfield, scoring, or race state.

### 14.5 Simulation and rendering boundary

The authoritative simulation must not import Three.js, React, DOM APIs, or presentation assets.

The Three.js renderer consumes an interpreted client view of synchronized state. It may predict local presentation but cannot mutate authoritative state.

The simulation should use explicit data and functions for:

- player input intent;
- movement and collision;
- dash;
- reload timeline;
- firing and melee;
- creatures;
- pickups;
- darkness;
- damage, death, and victory.

## 15. Network model

### 15.1 Room

One Colyseus room represents one match.

Room phases:

- lobby;
- countdown;
- playing;
- round over;
- closed.

Room rules:

- maximum four clients;
- minimum two connected ready players to start;
- automatically locks when the match begins;
- automatically disposes when empty;
- validates names and room options;
- rejects commands invalid for the current phase;
- has a bounded idle timeout;
- emits structured close reasons.

### 15.2 Commands

Initial client commands:

- ready;
- start match, host only;
- movement input;
- aim input;
- dash;
- fire;
- start reload;
- reload timing attempt;
- melee;
- interact/pick up;
- request rematch;
- leave.

Every command includes or is associated with:

- authenticated session/player identity;
- room identity;
- match/round identity;
- monotonically increasing input sequence where ordering matters;
- validated bounded payload.

### 15.3 State versus events

Use synchronized schema state for durable current facts:

- room phase and timer;
- players;
- creatures;
- pickups;
- darkness boundary;
- winner.

Use messages/events for transient occurrences:

- shot fired;
- melee swing;
- impact;
- reload result;
- creature attack;
- death;
- announcement and error.

Do not duplicate the same source of truth in both state and events.

### 15.4 Tick and patch targets

Initial targets:

- authoritative simulation: 30 Hz;
- synchronized patch rate: 20 Hz;
- browser rendering: up to 60 FPS;
- aim messages: capped, initially 20 Hz;
- movement messages: on change plus bounded refresh;
- commands per client: rate-limited.

These targets change only after measurement.

### 15.5 Prediction and interpolation

- Local movement uses client prediction after the authoritative movement model exists.
- Server acknowledgements permit reconciliation.
- Remote player and creature motion uses interpolation.
- Local firing and reload feedback may begin immediately, then resolve against server confirmation.
- Damage, death, pickup ownership, and victory are never predicted as final.
- Prototype progression may temporarily begin without prediction to validate rules, but responsive prediction is required for MVP acceptance.

### 15.6 Visibility filtering

The server must not synchronize exact hidden opponent positions merely for the client to conceal them visually.

The implementation may use:

- per-client filtered state;
- private messages/snapshots;
- visibility-specific view models;
- another Colyseus-supported approach proven through tests.

The chosen approach must be documented before darkness is considered complete.

## 16. Authority and validation

The server owns:

- player identity and spawn;
- map seed and authored spawn choices;
- movement limits and collision;
- dash legality;
- health and death;
- weapon, magazine, reserve ammunition, and reload state;
- active-reload result;
- fire rate and hit tests;
- melee range, recovery, hits, and damage;
- creatures and pickups;
- darkness boundary and outside pressure;
- match phase, winner, and rematch reset.

The client owns only:

- raw input capture;
- local camera;
- rendering and animation;
- audio and cosmetic effects;
- temporary interface state;
- local settings.

Validation rules:

- reject non-finite numbers and out-of-bounds coordinates;
- reject impossible command rates and stale sequences;
- reject actions unavailable in the current phase or player state;
- never accept client-supplied damage, health, ammunition, pickup success, reload category, creature state, or victory;
- rate-limit messages before they can exhaust the room;
- log protocol violations without logging unnecessary personal data.

## 17. Web and server performance budgets

### 17.1 Client

- 60 FPS target at representative load.
- 30 FPS hard minimum during deliberate stress.
- Initial internal resolution: 1280×720 or lower pixel-art render target scaled to fit.
- Representative hardware: Apple Silicon MacBook Air and integrated-graphics Windows laptop.
- Four player presentations.
- 12–24 normal active creatures.
- Stress test with four players and 48 simple creatures.
- Hitscan starting weapon.
- Hard caps and pools for projectiles, effects, decals, corpses, sounds, labels, and temporary objects.
- Initial compressed client target: under 10 MB excluding optional large audio.
- No sustained memory or object growth across repeated matches.

### 17.2 Server

- 30 Hz simulation with p95 step below 20 ms.
- Stable memory across repeated room creation and disposal.
- No unbounded entity, timer, listener, or room-code growth.
- Record bandwidth by schema patches and message/event class.
- Initial downstream target below 65 KB/s per client at normal four-player load.
- Initial upstream target below 15 KB/s per client at normal load.

These are hypotheses until measured locally and in a hosted environment.

## 18. Deployment

The expected deployment shape follows the proven Death Race model:

- static Vite client on Cloudflare Pages or an equivalent static host;
- authoritative Colyseus Node server on Fly.io or an equivalent WebSocket-capable host;
- production client connects over WSS;
- endpoint selected through environment configuration;
- no credentials committed to source control;
- server exposes a health check;
- deployment and rollback steps are documented and repeatable.

Deployment is not required before local four-browser play works, but hosted latency must be tested before MVP completion.

## 19. Testing

### 19.1 Unit tests

- movement and dash limits;
- magazine and reserve accounting;
- fire-rate enforcement;
- reload normal, good, perfect, and failed timing;
- melee range, arc, damage, and recovery;
- creature steering and attack timing;
- damage, death, simultaneous death, and winner resolution;
- pickup single-consumption;
- darkness boundary and outside damage;
- seeded spawn selection.

### 19.2 Protocol tests

- message shape and numeric bounds;
- command ordering and stale sequence rejection;
- room/match identity;
- invalid phase rejection;
- client inability to submit authoritative outcomes;
- message rate limits;
- compatible schema definitions.

### 19.3 Room tests

- create and join by room code;
- four-client maximum and two-client minimum to start;
- ready and host-only start;
- server countdown;
- unique spawn allocation and separation for two, three, and four players;
- authoritative simulation progression;
- disconnect result;
- victory and exactly-once round ending;
- rematch reset;
- room disposal and cleanup.

### 19.4 Integration tests

- four clients join one room and receive distinct player identities;
- every client moves and observes interpolated opponent state only when visible;
- hidden opponent state is not exposed to any client;
- all players fight server-controlled creatures;
- ammunition, reload, melee, pickup, damage, elimination, and victory agree across all clients;
- a complete accelerated match produces one valid result;
- repeated matches do not leak state.

### 19.5 Playtest questions

- Is movement enjoyable before combat?
- Does shooting one creature feel good?
- Is attempting the active reload meaningfully risky?
- Does limited ammunition influence routes rather than merely frustrate?
- Is melee useful without becoming the best default attack?
- Can players infer opponents’ activity without exact markers?
- Are early encounters exciting rather than automatically decisive?
- Does the centre weapon attract conflict without guaranteeing victory to its first owner?
- Do creatures improve PvP situations or mostly create random unfairness?
- Does darkness end stalemates naturally?
- Do players want an immediate rematch?
- Can the developer explain the full input-to-server-to-render flow?

## 20. Implementation milestones

### M0 — Technology baseline

- Replace or isolate the Godot starter without deleting unrelated user work.
- Establish Vite, TypeScript, Three.js, React shell, Vitest, Node, and compatible Colyseus 0.17 packages.
- Produce one browser-rendered placeholder scene.
- Start one Colyseus server and complete a versioned browser handshake.

Exit: a browser connects to the local server, receives identity, and renders a placeholder owned by synchronized state.

### M1 — One-player authoritative movement

- One dog placeholder.
- Input commands.
- Server movement and collision.
- Orthographic Three.js presentation.
- Local prediction and reconciliation.

Exit: movement feels responsive at 150 ms simulated round-trip latency and remains server legal.

### M2 — Combat toy

- Starting firearm.
- Limited ammunition.
- Active reload.
- Melee.
- One server creature.
- Health and death.
- Punch feedback.

Exit: shooting, reloading, and melee are enjoyable for ninety seconds in a browser build.

### M3 — Two-to-four-player continuous match

- Private room code.
- Two, three, and four clients.
- Shared map with separated spawns.
- PvP active from “Go.”
- Authoritative hits, damage, death, victory, and rematch.
- Opponent interpolation and per-client visibility filtering.

Exit: two-, three-, and four-player rooms complete repeated free-for-all matches with no PvE or darkness required, and the four-player case is the primary performance test.

### M4 — PvPvE pressure

- Swarmer and spitter.
- Ammunition and healing pickups.
- Centre-biased second weapon.
- Creature and pickup budgets.
- Darkness visibility and contraction.

Exit: full matches produce different encounter timings and naturally converge without a protected phase or teleport.

### M5 — Web MVP

- Chunky 2.5D visual pass.
- Audio and feedback.
- Minimal lobby, settings, context interface, results, and errors.
- Automated integration and soak tests.
- Browser/hardware matrix.
- Hosted client and server latency test.

Exit: all MVP acceptance criteria pass.

## 21. MVP acceptance criteria

The MVP is complete when:

- two to four desktop-browser players can create/join a private match without installation or accounts;
- all players occupy one continuously shared map;
- PvP and PvE are active from the start with no teleport or protected preparation phase;
- movement, dash, firing, limited ammunition, active reload, melee, damage, pickups, creatures, darkness, death, victory, and rematch work end to end;
- the server is authoritative for every consequential outcome;
- hidden opponent positions are not exposed through synchronized client state to any player;
- geography and creature pressure discourage blind spawn rushing without prohibiting early combat;
- the centre weapon creates risk/reward without guaranteeing victory;
- the match ends naturally within the target duration;
- representative client load targets 60 FPS and remains above 30 FPS in stress;
- server simulation and bandwidth remain inside measured budgets;
- repeated matches and room disposal show no unbounded growth;
- current desktop Google Chrome passes on the target machines;
- a hosted WSS match completes at realistic latency;
- all shipped audiovisual content is original, licensed, or clearly temporary;
- the developer can explain the client, protocol, authoritative room, simulation, synchronization, and rendering boundaries.

## 22. Evidence gates for expansion

Do not increase the player cap beyond four or restore pack systems until the four-player MVP demonstrates:

- enjoyable combat independent of progression;
- multiple viable opening routes;
- early encounters that are survivable and interesting;
- creatures that improve rather than randomize PvP;
- darkness that resolves hiding without feeling arbitrary;
- stable browser and server performance;
- player demand for more participants.

If those gates pass, evaluate expansion in this order:

1. Additional weapons and creature roles.
2. Feats and compact equipment builds.
3. Two-versus-two packs and revival.
4. Eight-player experiments.
5. Larger packs, alpha, and the former sixteen-player Pack Royale vision.

Each step requires its own playtest and performance evidence.

## 23. Open decisions

- Final dog appearance and sprite workflow.
- Exact map fiction and visual landmarks.
- Starting firearm values.
- Whether the centre weapon is a shotgun or another sidegrade.
- Dash invulnerability, if any.
- Initial darkness timing and shape.
- Disconnect-loss grace period.
- Exact visibility-filtering implementation in Colyseus.
- Whether React remains necessary beyond the application shell.
- Final Cloudflare/Fly project names and deployment environments.
- Whether the repository uses npm workspaces or a simpler single-package layout.

Open decisions should be answered through the smallest relevant implementation or playtest, not speculative infrastructure.
