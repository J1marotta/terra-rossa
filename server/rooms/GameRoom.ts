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
import { canViewerSeeTarget } from '../../shared/visibility';
import {
  NORMAL_CREATURE_BUDGET,
  planCreaturePopulation,
} from '../../shared/creaturePacing';
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
        this.#simulationTick += 1;
        if (this.state.phase === 'countdown') {
          this.state.countdownTicksRemaining -= 1;
          if (this.state.countdownTicksRemaining === 0) {
            this.state.phase = 'playing';
            this.#populateCreatures();
            this.#updateVisibilityViews();
          }
          return;
        }
        if (this.state.phase !== 'playing') return;
        this.state.players.forEach((player) => {
          if (!player.alive) return;
          integratePlayerMovement(player);
          if (player.fireCooldownTicksRemaining > 0) {
            player.fireCooldownTicksRemaining -= 1;
          }
          advanceReload(player);
          this.#advanceMelee(player);
        });
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
        this.state.creaturePopulation = this.#creatures
          .values()
          .filter((creature) => creature.alive).length;
        this.state.creatureUpdateMilliseconds =
          performance.now() - creatureUpdateStarted;
        this.#updateVisibilityViews();
        this.#resolvePendingDamage();
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
    this.#playerIdBySession.set(client.sessionId, playerId);
    this.#clientByPlayerId.set(playerId, client);
    this.#commandOrderBySession.set(client.sessionId, new CommandOrder());
    this.state.players.set(playerId, player);
    client.view = new StateView();
    client.view.add(player, 1);
    client.view.add(player, 2);
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
      startReload(player);
    } else if (command.type === 'reload_attempt') {
      const payload = command.payload as {
        readonly clientElapsedMilliseconds: number;
      };
      attemptActiveReload(player, payload.clientElapsedMilliseconds);
    } else if (command.type === 'melee') {
      this.#attemptMelee(player);
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
    this.state.players.forEach((player) => {
      player.ready = false;
    });
    if (resetPlayers) {
      this.#creatures.clear();
      this.#projectiles.clear();
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
      this.state.matchSeed ^ this.state.roundNumber,
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

  #updateVisibilityViews() {
    this.state.players.forEach((viewer) => {
      const view = this.#clientByPlayerId.get(viewer.id)?.view;
      if (view === undefined) return;
      this.state.players.forEach((target) => {
        if (target.id === viewer.id) {
          view.add(target, 1);
          return;
        }
        if (canViewerSeeTarget(TERRA_ROSSA_MAP, viewer, target)) {
          view.add(target, 1);
        } else {
          view.remove(target, 1);
        }
      });
      this.state.creatures.forEach((creature) => {
        if (canViewerSeeTarget(TERRA_ROSSA_MAP, viewer, creature)) {
          view.add(creature, 1);
        } else {
          view.remove(creature, 1);
        }
      });
      this.state.creatureProjectiles.forEach((projectile) => {
        if (
          canViewerSeeTarget(TERRA_ROSSA_MAP, viewer, {
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
    });
  }

  #attemptFire(player: InstanceType<typeof PlayerState>) {
    if (
      player.fireCooldownTicksRemaining > 0 ||
      player.reloadCompletionTick > 0
    )
      return;
    player.fireCooldownTicksRemaining = millisecondsToTicks(
      STARTING_PISTOL.fireIntervalMilliseconds,
    );
    if (player.magazineAmmo === 0) {
      player.dryFireEvent += 1;
      return;
    }
    player.magazineAmmo -= 1;
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
    const hit = traceHitscan(
      TERRA_ROSSA_MAP,
      player.x,
      player.z,
      player.aimAngleRadians,
      STARTING_PISTOL.rangeMetres,
      targets,
    );
    player.shotEndX = hit.endX;
    player.shotEndZ = hit.endZ;
    player.shotTargetId = hit.targetId ?? '';
    player.shotEvent += 1;
    if (hit.targetId !== null) {
      if (this.state.creatures.has(hit.targetId)) {
        this.#creatures.damage(hit.targetId, STARTING_PISTOL.damage);
      } else {
        this.#queueDamage(
          player.id,
          hit.targetId,
          'firearm',
          STARTING_PISTOL.damage,
        );
      }
    }
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
      this.#creatures.damage(target.id, SHARED_MELEE.damage);
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
  }
}
