import { randomInt, randomUUID } from 'node:crypto';

import { Room, ServerError, type Client } from '@colyseus/core';
import { StateView } from '@colyseus/schema';

import {
  CommandOrder,
  validateCommand,
  type GameCommand,
} from '../../shared/commands';
import { TERRA_ROSSA_MAP } from '../../shared/map';
import {
  PLAYER_MAXIMUM_HEALTH,
  SHARED_MELEE,
  STARTING_PISTOL,
  CENTRE_SHOTGUN,
  SHOTGUN_PELLET_OFFSETS,
  getWeaponDefinition,
  resolveDamageEvents,
  type DamageEvent,
} from '../../shared/combat';
import { traceHitscan } from '../../shared/hitscan';
import { selectMeleeTarget } from '../../shared/melee';
import { resolveLastStanding } from '../../shared/match';
import {
  FixedStepAccumulator,
  applyMovementInput,
  attemptDash,
  initializeMovementState,
  integratePlayerMovement,
  applyPlayerDisplacement,
} from '../../shared/movement';
import {
  MAX_PLAYERS,
  PROTOCOL_VERSION,
  COMMAND_MESSAGE,
  PROTOCOL_ERROR_MESSAGE,
  type JoinOptions,
} from '../../shared/protocol';
import {
  PlayerState,
  PickupState,
  createGameRoomState,
  type GameRoomStateInstance,
} from '../../shared/state';
import { FIXED_STEP_MILLISECONDS } from '../../shared/time';
import { millisecondsToTicks } from '../../shared/time';
import {
  advanceReload,
  attemptActiveReload,
  initializeReloadState,
  startReload,
} from '../../shared/reload';
import { consoleLogger, type GameLogger } from '../logger';
import { sanitizeDisplayName } from './displayName';
import { allocateSpawnRegions } from '../../shared/spawns';
import { deriveUnsignedSeed } from '../../shared/random';
import { canViewerSeeTarget } from '../../shared/visibility';
import {
  ACTIVITY_CUE_LIFETIME_TICKS,
  approximateActivityDirection,
  DARKNESS_STAGES,
  darknessStageAtTick,
  isOutsideDarknessBoundary,
} from '../../shared/darkness';
import { SIMULATION_HZ } from '../../shared/time';
import {
  NORMAL_CREATURE_BUDGET,
  planCreaturePopulation,
} from '../../shared/creaturePacing';
import {
  MAXIMUM_PISTOL_RESERVE_AMMO,
  PICKUP_INTERACTION_RANGE_METRES,
  planPickups,
  planShotgunPickup,
} from '../../shared/pickups';
import { CreatureRegistry } from '../creatures/CreatureRegistry';
import { ProjectileRegistry } from '../creatures/ProjectileRegistry';
import { SpitterSystem } from '../creatures/SpitterSystem';
import { SwarmerSystem } from '../creatures/SwarmerSystem';
import {
  createRoomCode,
  removePrivateRoom,
  updatePrivateRoom,
} from '../roomRegistry';

interface RoomOptions {
  logger?: GameLogger;
  seed?: number;
}

const COUNTDOWN_TICKS = millisecondsToTicks(3_000);

export class GameRoom extends Room<{ state: GameRoomStateInstance }> {
  override maxClients = MAX_PLAYERS;
  #logger: GameLogger = consoleLogger;
  #playerIdBySession = new Map<string, string>();
  #commandOrderBySession = new Map<string, CommandOrder>();
  #clientByPlayerId = new Map<string, Client>();
  #fixedStep = new FixedStepAccumulator();
  #simulationTick = 0;
  #lastAimTickByPlayer = new Map<string, number>();
  #pendingDamage: DamageEvent[] = [];
  #nextDamageOrder = 0;
  #creatures!: CreatureRegistry;
  #swarmers!: SwarmerSystem;
  #projectiles!: ProjectileRegistry;
  #spitters!: SpitterSystem;
  #creatureWarningEventById = new Map<string, number>();
  #simulationSamples: number[] = [];

  override onCreate(options: RoomOptions) {
    this.#logger = options.logger ?? consoleLogger;
    this.setState(createGameRoomState());
    this.#creatures = new CreatureRegistry(this.state.creatures);
    this.#swarmers = new SwarmerSystem(this.#creatures);
    this.#projectiles = new ProjectileRegistry(this.state.creatureProjectiles);
    this.#spitters = new SpitterSystem(this.#creatures, this.#projectiles);
    this.state.roomCode = createRoomCode(this.roomId);
    this.state.matchSeed = options.seed ?? randomInt(0, 0x1_0000_0000);
    this.setMetadata({ roomCode: this.state.roomCode });
    this.onMessage(COMMAND_MESSAGE, (client, message: unknown) => {
      this.#handleCommand(client, message);
    });
    this.setSimulationInterval((elapsedMilliseconds) => {
      this.#fixedStep.advance(elapsedMilliseconds, () => {
        const simulationStarted = performance.now();
        this.#simulationTick += 1;
        if (this.state.phase === 'countdown') {
          this.state.countdownTicksRemaining -= 1;
          if (this.state.countdownTicksRemaining === 0) {
            this.state.phase = 'playing';
            this.#populateCreatures();
            this.#populatePickups();
            this.#updateVisibilityViews();
          }
          this.#recordSimulationTime(performance.now() - simulationStarted);
          return;
        }
        if (this.state.phase !== 'playing') return;
        this.state.players.forEach((player) => {
          if (!player.alive) return;
          integratePlayerMovement(player);
          if (player.fireCooldownTicksRemaining > 0) {
            player.fireCooldownTicksRemaining -= 1;
          }
          advanceReload(player, getWeaponDefinition(player.weaponId));
          this.#advanceMelee(player);
          if (player.activityCueTicksRemaining > 0) {
            player.activityCueTicksRemaining -= 1;
          }
        });
        this.#advanceDarkness();
        const creatureUpdateStarted = performance.now();
        this.#swarmers.step(
          [...this.state.players.values()],
          (creatureId, targetId, damage) =>
            this.#queueDamage(creatureId, targetId, 'creature', damage),
        );
        this.#spitters.step(
          [...this.state.players.values()],
          (creatureId, targetId, damage) =>
            this.#queueDamage(creatureId, targetId, 'creature', damage),
        );
        this.state.creatures.forEach((creature) => {
          const previous = this.#creatureWarningEventById.get(creature.id) ?? 0;
          if (creature.attackWarningEvent > previous) {
            this.#emitApproximateActivity(creature, 'creature');
          }
          this.#creatureWarningEventById.set(
            creature.id,
            creature.attackWarningEvent,
          );
        });
        this.state.creaturePopulation = this.#creatures
          .values()
          .filter((creature) => creature.alive).length;
        this.state.creatureUpdateMilliseconds =
          performance.now() - creatureUpdateStarted;
        this.#updateVisibilityViews();
        this.#resolvePendingDamage();
        this.#recordSimulationTime(performance.now() - simulationStarted);
      });
    }, FIXED_STEP_MILLISECONDS);
    this.#logger.info('room_created', {
      roomId: this.roomId,
      protocolVersion: PROTOCOL_VERSION,
      maxClients: this.maxClients,
    });
  }

  override onAuth(_client: Client, options: JoinOptions) {
    if (options?.protocolVersion !== PROTOCOL_VERSION) {
      throw new ServerError(
        4001,
        `Protocol mismatch: server requires ${PROTOCOL_VERSION}; received ${String(options?.protocolVersion ?? 'missing')}.`,
      );
    }
    if (this.state.phase !== 'lobby') {
      throw new ServerError(4003, 'This private room has already started.');
    }
    return true;
  }

  override onJoin(client: Client, options: JoinOptions) {
    const playerId = randomUUID();
    const player = new PlayerState();
    player.id = playerId;
    player.sessionId = client.sessionId;
    player.displayName = sanitizeDisplayName(options.displayName);
    const usedVisualSlots = new Set(
      [...this.state.players.values()].map((candidate) => candidate.visualSlot),
    );
    player.visualSlot =
      [0, 1, 2, 3].find((slot) => !usedVisualSlots.has(slot)) ?? 0;
    player.ready = false;
    player.connected = true;
    player.disconnectEvent = 0;
    const spawn =
      TERRA_ROSSA_MAP.spawns[
        this.state.players.size % TERRA_ROSSA_MAP.spawns.length
      ];
    if (spawn === undefined)
      throw new Error('Authored map has no spawn regions.');
    initializeMovementState(player, spawn.center.x, spawn.center.z);
    player.spawnRegionId = spawn.id;
    player.aimAngleRadians = 0;
    player.weaponId = STARTING_PISTOL.id;
    player.magazineAmmo = STARTING_PISTOL.magazineSize;
    player.reserveAmmo = STARTING_PISTOL.reserveSize;
    player.fireCooldownTicksRemaining = 0;
    player.shotEvent = 0;
    player.dryFireEvent = 0;
    player.shotEndX = player.x;
    player.shotEndZ = player.z;
    player.shotTargetId = '';
    initializeReloadState(player);
    player.meleeWindupTicksRemaining = 0;
    player.meleeRecoveryTicksRemaining = 0;
    player.meleeAngleRadians = 0;
    player.meleeEvent = 0;
    player.meleeTargetId = '';
    player.health = PLAYER_MAXIMUM_HEALTH;
    player.maximumHealth = PLAYER_MAXIMUM_HEALTH;
    player.alive = true;
    player.eliminationEvent = 0;
    player.eliminatedById = '';
    player.pickupEvent = 0;
    player.pickupKind = '';
    player.activityCueEvent = 0;
    player.activityCueKind = '';
    player.activityCueDirection = '';
    player.activityCueTicksRemaining = 0;
    this.#playerIdBySession.set(client.sessionId, playerId);
    this.#clientByPlayerId.set(playerId, client);
    this.#commandOrderBySession.set(client.sessionId, new CommandOrder());
    this.state.players.set(playerId, player);
    client.view = new StateView();
    client.view.add(player, 1);
    client.view.add(player, 2);
    client.view.add(player, 3);
    if (this.state.hostPlayerId === '') this.state.hostPlayerId = playerId;
    updatePrivateRoom(this.state.roomCode, {
      playerCount: this.state.players.size,
    });
    this.#logger.info('player_joined', {
      roomId: this.roomId,
      playerId,
      playerCount: this.state.players.size,
    });
  }

  override onLeave(client: Client, code?: number) {
    const playerId = this.#playerIdBySession.get(client.sessionId);
    if (playerId !== undefined) {
      const player = this.state.players.get(playerId);
      this.#playerIdBySession.delete(client.sessionId);
      this.#clientByPlayerId.delete(playerId);
      this.#commandOrderBySession.delete(client.sessionId);
      this.#lastAimTickByPlayer.delete(playerId);
      if (this.state.hostPlayerId === playerId) {
        this.state.hostPlayerId =
          [...this.state.players.values()].find(
            (candidate) => candidate.id !== playerId && candidate.connected,
          )?.id ?? '';
      }
      if (this.state.phase === 'lobby') {
        this.state.players.delete(playerId);
        this.#resetLobby();
      } else if (player !== undefined) {
        player.connected = false;
        player.ready = false;
        player.moveX = 0;
        player.moveZ = 0;
        player.dashTicksRemaining = 0;
        player.reloadCompletionTick = 0;
        player.meleeWindupTicksRemaining = 0;
        player.disconnectEvent += 1;
        if (player.alive) {
          player.alive = false;
          player.eliminatedById = 'disconnect';
          player.eliminationEvent += 1;
        }
        if (this.state.phase === 'countdown' || this.state.phase === 'playing')
          this.#evaluateVictory();
      }
      updatePrivateRoom(this.state.roomCode, {
        playerCount: [...this.state.players.values()].filter(
          (candidate) => candidate.connected,
        ).length,
      });
    }
    this.#logger.info('player_left', {
      roomId: this.roomId,
      playerId,
      code,
      playerCount: this.state.players.size,
    });
  }

  override onDispose() {
    this.#playerIdBySession.clear();
    this.#clientByPlayerId.clear();
    this.#commandOrderBySession.clear();
    this.#lastAimTickByPlayer.clear();
    this.#pendingDamage.length = 0;
    this.#creatures.clear();
    this.#projectiles.clear();
    this.state.pickups.clear();
    this.state.creaturePopulation = 0;
    this.state.creatureUpdateMilliseconds = 0;
    removePrivateRoom(this.state.roomCode);
    this.#logger.info('room_disposed', { roomId: this.roomId });
  }

  #handleCommand(client: Client, message: unknown) {
    const order = this.#commandOrderBySession.get(client.sessionId);
    const playerId = this.#playerIdBySession.get(client.sessionId);
    const player =
      playerId === undefined ? undefined : this.state.players.get(playerId);
    if (order === undefined || player === undefined) return;
    const result = validateCommand(
      message,
      {
        roomId: this.roomId,
        matchId: this.state.matchId === '' ? null : this.state.matchId,
      },
      order,
    );
    if (!result.ok) {
      client.send(PROTOCOL_ERROR_MESSAGE, result.error);
      return;
    }
    const command = result.command as GameCommand;
    player.lastProcessedSequence = command.sequence;
    if (command.type === 'ready' && this.state.phase === 'lobby') {
      const payload = command.payload as { readonly ready: boolean };
      player.ready = payload.ready;
    } else if (command.type === 'start') {
      if (
        player.id === this.state.hostPlayerId &&
        this.state.players.size >= 2 &&
        [...this.state.players.values()].every((candidate) => candidate.ready)
      ) {
        this.state.phase = 'countdown';
        this.state.startApprovedEvent += 1;
        this.#assignConcealedSpawns();
        this.state.roundNumber += 1;
        this.state.matchId = `round-${this.state.roundNumber}-${randomUUID().slice(0, 8)}`;
        this.state.countdownTicksRemaining = COUNTDOWN_TICKS;
        void this.lock();
        updatePrivateRoom(this.state.roomCode, { closed: true });
      }
    } else if (command.type === 'rematch') {
      if (
        player.id === this.state.hostPlayerId &&
        this.state.phase === 'round_over'
      )
        this.#resetLobby(true);
    } else if (this.state.phase !== 'playing') {
      return;
    } else if (!player.alive) {
      return;
    } else if (command.type === 'move') {
      const payload = command.payload as {
        readonly x: number;
        readonly z: number;
      };
      applyMovementInput(player, payload.x, payload.z, command.sequence);
    } else if (command.type === 'dash') {
      attemptDash(player);
    } else if (command.type === 'aim') {
      if (this.#lastAimTickByPlayer.get(player.id) === this.#simulationTick)
        return;
      const payload = command.payload as { readonly angleRadians: number };
      player.aimAngleRadians = payload.angleRadians;
      this.#lastAimTickByPlayer.set(player.id, this.#simulationTick);
    } else if (command.type === 'fire') {
      this.#attemptFire(player);
    } else if (command.type === 'reload_start') {
      startReload(player, getWeaponDefinition(player.weaponId));
    } else if (command.type === 'reload_attempt') {
      const payload = command.payload as {
        readonly clientElapsedMilliseconds: number;
      };
      attemptActiveReload(
        player,
        payload.clientElapsedMilliseconds,
        getWeaponDefinition(player.weaponId),
      );
    } else if (command.type === 'melee') {
      this.#attemptMelee(player);
    } else if (command.type === 'interact') {
      this.#attemptPickup(player);
    }
  }

  #resetLobby(resetPlayers = false) {
    if (resetPlayers) {
      [...this.state.players.entries()].forEach(([id, player]) => {
        if (!player.connected) this.state.players.delete(id);
      });
    }
    this.state.phase = 'lobby';
    this.state.matchId = '';
    this.state.countdownTicksRemaining = 0;
    this.state.resultKind = '';
    this.state.winnerPlayerId = '';
    this.state.darknessStage = 0;
    this.state.darknessElapsedTicks = 0;
    this.state.darknessNextStageTick = DARKNESS_STAGES[1]!.startsAtTick;
    this.state.darknessHalfWidth = DARKNESS_STAGES[0]!.halfWidth;
    this.state.darknessHalfDepth = DARKNESS_STAGES[0]!.halfDepth;
    this.state.darknessDamagePerSecond = 0;
    this.state.visibilityRadiusMetres =
      DARKNESS_STAGES[0]!.visibilityRadiusMetres;
    this.state.telemetryCreatureDamageToPlayers = 0;
    this.state.telemetryPlayerDamageToCreatures = 0;
    this.state.telemetryPvpDeathsUnderCreaturePressure = 0;
    this.state.telemetryAmmoExpended = 0;
    this.state.telemetryLastEncounterRegion = '';
    this.state.players.forEach((player) => {
      player.ready = false;
    });
    if (resetPlayers) {
      this.#creatures.clear();
      this.#projectiles.clear();
      this.state.pickups.clear();
      this.state.creaturePopulation = 0;
      this.state.creatureUpdateMilliseconds = 0;
      this.#resetPlayersForRematch();
    }
    updatePrivateRoom(this.state.roomCode, { closed: false });
    void this.unlock();
  }

  #resetPlayersForRematch() {
    [...this.state.players.values()].forEach((player, index) => {
      const spawn =
        TERRA_ROSSA_MAP.spawns[index % TERRA_ROSSA_MAP.spawns.length];
      if (spawn === undefined) throw new Error('Missing rematch spawn.');
      initializeMovementState(player, spawn.center.x, spawn.center.z);
      player.spawnRegionId = spawn.id;
      player.aimAngleRadians = 0;
      player.weaponId = STARTING_PISTOL.id;
      player.magazineAmmo = STARTING_PISTOL.magazineSize;
      player.reserveAmmo = STARTING_PISTOL.reserveSize;
      player.fireCooldownTicksRemaining = 0;
      player.shotEvent = 0;
      player.dryFireEvent = 0;
      player.shotTargetId = '';
      initializeReloadState(player);
      player.meleeWindupTicksRemaining = 0;
      player.meleeRecoveryTicksRemaining = 0;
      player.meleeEvent = 0;
      player.meleeTargetId = '';
      player.health = PLAYER_MAXIMUM_HEALTH;
      player.maximumHealth = PLAYER_MAXIMUM_HEALTH;
      player.alive = true;
      player.eliminationEvent = 0;
      player.eliminatedById = '';
      player.connected = true;
      player.pickupEvent = 0;
      player.pickupKind = '';
    });
  }

  #assignConcealedSpawns() {
    const players = [...this.state.players.values()];
    const spawns = allocateSpawnRegions(players.length, this.state.matchSeed);
    players.forEach((player, index) => {
      const spawn = spawns[index];
      if (spawn === undefined) throw new Error('Missing allocated spawn.');
      initializeMovementState(player, spawn.center.x, spawn.center.z);
      player.spawnRegionId = spawn.id;
    });
  }

  #populateCreatures() {
    this.#creatures.clear();
    const plan = planCreaturePopulation(
      [...this.state.players.values()],
      deriveUnsignedSeed(this.state.matchSeed, this.state.roundNumber),
      NORMAL_CREATURE_BUDGET,
    );
    plan.forEach((spawn) => {
      this.#creatures.spawn({
        ...spawn,
        id: `round-${this.state.roundNumber}-${spawn.id}`,
      });
    });
    this.state.creaturePopulation = this.#creatures.size;
  }

  #populatePickups() {
    this.state.pickups.clear();
    planPickups(
      deriveUnsignedSeed(this.state.matchSeed, this.state.roundNumber * 31),
    ).forEach((planned) => {
      const pickup = new PickupState();
      pickup.id = `round-${this.state.roundNumber}-${planned.id}`;
      pickup.kind = planned.kind;
      pickup.x = planned.x;
      pickup.z = planned.z;
      pickup.amount = planned.amount;
      pickup.weaponId = '';
      pickup.magazineAmmo = 0;
      pickup.reserveAmmo = 0;
      this.state.pickups.set(pickup.id, pickup);
    });
    const point = planShotgunPickup(
      deriveUnsignedSeed(this.state.matchSeed, this.state.roundNumber * 73),
    );
    const shotgun = new PickupState();
    shotgun.id = `round-${this.state.roundNumber}-shotgun`;
    shotgun.kind = 'weapon';
    shotgun.x = point.x;
    shotgun.z = point.z;
    shotgun.amount = 0;
    shotgun.weaponId = CENTRE_SHOTGUN.id;
    shotgun.magazineAmmo = CENTRE_SHOTGUN.magazineSize;
    shotgun.reserveAmmo = CENTRE_SHOTGUN.reserveSize;
    this.state.pickups.set(shotgun.id, shotgun);
  }

  #updateVisibilityViews() {
    this.state.players.forEach((viewer) => {
      const view = this.#clientByPlayerId.get(viewer.id)?.view;
      if (view === undefined) return;
      this.state.players.forEach((target) => {
        if (target.id === viewer.id) {
          view.add(target, 1);
          return;
        }
        if (this.#canSee(viewer, target)) {
          view.add(target, 1);
        } else {
          view.remove(target, 1);
        }
      });
      this.state.creatures.forEach((creature) => {
        if (this.#canSee(viewer, creature)) {
          view.add(creature, 1);
        } else {
          view.remove(creature, 1);
        }
      });
      this.state.creatureProjectiles.forEach((projectile) => {
        if (
          this.#canSee(viewer, {
            x: projectile.x,
            z: projectile.z,
            alive: true,
          })
        ) {
          view.add(projectile, 1);
        } else {
          view.remove(projectile, 1);
        }
      });
      this.state.pickups.forEach((pickup) => {
        if (
          this.#canSee(viewer, {
            x: pickup.x,
            z: pickup.z,
            alive: true,
          })
        ) {
          view.add(pickup, 1);
        } else {
          view.remove(pickup, 1);
        }
      });
    });
  }

  #attemptPickup(player: InstanceType<typeof PlayerState>) {
    const pickup = [...this.state.pickups.values()]
      .filter(
        (candidate) =>
          Math.hypot(candidate.x - player.x, candidate.z - player.z) <=
            PICKUP_INTERACTION_RANGE_METRES &&
          this.#canSee(player, {
            x: candidate.x,
            z: candidate.z,
            alive: true,
          }),
      )
      .sort(
        (left, right) =>
          Math.hypot(left.x - player.x, left.z - player.z) -
          Math.hypot(right.x - player.x, right.z - player.z),
      )[0];
    if (pickup === undefined) return;
    if (pickup.kind === 'ammo') {
      const maximumReserve =
        player.weaponId === CENTRE_SHOTGUN.id
          ? CENTRE_SHOTGUN.reserveSize + CENTRE_SHOTGUN.magazineSize
          : MAXIMUM_PISTOL_RESERVE_AMMO;
      if (player.reserveAmmo >= maximumReserve) return;
      player.reserveAmmo = Math.min(
        maximumReserve,
        player.reserveAmmo +
          (player.weaponId === CENTRE_SHOTGUN.id
            ? Math.ceil(pickup.amount / 4)
            : pickup.amount),
      );
    } else if (pickup.kind === 'heal') {
      if (player.health >= player.maximumHealth) return;
      player.health = Math.min(
        player.maximumHealth,
        player.health + pickup.amount,
      );
    } else if (pickup.kind === 'weapon') {
      const oldWeaponId = player.weaponId;
      const oldMagazine = player.magazineAmmo;
      const oldReserve = player.reserveAmmo;
      player.weaponId = pickup.weaponId;
      player.magazineAmmo = pickup.magazineAmmo;
      player.reserveAmmo = pickup.reserveAmmo;
      initializeReloadState(player);
      if (oldWeaponId !== STARTING_PISTOL.id) {
        pickup.weaponId = oldWeaponId;
        pickup.magazineAmmo = oldMagazine;
        pickup.reserveAmmo = oldReserve;
        player.pickupKind = 'weapon';
        player.pickupEvent += 1;
        return;
      }
    } else {
      return;
    }
    if (!this.state.pickups.delete(pickup.id)) return;
    player.pickupKind = pickup.kind;
    player.pickupEvent += 1;
  }

  #attemptFire(player: InstanceType<typeof PlayerState>) {
    const weapon = getWeaponDefinition(player.weaponId);
    if (
      player.fireCooldownTicksRemaining > 0 ||
      player.reloadCompletionTick > 0
    )
      return;
    player.fireCooldownTicksRemaining = millisecondsToTicks(
      weapon.fireIntervalMilliseconds,
    );
    if (player.magazineAmmo === 0) {
      player.dryFireEvent += 1;
      return;
    }
    player.magazineAmmo -= 1;
    this.state.telemetryAmmoExpended += 1;
    this.#emitApproximateActivity(player, 'gunfire');
    const targets = [
      ...this.state.players.values(),
      ...this.state.creatures.values(),
    ]
      .filter((candidate) => candidate.id !== player.id && candidate.alive)
      .map((candidate) => ({
        id: candidate.id,
        x: candidate.x,
        z: candidate.z,
        radius: candidate.collisionRadius,
      }));
    const offsets =
      weapon.id === CENTRE_SHOTGUN.id ? SHOTGUN_PELLET_OFFSETS : [0];
    const hits = offsets.map((offset) =>
      traceHitscan(
        TERRA_ROSSA_MAP,
        player.x,
        player.z,
        player.aimAngleRadians + offset,
        weapon.rangeMetres,
        targets,
      ),
    );
    const centreHit = hits[Math.floor(hits.length / 2)]!;
    player.shotEndX = centreHit.endX;
    player.shotEndZ = centreHit.endZ;
    player.shotTargetId =
      hits.find((candidate) => candidate.targetId !== null)?.targetId ?? '';
    player.shotEvent += 1;
    hits.forEach((hit) => {
      if (hit.targetId !== null) {
        if (this.state.creatures.has(hit.targetId)) {
          this.#damageCreature(hit.targetId, weapon.damage);
        } else {
          this.#queueDamage(player.id, hit.targetId, 'firearm', weapon.damage);
          const target = this.state.players.get(hit.targetId);
          if (target !== undefined && weapon.id === CENTRE_SHOTGUN.id) {
            applyPlayerDisplacement(
              target,
              Math.cos(player.aimAngleRadians) * 0.18,
              Math.sin(player.aimAngleRadians) * 0.18,
            );
          }
        }
      }
    });
  }

  #canSee(
    viewer: { x: number; z: number; alive: boolean },
    target: { x: number; z: number; alive: boolean },
  ) {
    return canViewerSeeTarget(TERRA_ROSSA_MAP, viewer, target, {
      maximumRangeMetres: this.state.visibilityRadiusMetres,
    });
  }

  #advanceDarkness() {
    this.state.darknessElapsedTicks += 1;
    const { index, stage } = darknessStageAtTick(
      this.state.darknessElapsedTicks,
    );
    if (index !== this.state.darknessStage) {
      this.state.darknessStage = index;
      this.state.darknessWarningEvent += 1;
    }
    this.state.darknessHalfWidth = stage.halfWidth;
    this.state.darknessHalfDepth = stage.halfDepth;
    this.state.darknessDamagePerSecond = stage.damagePerSecond;
    this.state.visibilityRadiusMetres = stage.visibilityRadiusMetres;
    this.state.darknessNextStageTick =
      DARKNESS_STAGES[index + 1]?.startsAtTick ?? 0;
    if (
      stage.damagePerSecond <= 0 ||
      this.state.darknessElapsedTicks % SIMULATION_HZ !== 0
    )
      return;
    this.state.players.forEach((player) => {
      if (
        player.alive &&
        isOutsideDarknessBoundary(
          player.x,
          player.z,
          stage.halfWidth,
          stage.halfDepth,
        )
      ) {
        this.#queueDamage(
          'darkness',
          player.id,
          'darkness',
          stage.damagePerSecond,
        );
      }
    });
  }

  #emitApproximateActivity(
    source: { id: string; x: number; z: number; alive: boolean },
    kind: 'gunfire' | 'creature',
  ) {
    this.state.players.forEach((viewer) => {
      if (
        viewer.id === source.id ||
        !viewer.alive ||
        this.#canSee(viewer, source)
      )
        return;
      viewer.activityCueKind = kind;
      viewer.activityCueDirection = approximateActivityDirection(
        viewer.x,
        viewer.z,
        source.x,
        source.z,
      );
      viewer.activityCueTicksRemaining = ACTIVITY_CUE_LIFETIME_TICKS;
      viewer.activityCueEvent += 1;
    });
  }

  #attemptMelee(player: InstanceType<typeof PlayerState>) {
    if (
      player.reloadCompletionTick > 0 ||
      player.meleeWindupTicksRemaining > 0 ||
      player.meleeRecoveryTicksRemaining > 0
    )
      return;
    player.meleeAngleRadians = player.aimAngleRadians;
    player.meleeWindupTicksRemaining = millisecondsToTicks(
      SHARED_MELEE.windupMilliseconds,
    );
  }

  #advanceMelee(player: InstanceType<typeof PlayerState>) {
    if (player.meleeWindupTicksRemaining > 0) {
      player.meleeWindupTicksRemaining -= 1;
      if (player.meleeWindupTicksRemaining === 0) this.#resolveMelee(player);
    } else if (player.meleeRecoveryTicksRemaining > 0) {
      player.meleeRecoveryTicksRemaining -= 1;
    }
  }

  #resolveMelee(player: InstanceType<typeof PlayerState>) {
    const target = selectMeleeTarget(
      player,
      [...this.state.players.values(), ...this.state.creatures.values()]
        .filter((candidate) => candidate.id !== player.id && candidate.alive)
        .map((candidate) => ({
          id: candidate.id,
          x: candidate.x,
          z: candidate.z,
          radius: candidate.collisionRadius,
        })),
    );
    player.meleeTargetId = target?.id ?? '';
    player.meleeEvent += 1;
    player.meleeRecoveryTicksRemaining = millisecondsToTicks(
      SHARED_MELEE.recoveryMilliseconds,
    );
    if (target === null) return;
    const targetEntity =
      this.state.players.get(target.id) ?? this.state.creatures.get(target.id);
    if (targetEntity === undefined) return;
    applyPlayerDisplacement(
      targetEntity,
      Math.cos(player.meleeAngleRadians) * SHARED_MELEE.knockbackMetres,
      Math.sin(player.meleeAngleRadians) * SHARED_MELEE.knockbackMetres,
    );
    if (this.state.creatures.has(target.id)) {
      this.#damageCreature(target.id, SHARED_MELEE.damage);
    } else {
      this.#queueDamage(player.id, target.id, 'melee', SHARED_MELEE.damage);
    }
  }

  #queueDamage(
    sourceId: string,
    targetId: string,
    cause: DamageEvent['cause'],
    amount: number,
  ) {
    if (cause === 'creature') {
      this.state.telemetryCreatureDamageToPlayers += amount;
      const target = this.state.players.get(targetId);
      if (target !== undefined) {
        this.state.telemetryLastEncounterRegion = `${target.z < 0 ? 'north' : 'south'}-${target.x < 0 ? 'west' : 'east'}`;
      }
    }
    const order = this.#nextDamageOrder++;
    this.#pendingDamage.push({
      id: `${this.#simulationTick}-${order}`,
      sourceId,
      targetId,
      cause,
      amount,
      occurredAtTick: this.#simulationTick,
      order,
    });
  }

  #resolvePendingDamage() {
    if (this.#pendingDamage.length === 0) return;
    const livingTargets = new Map(
      [...this.state.players.entries()].filter(([, player]) => player.alive),
    );
    const applicable = this.#pendingDamage.filter((event) =>
      livingTargets.has(event.targetId),
    );
    this.#pendingDamage.length = 0;
    const applied = resolveDamageEvents(livingTargets, applicable);
    for (const result of applied) {
      if (result.healthAfter > 0) continue;
      const target = this.state.players.get(result.event.targetId);
      if (target === undefined || !target.alive) continue;
      target.alive = false;
      if (
        (result.event.cause === 'firearm' || result.event.cause === 'melee') &&
        this.#creatures
          .values()
          .some(
            (creature) =>
              creature.alive &&
              Math.hypot(creature.x - target.x, creature.z - target.z) <= 5,
          )
      ) {
        this.state.telemetryPvpDeathsUnderCreaturePressure += 1;
      }
      target.eliminatedById = result.event.sourceId;
      target.eliminationEvent += 1;
      target.moveX = 0;
      target.moveZ = 0;
      target.dashTicksRemaining = 0;
      target.reloadCompletionTick = 0;
      target.meleeWindupTicksRemaining = 0;
    }
    this.#evaluateVictory();
  }

  #evaluateVictory() {
    if (this.state.phase !== 'playing' && this.state.phase !== 'countdown')
      return;
    const result = resolveLastStanding([...this.state.players.values()]);
    if (result.kind === 'ongoing') return;
    this.state.phase = 'round_over';
    this.state.resultKind = result.kind;
    this.state.winnerPlayerId = result.winnerPlayerId;
    this.state.resultEvent += 1;
    this.#pendingDamage.length = 0;
    this.#logger.info('round_finished', {
      roomId: this.roomId,
      resultKind: result.kind,
      durationTicks: this.state.darknessElapsedTicks,
      creatureDamageToPlayers: this.state.telemetryCreatureDamageToPlayers,
      playerDamageToCreatures: this.state.telemetryPlayerDamageToCreatures,
      pvpDeathsUnderCreaturePressure:
        this.state.telemetryPvpDeathsUnderCreaturePressure,
      ammoExpended: this.state.telemetryAmmoExpended,
      lastEncounterRegion: this.state.telemetryLastEncounterRegion,
    });
  }

  #damageCreature(id: string, amount: number) {
    const creature = this.state.creatures.get(id);
    const before = creature?.health ?? 0;
    const result = this.#creatures.damage(id, amount);
    if (result.applied) {
      this.state.telemetryPlayerDamageToCreatures +=
        before - result.healthAfter;
    }
    return result;
  }

  #recordSimulationTime(milliseconds: number) {
    this.#simulationSamples.push(milliseconds);
    if (this.#simulationSamples.length > 300) this.#simulationSamples.shift();
    if (this.#simulationTick % 30 !== 0) return;
    const sorted = [...this.#simulationSamples].sort(
      (left, right) => left - right,
    );
    const percentile = (fraction: number) =>
      sorted[
        Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
      ] ?? 0;
    this.state.simulationP50Milliseconds = percentile(0.5);
    this.state.simulationP95Milliseconds = percentile(0.95);
    this.state.simulationP99Milliseconds = percentile(0.99);
    this.state.serverEntityCount =
      this.state.players.size +
      this.state.creatures.size +
      this.state.creatureProjectiles.size +
      this.state.pickups.size;
    this.state.serverHeapMegabytes =
      process.memoryUsage().heapUsed / (1024 * 1024);
  }
}
