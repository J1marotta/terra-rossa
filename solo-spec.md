# Terra Rossa — Solo Learning MVP Specification

Status: Draft

Relationship to `spec.md`: separate single-player product track

Target: Desktop web browsers

Engine: Godot 4.x, typed GDScript, Compatibility renderer

Players: One

Genre: Top-down survival shooter with active reloads and run-based progression

## 1. Purpose

This is the first game to build.

The Solo Learning MVP exists to answer three questions:

1. Is moving, aiming, shooting, reloading, and using melee immediately enjoyable?
2. Do ammunition scarcity, darkness, equipment, and feats create interesting decisions across a short run?
3. Can the game run reliably in a browser while remaining understandable to its human developer?

This is not a reduced networking prototype. It is a complete, deliberately small single-player experience. The separate multiplayer design remains preserved in `spec.md` for possible later development.

The MVP succeeds when a player wants to restart because the combat feels good and a different build sounds interesting—not merely because every planned system exists.

## 2. Product statement

Terra Rossa is a fast top-down shooter about a compact anthropomorphic dog gunslinger surviving a ten-minute occult night. Ammunition is limited, every reload offers a risky timing challenge, melee is always available, and valuable equipment waits in dangerous darkness.

The player fights increasingly dangerous creatures, gains individual levels, chooses feats, and assembles a focused build from one weapon, one armour, and one relic. Survive the final assault and reach dawn.

## 3. The hook

> An ammo-starved occult-western shooter where every reload is a skill check, melee keeps you alive, and the best equipment waits deeper in the darkness.

The dog theme provides personality and visual identity. The gameplay must remain compelling even before additional characters, lore, or multiplayer exist.

## 4. Design pillars

1. **Punch before quantity:** movement, weapon rhythm, hit reaction, sound, and enemy response matter more than enormous hordes.
2. **Ammunition creates decisions:** firing is powerful, melee is dependable, and resupply affects route choice.
3. **Reloading is play:** the player may accept a safe reload or risk a faster result and a costly fumble.
4. **Darkness tempts:** visibility and safety decrease away from light, while equipment quality improves.
5. **Small builds, meaningful changes:** one weapon, one armour, one relic, and a short feat list keep decisions legible.
6. **The world is the interface:** persistent HUD is minimized; animation, sound, sprites, and contextual cues communicate state.
7. **Learn the engine honestly:** systems remain small and inspectable enough that the developer can explain how they work.
8. **Web performance is part of the design:** art, simulation, effects, and download size are measured throughout development.

## 5. MVP scope

The complete MVP contains:

- one playable dog;
- one starting ability;
- one handcrafted map;
- one ten-minute survival mode;
- three weapons;
- one infinite-use melee attack;
- active reload timing;
- limited ammunition;
- three common creature roles;
- one final assault using existing enemies;
- individual XP and levels;
- nine feats;
- two armour items;
- three relics;
- one weapon, one armour, and one relic slot;
- darkness and visibility pressure;
- compass as the only persistent HUD;
- title, pause/settings, death, victory, and results screens;
- local settings persistence;
- desktop-browser export.

Anything beyond this list requires an explicit scope decision.

## 6. Explicit non-goals

The Solo Learning MVP does not include:

- networking or a dedicated server;
- packs, alpha, courage, revival, or other multiplayer rules;
- PvP;
- lobbies, room codes, matchmaking, accounts, or backend services;
- AI dog companions;
- procedural map generation;
- multiple maps or game modes;
- multiple playable dogs;
- a separate boss character;
- permanent power progression;
- inventory grids or loot voting;
- crafting, shops, currencies, or trading;
- mobile-browser support;
- native desktop or console releases;
- production-scale content;
- strict isometric tile art;
- hundreds of guaranteed enemies.

## 7. Player experience

### 7.1 Run flow

1. Load the browser build.
2. Click or press a key to enable audio and begin.
3. View the chosen dog, starting weapon, ability, and controls.
4. Enter the map with the starting weapon.
5. Fight creatures and collect ammunition.
6. Gain levels and choose personal feats.
7. Risk darker territory for weapons, armour, and relics.
8. Survive escalating pressure and a final assault.
9. Reach dawn or die.
10. Review the build and results, then restart quickly.

### 7.2 Run target

- Intended duration: 10 minutes.
- The first two minutes teach through low pressure.
- Mid-run pressure introduces mixed enemies and equipment choices.
- Minute nine begins the final assault.
- Reaching minute ten wins the run.
- Reaching zero health ends the run immediately.
- Restart should require no more than two deliberate actions from results.

These timings are starting hypotheses and should change when playtests disagree.

## 8. Controls

Provisional keyboard and mouse controls:

- Move: WASD.
- Aim: mouse cursor in world space.
- Fire: left mouse button.
- Melee: right mouse button.
- Dash: Space.
- Start reload: R.
- Reload timing input: X.
- Active ability: Q or middle mouse button.
- Interact/pick up: E.
- Pause/settings: Escape.

Movement and aiming are independent. The player can move backward while firing.

The game may pause in single player while settings or a feat choice is open. Initial playtesting should compare paused and unpaused feat selection before locking the rule.

## 9. Player character

### 9.1 Starting state

The MVP has one compact, upright, anthropomorphic dog hero.

The character has:

- health;
- movement speed;
- a shared dash;
- one equipped weapon;
- one armour slot;
- one relic slot;
- one active ability;
- one universal melee attack;
- XP, level, and selected feats.

The exact breed, name, starting ability, and final starting weapon remain open until the combat prototype establishes its needs.

### 9.2 Movement

- Movement uses a physics-timed simulation and is independent of render frame rate.
- Acceleration and stopping should feel direct rather than slippery.
- Dash provides a short burst with a clear recovery and cooldown.
- Dash direction follows movement input; exact behaviour with no movement input must be chosen through playtesting.
- Camera shake never changes aim calculation.

### 9.3 Health and death

- Health does not regenerate by default during the first prototype.
- Healing is scarce and explicit.
- Damage receives strong visual and audio feedback.
- Zero health ends the run; there is no downed state or self-revive in MVP.
- Brief post-hit protection may be used to prevent unreadable multi-hit deaths.

## 10. Combat

### 10.1 Combat goals

Combat should feel:

- immediate;
- fast but controllable;
- forceful without excessive screen shake;
- readable at laptop scale;
- dangerous when ammunition is low;
- satisfying with small enemy groups before crowd size increases.

Feedback tools include recoil, muzzle flash, directional hit reactions, knockback, impact sound, restrained local hit-stop, sprite squash, brief flashes, capped particles, and controlled camera shake.

### 10.2 Weapons

The player equips exactly one weapon.

Every weapon defines:

- damage;
- firing interval;
- magazine capacity;
- reserve ammunition category and capacity;
- reload duration;
- good and perfect reload windows;
- failed-reload penalty;
- spread and pellet count;
- range;
- hitscan or projectile behaviour;
- projectile speed when applicable;
- penetration;
- knockback;
- audiovisual and sprite references;
- tags used by feats and relics.

Initial weapon roles:

1. **Pistol:** accurate, efficient, forgiving reload.
2. **Shotgun:** short range, high impact, strong crowd control.
3. **Heavy weapon:** rare, powerful, narrow reload window, and scarce ammunition.

The heavy weapon may become a launcher after the projectile budget is measured.

Weapons are balanced as situational choices, not a linear rarity ladder. A weapon pickup replaces the equipped weapon and drops the old found weapon. The starting weapon may disappear when first replaced to avoid juggling exploits.

### 10.3 Ammunition

- Ammunition is limited.
- No firearm has infinite reserve ammunition.
- The melee attack is the infinite fallback.
- MVP should use no more than three broad ammunition categories.
- Ammunition pickups clearly communicate their compatible category.
- Running empty must create danger without making recovery impossible.
- The game should avoid spawning only ammunition the current weapon cannot use.

### 10.4 Active reload

Starting a reload displays a temporary timing line near the dog or aiming reticle.

- No timing input: normal reload.
- Input in the success zone: fast reload.
- Input in the smaller perfect zone: near-instant reload.
- Bad input: approximately 35 percent longer than the normal reload.
- Only one timing attempt is allowed per reload.
- A failed attempt receives an obvious fumble animation and sound.
- The timing cue uses shape and position, not colour alone.
- An optional audio cue supports accessibility.

Initial example for a two-second base reload:

| Result | Completion time |
|---|---:|
| Perfect | 0.25 seconds |
| Good | 0.8 seconds |
| No attempt | 2.0 seconds |
| Failed | 2.7 seconds |

Exact values and window widths are tuning data. Feats may widen, reposition, or reward the timing window, but should not remove the reload decision entirely.

### 10.5 Melee

The player always has an infinite-use melee attack.

- Short forward arc or thrust.
- Modest damage.
- Strong knockback.
- Brief recovery.
- Can interrupt weak creatures.
- Does not cancel a committed or failed reload.
- Must remain useful when ammunition is empty.
- Must not outperform firearms across ordinary combat.

The animation should express the chosen dog and weapon, but MVP needs only one implementation.

### 10.6 Active ability

The dog has one active ability with a cooldown.

The first ability should be selected after baseline movement and weapon combat feel good. It should reinforce the game's existing decisions rather than introduce a separate subsystem.

Good candidates:

- a howl that reveals creatures and pickups in darkness;
- a short defensive ward;
- an ammunition-scavenging pulse;
- a forceful close-range bark that creates space.

The ability must be useful with every weapon and visible without a persistent cooldown panel.

## 11. Creatures

The MVP has three common roles:

1. **Swarmer:** weak, fast, and dangerous in groups.
2. **Brute:** slow, durable, and forceful.
3. **Spitter:** ranged, fragile, and dependent on a clear projectile telegraph.

Every creature requires:

- a distinct silhouette;
- idle/move, attack, hit, and death states;
- an attack warning that remains readable in darkness;
- bounded spawn and lifecycle behaviour;
- inexpensive steering and simple local avoidance;
- pooling after the basic behaviour is correct;
- no full navigation calculation every frame.

The final assault recombines these roles at higher pressure. MVP does not require a unique boss.

## 12. Progression

### 12.1 XP and levels

- Creature kills grant XP.
- XP belongs to the player.
- Level thresholds are data-driven.
- Every chosen level milestone presents a feat choice.
- The initial target is three feat decisions during a ten-minute run; cadence must be playtested.

### 12.2 Feats

MVP contains nine feats across these axes:

- reload;
- ammunition;
- melee;
- dash;
- weapon behaviour;
- survivability;
- darkness/visibility;
- equipment synergy;
- active ability.

At a feat milestone:

- present three valid choices;
- allow one reroll per run;
- show exact behaviour in concise language;
- prevent excluded or invalid combinations;
- record the choice in the results screen.

Feats should change decisions or behaviour. Avoid invisible generic percentage bonuses when a more legible effect is possible.

## 13. Equipment

### 13.1 Loadout

The player carries:

- one weapon;
- one armour;
- one relic.

There is no inventory grid.

- Hold interact to inspect and pick up equipment.
- Equipping into an occupied slot drops the previous item.
- Looking at an item temporarily shows its name and one-sentence effect.
- Equipment entities cannot duplicate through rapid interaction or scene transitions.

### 13.2 Armour

MVP contains two pieces of armour:

1. one direct defensive option;
2. one behavioural option, such as melee retaliation or improved healing.

Armour is communicated through a clear sprite attachment, material/palette treatment, and activation feedback. It has no durability and requires no persistent armour panel.

### 13.3 Relics

MVP contains three relics selected from:

- reload;
- melee;
- dash;
- darkness/visibility;
- active ability.

Every relic:

- changes behaviour rather than applying only a hidden percentage;
- fits in one sentence;
- has a unique ground silhouette;
- produces clear feedback when activated;
- uses a consistent presentation, such as an orbiting object, glow, trail, or prominent sprite attachment.

The final relic presentation remains open until the pixel-art prototype establishes what remains readable.

## 14. Map and darkness

### 14.1 Map

- One fixed, handcrafted map.
- No procedural generation in MVP.
- Clear landmarks and routes.
- Open combat areas separated by sightline breaks.
- Several optional darker pockets containing higher-value loot.
- Spawn and encounter zones authored for pacing.
- Collision shapes remain simpler than environmental sprites.

The map should be enjoyable before decoration and should fit the selected camera scale.

### 14.2 Darkness

Without a pack, darkness becomes a direct risk/reward system:

- The dog has a readable local visibility radius.
- Darker regions obscure distant threats but never remove required attack telegraphs.
- Valuable equipment and ammunition are more likely in dangerous pockets.
- Creature pressure increases as the night progresses.
- Environmental lighting and sound communicate rising danger.
- The final assault may reduce safe visibility or activate new spawn zones.

Darkness must not be a black overlay that merely makes the game difficult to see. It should change information, routing, and threat.

## 15. Art direction

### 15.1 Style

The working direction is chunky low-resolution 2D inspired by the immediacy of compact top-down action games, without copying their characters, palette, proportions, effects, or assets.

- Top-down perspective with slight depth cues, not strict isometric tiles.
- Compact upright dog hero.
- Graphic occult-western palette: red earth, cold moonlight, iron, bone, and shadow.
- Large readable weapon silhouettes.
- Strong creature silhouettes and attack colours/shapes.
- Pixel-consistent or deliberately low-resolution rendering.
- Limited animation frames supported by procedural recoil, squash, tilt, flashes, and particles.

### 15.2 Non-artist production strategy

- Prototype with simple original placeholder shapes before final sprites.
- Separate body, weapon/arms, armour, shadow, and effects into layers where useful.
- Prefer four-direction body animation with freely aimed weapon presentation over eight fully redrawn directions.
- Reuse short animation cycles.
- Establish one palette and reference scale before producing content.
- Test every asset at actual gameplay size, not only zoomed in.
- Do not promise visible art for every feat.
- Weapon changes must be visible; armour and relics need only one strong attachment or activation treatment.

The art pipeline is not locked until a small prototype compares workflow, readability, and browser performance.

## 16. Interface

### 16.1 Persistent HUD

The compass is the only persistent HUD element.

For MVP it shows:

- cardinal directions;
- important fixed landmarks when required;
- temporary player-created or objective guidance.

It does not show creatures or loot automatically.

### 16.2 Contextual communication

- Health uses a world-attached ring, pips, injury animation, or a tested combination.
- Ammunition appears near the weapon or reticle when firing, reloading, low, or empty.
- Reload timing appears only during reload.
- Ability readiness uses animation, sound, and a temporary world-attached cue.
- Item descriptions appear only during inspection.
- Feat choices, pause/settings, death, victory, and results may use temporary full-screen panels.
- Colour is never the only critical signal.

The minimal-HUD rule may be revised if testing shows that players cannot make informed decisions. Clarity wins over purity.

## 17. Audio

- Browser audio begins only after user interaction.
- Weapons require distinct firing, impact, empty, reload, success, perfect, and fumble sounds.
- Melee requires wind-up and impact feedback.
- Creatures require readable attack warnings.
- Darkness uses ambience and directional warnings without obscuring combat information.
- Concurrent sounds are capped and prioritized.
- Master, music, effects, and interface volume controls persist locally where available.

## 18. Technical architecture

### 18.1 Principles

The Solo Learning MVP has no network layer and no server abstraction.

It should still preserve clean boundaries:

- Input produces gameplay intentions; combat code does not query physical keys directly.
- Simulation runs independently of render frame rate.
- Damage flows through one documented combat pathway.
- Weapons, creatures, feats, armour, relics, and encounters use data resources.
- UI requests actions and displays results; it does not directly change gameplay state.
- Presentation reacts to combat outcomes rather than deciding them.
- Random systems accept an explicit seed where reproducibility helps testing.
- Creatures receive targets through an interface rather than searching globally for a node named player.
- Runtime-spawned entities have clear ownership and bounded lifecycle.

These are normal single-player engineering practices, not speculative networking infrastructure.

### 18.2 Suggested project areas

- application boot and settings;
- player input and movement;
- combat and damage;
- weapon and ammunition data;
- creatures and encounter pacing;
- progression and modifiers;
- equipment and pickups;
- map and darkness;
- presentation and audio;
- temporary/contextual interface;
- tests and performance instrumentation.

The exact folder structure should follow the existing Godot project once its baseline is audited.

### 18.3 Persistence

MVP persists only:

- local settings;
- optional best result and recent run summary.

The game has no account, cloud save, permanent unlocks, or backend.

## 19. Web performance

- Godot Compatibility renderer/WebGL 2.
- Typed GDScript.
- Single-threaded web export first.
- 60 FPS target at representative load.
- 30 FPS hard minimum during deliberate stress.
- Initial internal resolution target: 1280×720 with scaling options.
- Representative machines: Apple Silicon MacBook Air and an integrated-graphics Windows laptop.
- Normal target: approximately 30–50 visible creatures after measurement.
- Stress hypothesis: approximately 80 simple visible creatures.
- Hitscan for ordinary bullets.
- Hard caps and pools for projectiles, creatures, effects, decals, corpses, sounds, and labels.
- Avoid per-creature navigation queries and expensive transparent overdraw.
- Initial compressed download target: under 20 MB.
- No sustained resource, node, or memory growth across repeated runs.

These are prototype hypotheses. Actual measured caps replace them.

## 20. Accessibility

- Remappable keyboard controls when practical within MVP scope.
- Independent volume controls.
- Screen-shake control.
- Reduced particles and flashes.
- High-contrast, shape-supported telegraphs.
- Active-reload audio cue option.
- Resolution scaling.
- Readable temporary UI at 1280×720.
- No essential rapid flashing.
- Pause is always available outside transition-sensitive moments.

## 21. Testing

### 21.1 Automated targets

- ammunition and magazine accounting;
- normal, good, perfect, and failed reload results;
- melee recovery and hit limits;
- damage and death;
- XP thresholds and feat offer validity;
- feat stacking and exclusions;
- weapon, armour, and relic slot swapping;
- pickup duplication prevention;
- deterministic seeded encounter choices;
- entity pool and lifecycle stability;
- results calculation.

### 21.2 Playtest questions

- Is movement enjoyable before enemies appear?
- Can a new player understand active reload without written instructions?
- Is attempting the reload timing meaningfully risky?
- Does limited ammunition create decisions rather than frustration?
- Is melee useful without becoming the default best attack?
- Do three enemy roles produce different movement decisions?
- Is entering darkness tempting?
- Can players understand health, ammunition, equipment, and ability readiness with minimal HUD?
- Does a completed or failed run create an immediate desire to retry?
- Can the developer explain the ownership and data flow of every major system?

## 22. Learning milestones

### S0 — Understand the project

- Pin the Godot version.
- Audit the existing project.
- Learn scenes, nodes, resources, signals, input, physics updates, and exports through the actual project.
- Produce a minimal browser build.

Exit: the developer can explain how the project boots and how a scene reaches the browser.

### S1 — Make movement enjoyable

- One placeholder dog.
- Movement, mouse aiming, camera, collision, and dash.
- Fixed test room.

Exit: controlling the dog feels responsive with no combat present.

### S2 — Make one weapon enjoyable

- Pistol, ammunition, active reload, melee, target dummy, and feedback.

Exit: firing, reloading, and melee are understandable and satisfying in a browser build.

### S3 — Create survival pressure

- Swarmer, brute, spitter, health, death, encounter pacing, and pools.

Exit: a five-minute greybox run is challenging and stable.

### S4 — Create builds

- XP, nine feats, three weapons, two armours, three relics, and physical equipment swapping.

Exit: at least three meaningfully different successful builds emerge in testing.

### S5 — Create the night

- One complete handcrafted map, dark pockets, loot placement, escalating pressure, final assault, dawn, and compass.

Exit: the full ten-minute loop has a readable beginning, escalation, climax, and result.

### S6 — Make it shippable on web

- Finalize the small art direction.
- Add title, settings, contextual interface, results, accessibility, profiling, and quality controls.
- Test target browsers and laptops.

Exit: the hosted build meets the acceptance criteria below.

## 23. MVP acceptance criteria

The Solo Learning MVP is complete when:

- a desktop browser user can begin without installation or an account;
- one complete run lasts approximately ten minutes;
- movement, aim, dash, firing, active reload, melee, damage, and death work end to end;
- three weapons, three creatures, nine feats, two armours, and three relics are available;
- limited ammunition and darkness create understandable risk/reward decisions;
- the final assault and dawn resolve the match correctly;
- compass is the only persistent HUD and required state remains understandable;
- the game targets 60 FPS and stays above 30 FPS in its measured stress case on representative hardware;
- repeated runs show no unbounded resource, node, or memory growth;
- current Chrome and Firefox pass the browser matrix, with Safari results documented on the target MacBook;
- all shipped audiovisual content is original, licensed, or clearly marked temporary;
- the developer can explain the major scene, signal, resource, input, combat, progression, and lifecycle flows without relying on the LLM.

## 24. Decisions intentionally left open

- Dog name, breed, and personality.
- Starting weapon and active ability.
- Exact map fiction and win narrative.
- Final sprite resolution, palette, and animation workflow.
- Whether feat choice pauses the single-player simulation.
- Exact level cadence.
- Exact ammunition categories.
- The two armour effects.
- The three relic effects and their visual presentation.
- Darkness progression and final-assault composition.
- Whether a unique boss belongs after MVP.

Open decisions should be answered with the smallest relevant prototype or playtest rather than additional architecture.
