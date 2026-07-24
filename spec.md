# Terra Rossa — Game Specification

Status: Draft

Target: Desktop web browsers

Engine: Godot 4.x, typed GDScript, Compatibility renderer

Players: 1–16

Primary mode: Pack Royale

Genre: Isometric PvPvE horde shooter with run-based progression

## 1. Product statement

Terra Rossa is a fast, punchy isometric shooter in which compact anthropomorphic dog heroes form rival packs, fight dark creatures, recover scarce equipment, and push inward across a shrinking occult-western island. Packs can encounter and fight one another at any time. The last pack standing wins.

The game takes inspiration from Crimsonland's immediate twin-stick combat and Path of Exile: Royale's riskier, richer inward progression. It must retain its own characters, world, equipment, enemies, rules, art, audio, interface, and balance.

The public experience is browser-first: open a URL, enter a display name, join a room, and play without an account or installation.

## 2. Design pillars

1. **The pack matters:** dogs are safer, braver, and better informed together.
2. **Risk lives in the darkness:** isolation reduces visibility and invites swarms, but dangerous routes offer valuable loot.
3. **Punchy, skillful combat:** fast movement, strong reactions, limited ammunition, melee, and active reload timing reward execution.
4. **Builds emerge during the match:** character choice establishes a starting style; feats and scarce equipment transform it.
5. **Unscripted rivalry:** packs may meet, avoid, ambush, or fight from the opening minute.
6. **Minimal interface:** the world, animation, sound, and equipment communicate state; a compass is the only persistent HUD.
7. **Web performance is a feature:** entity counts, art, effects, simulation, and networking stay inside measured browser budgets.

## 3. World and visual direction

### 3.1 Theme

The provisional direction is a graphic occult western:

- red-earth island under cold moonlight;
- compact, upright, anthropomorphic dog heroes;
- frontier clothing, improvised armour, firearms, iron, bone, bells, and warding symbols;
- dark creatures made from angular shadow, bone, and earth;
- bold silhouettes, limited palettes, and expressive animation;
- restrained environments that keep dogs, attacks, loot, and telegraphs readable.

Lore, final title treatment, and the exact level of gore remain open.

### 3.2 Rendering

- Stylized low-poly 3D with an orthographic isometric camera.
- Dog heroes receive the highest visual detail.
- Elites and bosses receive medium detail.
- common creatures use extremely low-poly meshes, shared skeletons, atlases, and minimal materials.
- Swappable weapons and armour must visibly alter the character.
- Relics use a consistent attachment point, likely a belt charm, plus a clear activation effect.
- Baked lighting, blob shadows, limited real-time shadows, and tightly capped particles are the default.
- No volumetric fog, global illumination, or effects that require non-Compatibility renderers.

## 4. Match structure

### 4.1 Pack Royale

- Supports 2–16 players.
- Players are assigned randomly; players cannot choose their pack.
- Packs contain no more than four dogs.
- Pack count is `max(2, ceil(player_count / 4))`.
- Pack sizes differ by at most one player.
- PvP and PvE are active from the opening second.
- Packs spawn at maximally separated outer-island locations without direct sightlines.
- Danger and loot quality increase toward the centre.
- Darkness gradually consumes the island from outside inward.
- Creatures remain active for the entire match.
- A pack is eliminated when every member is down simultaneously.
- The last living pack wins.

Pack distribution:

| Players | Distribution |
|---:|---|
| 2 | 1–1 |
| 3 | 2–1 |
| 4 | 2–2 |
| 5 | 3–2 |
| 6 | 3–3 |
| 7 | 4–3 |
| 8 | 4–4 |
| 9 | 3–3–3 |
| 10 | 4–3–3 |
| 11 | 4–4–3 |
| 12 | 4–4–4 |
| 13 | 4–3–3–3 |
| 14 | 4–4–3–3 |
| 15 | 4–4–4–3 |
| 16 | 4–4–4–4 |

### 4.2 Solo

- A one-player lobby runs as solo survival.
- The run ends on the player's first down unless a later solo-specific rule changes this.

### 4.3 Lone Dogs — post-MVP candidate

- Up to 16 solo competitors.
- No packs, alphas, pack courage, or revival.
- Loot is immediately personal.
- Last dog standing wins.

Lone Dogs should be added only after Pack Royale combat and equipment are balanced.

### 4.4 Session flow

1. Load and explicit user interaction to start browser audio.
2. Enter a display name.
3. Create or join a private room; public room discovery may follow.
4. Server assigns packs.
5. Pack privately chooses dogs; the same dog may appear in rival packs but not twice in one pack.
6. Short ready countdown.
7. Continuous PvPvE match.
8. Results and rematch.

Late joining is not supported after a match starts.

## 5. Island and darkness

### 5.1 Map approach

MVP starts with one recognizable island footprint and one authored central arena.

The first playable map should be handcrafted. Once its combat spaces work, deterministic generation can rearrange authored modules and randomize:

- internal region connections;
- paths, walls, ruins, trees, and cover;
- creature species, dens, and encounter budgets;
- loot locations and loot-table results;
- darkness bounty pockets;
- sightlines and centre approaches.

The server owns the match seed and authoritative structural description.

### 5.2 Generation validation

A generated map is accepted only if:

- every spawn can reach the centre;
- spawn-to-centre path lengths are within a fair tolerance;
- no spawn pair has an initial direct line of sight;
- starting regions receive comparable basic opportunity budgets;
- every pack has at least two viable inward routes;
- no essential loot is unreachable;
- no spawn is trapped behind one choke point;
- the centre has meaningful cover;
- darkness cannot cut an essential route too early.

### 5.3 Darkness

- Packed dogs have better visibility and mutual safety.
- Isolated dogs see less, receive fewer reliable enemy cues, and attract more aggressive swarms.
- Darkness must obscure information without allowing unreadable attacks; silhouettes, eyes, sound, or telegraphs precede danger.
- Valuable bounty may appear outside the comfortable pack perimeter.
- Recovered bounty counts only after it is brought back to the pack.
- Darkness closes in readable stages and ultimately becomes lethal enough to prevent camping.
- Environmental cues announce movement: fading moonlight, wind, particles, creature behaviour, and a visible centre landmark.

### 5.4 Pack courage

Pack courage is formed by overlapping proximity among packmates, not solely by the alpha.

- Nearby packmates improve visibility and resistance to being overwhelmed.
- Temporary separation is allowed and can be profitable.
- The isolated dog suffers; it does not directly weaken distant teammates.
- Exact bonuses and radii are tuning values.

## 6. Dogs, alpha, and controls

### 6.1 Dog roster

There are no classes and no class composition requirements.

Every dog shares the same starting:

- maximum health;
- movement speed;
- armour baseline;
- regeneration baseline, if regeneration is retained;
- dash;
- revive capability;
- equipment capacity;
- melee power budget.

Each selectable dog differs through:

- a strong visual identity;
- one starting weapon;
- one unique active ability;
- a distinct melee animation with approximately equivalent baseline effectiveness.

Starting weapons are balanced sidegrades. Weapons may be replaced during the run; the unique ability remains tied to the selected dog.

Initial roster target: six dogs. Duplicates are prohibited within a pack but allowed across rival packs.

### 6.2 Alpha

- Each pack has exactly one alpha.
- The first alpha is chosen randomly.
- Alpha changes at fixed evaluation intervals based on recent, broad gameplay contribution.
- Candidate inputs include fighting, assisting, reviving, rescuing, recovering bounty, protecting packmates, and surviving danger.
- Raw damage alone must not dominate selection.
- Alpha grants no combat power and no loot authority.
- Alpha is a prestige, presentation, and scoring role.
- Total time spent as alpha is tracked for results.
- Succession occurs immediately if the alpha disconnects or the pack can no longer treat it as active.

### 6.3 Controls

Provisional keyboard and mouse controls:

- Move: WASD.
- Aim: mouse.
- Fire: left mouse.
- Melee: right mouse.
- Dash: Space.
- Start reload: R.
- Reload timing input: X.
- Active ability: Q or middle mouse.
- Interact, pick up, and revive: E.
- Pause/settings: Escape; online simulation continues.

Movement and aiming are independent. Friendly player collision is disabled.

## 7. Combat

### 7.1 Combat goals

Combat should feel fast, physical, and readable through:

- short input response;
- clear recoil and weapon cadence;
- strong hit reactions and knockback;
- restrained local hit-stop;
- layered impact audio;
- controlled camera shake;
- sharp attack telegraphs;
- short, readable ability effects;
- meaningful ammunition pressure.

### 7.2 Weapon rules

- A dog equips exactly one weapon.
- Weapons require magazines, reserve ammunition, and reloads.
- Ammunition is limited.
- Broad ammunition categories are preferred over a unique type for every gun.
- Starting weapons are bound and disappear when replaced.
- Found weapons can be dropped, thrown a short distance, or picked up by another dog.
- Picking up a weapon while equipped drops the current found weapon in its place.
- Hitscan is preferred for pistols and rifles; visible projectiles are reserved for weapons that need them.
- The server validates ammunition, fire rate, reload result, hit, and damage.

When a pack is eliminated, each defeated dog drops only its equipped found weapon. Armour, relics, feats, and reserve ammunition do not drop.

### 7.3 Active reload

Starting a reload presents a short world-attached timing line near the local dog or reticle.

- No input: normal reload.
- Input in the success zone: fast reload.
- Input in the small perfect zone: near-instant reload.
- Bad input: approximately 35% longer than the normal reload.
- Only one timing attempt is allowed per reload.
- A failed reload receives an obvious fumble animation and sound.
- Timing uses position/shape and an optional audio cue, never colour alone.
- The client timestamps its displayed timing result for latency-tolerant server validation.

Example for a two-second base reload:

| Result | Completion |
|---|---:|
| Perfect | 0.25 s |
| Good | 0.8 s |
| No attempt | 2.0 s |
| Failed | 2.7 s |

Exact values and window widths differ by weapon and require playtesting.

### 7.4 Melee

Every dog has an infinite-use melee attack.

- Short forward arc or thrust.
- Modest damage and strong knockback.
- Brief recovery.
- Can interrupt weaker creatures.
- Cannot permanently stun-lock players.
- Does not cancel a committed or failed reload.
- Visual execution differs by dog and starting weapon: knife, stock bash, bayonet, shoulder check, wrench, or similar.
- Baseline damage-per-second remains approximately equivalent between dogs.

### 7.5 Downing and elimination

- Reaching zero health downs a dog.
- Downed dogs cannot fire, melee, dash, or use their ability.
- Downed dogs may crawl slowly.
- Rival players cannot finish a downed dog.
- Any standing packmate can revive a downed dog.
- Revives restore partial health and grant brief protection.
- A pack is eliminated immediately when all its dogs are down simultaneously.
- Eliminated players may leave; an elaborate post-elimination activity is not required for MVP.

## 8. Progression and equipment

### 8.1 Individual levels and feats

- Every dog has an individual level and XP total.
- Creatures grant XP.
- Enemy-pack eliminations grant a larger XP award.
- Creature XP is shared among nearby living and downed packmates.
- PvP elimination XP is awarded across the victorious pack.
- Personal score may track damage, assists, revives, bounty, survival, and alpha time without changing XP ownership.
- At specified level intervals, each dog chooses one of three personal feats.
- The online match does not pause.
- Feat choices use a compact temporary panel and auto-resolve after a timeout.
- One reroll per match is the initial recommendation.

Feats provide most statistical and build variation. The initial pool should include reload, ammunition, melee, dash, weapon behaviour, survivability, visibility, revival, and ability synergies.

### 8.2 Loadout

Each dog can equip:

- one weapon;
- one armour;
- one relic.

There is no inventory grid and no loot vote.

- Hold interact to pick up equipment.
- Equipping into an occupied slot drops the previous item.
- Packmates coordinate by physically dropping and picking up items.
- Looking at an item briefly shows its name and one-sentence effect.
- Ordinary supplies resolve immediately and do not open allocation interfaces.

### 8.3 Armour

Armour physically changes the dog and is communicated without a persistent UI.

Initial effect families may include:

- plated: direct protection;
- spiked: retaliation against melee attackers;
- insulated: protection from supernatural or energy damage;
- medic: improved revival;
- shadow: reduced detection in darkness.

Armour should not use durability in MVP. Its silhouette, material, activation feedback, and temporary inspection text explain its function.

### 8.4 Relics

MVP uses approximately six highly distinct relics rather than a large pool of statistical trinkets.

Relic families:

1. reload;
2. melee;
3. dash;
4. revival;
5. darkness/visibility;
6. active-ability cooldown or behaviour.

Each relic:

- fits in one sentence;
- changes behaviour rather than merely adding a hidden percentage;
- has a unique dropped silhouette;
- attaches consistently to the character, provisionally as a belt charm;
- produces a distinct activation visual and sound;
- exposes exact behaviour through temporary inspection text.

## 9. Creatures and encounters

Initial roles:

1. Swarmer — weak, fast, and dangerous in groups.
2. Brute — slow, durable, and forceful.
3. Spitter — ranged, with a readable projectile telegraph.
4. Charger — commits to a clearly signalled line attack.
5. Brood creature — produces smaller threats if ignored.
6. Elite variants — larger silhouette plus one visible modifier.
7. Centre boss — optional high-risk objective for superior loot, after core combat works.

Common creatures should use roughly 200–600 triangles as an initial art budget, one material, shared rigs, reduced distant animation frequency, blob shadows, and pooled lifecycle.

Enemy simulation uses spatial partitioning, batched decision updates, inexpensive steering, and simple local avoidance rather than a full navigation query per enemy per frame.

## 10. Loot director

Random loot should create different stories without making starting opportunity wildly unfair.

- Each spawn territory receives a comparable offered-value budget.
- Loot is classified by functional category and power tier.
- Exact items, positions, and modifiers are randomized.
- Basic weapon opportunity is guaranteed near each starting region.
- Better loot is increasingly likely toward the centre and in dangerous darkness pockets.
- The director measures what it offered, not what a pack successfully collected.
- A very small jackpot chance may promote an item above the normal local tier, allowing memorable early finds such as a bazooka.
- Jackpot weapons should remain constrained by scarce ammunition.

Suggested functional categories:

- reliable;
- close-control;
- precision;
- explosive;
- support/utility;
- exotic.

## 11. Visibility and interface

### 11.1 Persistent HUD

The compass is the only persistent HUD element.

It may show:

- cardinal directions;
- island centre;
- living packmates;
- downed packmates with urgent treatment;
- current alpha;
- temporary pack pings.

It does not automatically show enemy players, creatures, loot, or gunfire.

### 11.2 World-attached information

- Health uses an unobtrusive ring, pips, injury animation, or a combination beneath/on the dog.
- Armour is visible on the character and through impact feedback.
- Ammo is represented near the weapon or reticle only when relevant.
- Reload timing appears only during reload.
- Ability readiness uses character animation, effects, and sound.
- Feat selection and item inspection are temporary contextual interfaces.
- Colour is never the sole carrier of critical information.

Server-authoritative visibility determines whether hidden enemy positions are replicated to a client. Darkness must not be merely a client-side overlay that a modified client can remove.

## 12. Multiplayer architecture

### 12.1 Network model

- Authoritative dedicated server.
- Secure WebSocket (`wss://`) clients for browser compatibility.
- Headless Godot Linux server export.
- Hard cap of 16 human players.
- Target server simulation: 30 Hz.
- Target snapshots: 15–20 Hz, tuned through profiling.
- Client prediction and server reconciliation for the local dog.
- Interpolation for remote dogs, creatures, and relevant projectiles.
- Sector-based interest management and server-owned visibility filtering.
- The server owns maps, entities, AI, collision, hits, damage, XP, feats, equipment, alpha selection, elimination, and results.

### 12.2 Reconnect

- Initial reconnect grace target: 30 seconds.
- Disconnected dogs become inactive and cannot contribute.
- If a disconnect makes every dog in a pack inactive/down, exact elimination handling must be decided before public play.
- Private friend matches are the MVP priority; sophisticated ranked integrity is out of scope.

### 12.3 Security

- Validate every message type, size, frequency, state, ownership, and numeric range.
- Never accept client-authored damage, XP, inventory, alpha score, or visibility.
- Rate-limit joins, inputs, pings, and reconnect attempts.
- Sanitize display names and use immutable server IDs.
- Use HTTPS/WSS in production.
- No voice or text chat in MVP.

## 13. Web performance budgets

### 13.1 Client target

- Compatibility renderer/WebGL 2 from the first prototype.
- Single-threaded web export first; threaded export only after measured need and hosting-header validation.
- 60 FPS target and 30 FPS hard minimum during the deliberate stress case.
- Representative test: Apple Silicon MacBook Air and an integrated-graphics Windows laptop at 1280×720 internal resolution.
- 16 visible dogs.
- 40–80 visible common creatures during normal play.
- Short stress spikes toward approximately 100 visible creatures.
- 50–100 visible projectiles, with hitscan used where possible.
- Strict pools and hard caps for creatures, projectiles, particles, decals, sounds, corpses, and item labels.
- Quality settings may reduce resolution, shadows, particles, decals, and distant animation frequency.
- Initial compressed download target: under 30 MB.
- No sustained memory, node, or resource growth during a full match.

These are hypotheses until the feasibility spike measures a production-like browser build.

### 13.2 Server target

- 30 Hz simulation with p95 tick below 25 ms.
- 16 clients plus representative creatures and combat.
- Stable memory across repeated matches and reconnects.
- Initial per-client bandwidth target: p95 below 100 KB/s downstream and 20 KB/s upstream.
- Metrics separated by snapshot, reliable event, lobby, and visibility traffic.

If budgets fail, reduce visible/simulated entity fidelity before weakening server authority.

## 14. Accessibility

- Remappable keyboard controls.
- Gamepad after keyboard/mouse combat is accepted.
- Independent volume controls.
- Screen-shake and gore controls.
- High-contrast, shape-supported telegraphs.
- Active-reload audio cue option.
- Reduced particles and decals.
- Resolution scaling.
- No essential rapid flashing.
- Temporary descriptions remain readable at 1280×720.

## 15. Testing

### 15.1 Automated

- weapon ammunition, fire-rate, and active-reload outcomes;
- melee and ability cooldowns;
- damage, armour, down, revive, and pack elimination;
- XP sharing, personal levels, feat offers, and scoring;
- alpha evaluation and accumulated alpha time;
- equipment swap/drop rules;
- loot budget and jackpot bounds;
- deterministic map assembly and validation;
- visibility eligibility;
- protocol round trips and invalid-message rejection;
- reconnect state;
- accelerated headless match completion.

### 15.2 Bot harness

Bots must be able to:

- connect, ready, and receive random packs;
- choose dogs;
- move, aim, fire, melee, reload, and use abilities;
- revive and interact with equipment;
- choose feats;
- explore inward and fight creatures/players;
- disconnect and reconnect;
- report tick, bandwidth, visibility, entity, and outcome metrics.

Repeatable scenarios: 1, 4, 8, 12, and 16 clients, plus a 20-minute stress soak.

## 16. Milestones

### M0 — Web feasibility spike

- Pin a supported Godot 4.x version.
- Export a low-poly 3D Compatibility client to web.
- Connect browser clients over WSS to a headless server.
- Stress 16 dogs, 100 simple creatures, 100 pooled projectile/effect representatives, darkness, sightlines, one armour attachment, and one relic effect.
- Measure FPS, tick cost, memory, load size, and bandwidth on target laptops.

Exit: 60 FPS during representative load and at least 30 FPS during the deliberate stress case, or revise entity/effect budgets and retest.

### M1 — Combat prototype

- One dog, two starting weapons, melee, dash, active reload, one ability.
- Two creatures and one small handcrafted region.
- Authoritative movement, combat, prediction, and interpolation.
- World-attached state plus compass.

Exit: combat is responsive and punchy at 150 ms simulated round-trip latency.

### M2 — Pack slice

- Four dogs, random pack assignment, alpha tracking, courage, down/revive/wipe.
- Individual XP, first feats, weapon/armour/relic slots, physical swapping.
- Eight-player direct-connect Pack Royale test.

Exit: two packs can complete a match without desync, unreadable state, or unbounded growth.

### M3 — 16-player vertical slice

- One complete island and centre arena.
- Darkness contraction, inward loot progression, map validation.
- Six dogs, six relics, representative armour, weapons, and creature roles.
- Bot harness and 16-player browser soak.

Exit: the complete match loop meets hard performance and network budgets.

### M4 — MVP service and release candidate

- Private rooms, reconnect, results, rematch, settings, onboarding, and errors.
- Production art/audio pass within proven budgets.
- Browser matrix, abuse checks, deployment, operations, and recovery testing.

Exit: repeated hosted 16-player friend matches complete successfully.

## 17. MVP acceptance criteria

- A desktop browser user can join without installation or account creation.
- 2–16 players complete lobby, Pack Royale, results, and rematch.
- Random packs never exceed four dogs and remain balanced within one player.
- PvP/PvE, darkness, down/revive/wipe, alpha, individual levels, feats, and physical equipment exchange function end to end.
- Six distinct dog heroes, six relics, representative armour, weapons, common creatures, elites, and one island are playable.
- A 16-bot stress run meets the hard client and server budgets.
- Current target Chrome and Firefox pass; Safari is tested on the target MacBook and documented.
- The server is authoritative for consequential state and hidden positions.
- Production uses HTTPS/WSS.
- All shipped audiovisual content is original, licensed, or marked temporary.

## 18. Explicit non-goals for MVP

- Ranked matchmaking or esports-grade balance.
- Player-selected packs.
- Mobile browsers.
- Native desktop/console releases.
- Peer hosting.
- Permanent account progression, payments, or cosmetics store.
- Text or voice chat.
- User-generated maps.
- Multiple production islands.
- Lone Dogs mode before Pack Royale works.
- Hundreds of guaranteed visible creatures.
- Exact feature or content parity with any reference game.

## 19. Open decisions

- Final lore and title treatment.
- Final dog roster, weapons, and abilities.
- Exact feat cadence and initial feat pool.
- Armour catalogue and whether base regeneration exists.
- Final relic attachment presentation.
- Darkness timing and total match duration.
- Alpha evaluation interval and scoring weights.
- Reconnect handling when all remaining pack members are inactive.
- Hosting provider, regions, and lobby allocation service.
- Godot minor version after M0 testing.
