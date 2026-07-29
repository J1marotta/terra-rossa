import { randomUUID } from 'node:crypto';

import { Room, ServerError, type Client } from '@colyseus/core';

import {
  CommandOrder,
  validateCommand,
  type GameCommand,
} from '../../shared/commands';
import { TERRA_ROSSA_MAP } from '../../shared/map';
import { SHARED_MELEE, STARTING_PISTOL } from '../../shared/combat';
import { traceHitscan } from '../../shared/hitscan';
import { selectMeleeTarget } from '../../shared/melee';
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

interface RoomOptions {
  logger?: GameLogger;
}

export class GameRoom extends Room<{ state: GameRoomStateInstance }> {
  override maxClients = MAX_PLAYERS;
  #logger: GameLogger = consoleLogger;
  #playerIdBySession = new Map<string, string>();
  #commandOrderBySession = new Map<string, CommandOrder>();
  #fixedStep = new FixedStepAccumulator();
  #simulationTick = 0;
  #lastAimTickByPlayer = new Map<string, number>();

  override onCreate(options: RoomOptions) {
    this.#logger = options.logger ?? consoleLogger;
    this.setState(createGameRoomState());
    this.onMessage(COMMAND_MESSAGE, (client, message: unknown) => {
      this.#handleCommand(client, message);
    });
    this.setSimulationInterval((elapsedMilliseconds) => {
      this.#fixedStep.advance(elapsedMilliseconds, () => {
        this.#simulationTick += 1;
        this.state.players.forEach((player) => {
          integratePlayerMovement(player);
          if (player.fireCooldownTicksRemaining > 0) {
            player.fireCooldownTicksRemaining -= 1;
          }
          advanceReload(player);
          this.#advanceMelee(player);
        });
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
    return true;
  }

  override onJoin(client: Client, options: JoinOptions) {
    const playerId = randomUUID();
    const player = new PlayerState();
    player.id = playerId;
    player.sessionId = client.sessionId;
    player.displayName = sanitizeDisplayName(options.displayName);
    const spawn =
      TERRA_ROSSA_MAP.spawns[
        this.state.players.size % TERRA_ROSSA_MAP.spawns.length
      ];
    if (spawn === undefined)
      throw new Error('Authored map has no spawn regions.');
    initializeMovementState(player, spawn.center.x, spawn.center.z);
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
    this.#playerIdBySession.set(client.sessionId, playerId);
    this.#commandOrderBySession.set(client.sessionId, new CommandOrder());
    this.state.players.set(playerId, player);
    this.#logger.info('player_joined', {
      roomId: this.roomId,
      playerId,
      playerCount: this.state.players.size,
    });
  }

  override onLeave(client: Client, code?: number) {
    const playerId = this.#playerIdBySession.get(client.sessionId);
    if (playerId !== undefined) {
      this.#playerIdBySession.delete(client.sessionId);
      this.#commandOrderBySession.delete(client.sessionId);
      this.#lastAimTickByPlayer.delete(playerId);
      this.state.players.delete(playerId);
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
    this.#commandOrderBySession.clear();
    this.#lastAimTickByPlayer.clear();
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
      { roomId: this.roomId, matchId: null },
      order,
    );
    if (!result.ok) {
      client.send(PROTOCOL_ERROR_MESSAGE, result.error);
      return;
    }
    const command = result.command as GameCommand;
    player.lastProcessedSequence = command.sequence;
    if (command.type === 'move') {
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
    const targets = [...this.state.players.values()]
      .filter((candidate) => candidate.id !== player.id)
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
      [...this.state.players.values()]
        .filter((candidate) => candidate.id !== player.id)
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
    const targetPlayer = this.state.players.get(target.id);
    if (targetPlayer === undefined) return;
    applyPlayerDisplacement(
      targetPlayer,
      Math.cos(player.meleeAngleRadians) * SHARED_MELEE.knockbackMetres,
      Math.sin(player.meleeAngleRadians) * SHARED_MELEE.knockbackMetres,
    );
  }
}
