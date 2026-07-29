import { randomUUID } from 'node:crypto';

import { Room, ServerError, type Client } from '@colyseus/core';

import {
  CommandOrder,
  validateCommand,
  type GameCommand,
} from '../../shared/commands';
import { TERRA_ROSSA_MAP } from '../../shared/map';
import {
  MAX_PLAYERS,
  PROTOCOL_VERSION,
  type JoinOptions,
} from '../../shared/protocol';
import {
  PlayerState,
  createGameRoomState,
  type GameRoomStateInstance,
} from '../../shared/state';
import { FIXED_STEP_MILLISECONDS } from '../../shared/time';
import { consoleLogger, type GameLogger } from '../logger';
import {
  FixedStepAccumulator,
  applyMovementInput,
  initializeMovementState,
  integratePlayerMovement,
} from '../simulation/movement';
import { sanitizeDisplayName } from './displayName';

interface RoomOptions {
  logger?: GameLogger;
}

export const COMMAND_MESSAGE = 'command';
export const PROTOCOL_ERROR_MESSAGE = 'protocol_error';

export class GameRoom extends Room<{ state: GameRoomStateInstance }> {
  override maxClients = MAX_PLAYERS;
  #logger: GameLogger = consoleLogger;
  #playerIdBySession = new Map<string, string>();
  #commandOrderBySession = new Map<string, CommandOrder>();
  #fixedStep = new FixedStepAccumulator();

  override onCreate(options: RoomOptions) {
    this.#logger = options.logger ?? consoleLogger;
    this.setState(createGameRoomState());
    this.onMessage(COMMAND_MESSAGE, (client, message: unknown) => {
      this.#handleCommand(client, message);
    });
    this.setSimulationInterval((elapsedMilliseconds) => {
      this.#fixedStep.advance(elapsedMilliseconds, () => {
        this.state.players.forEach((player) => integratePlayerMovement(player));
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
    if (command.type !== 'move') return;
    const payload = command.payload as {
      readonly x: number;
      readonly z: number;
    };
    applyMovementInput(player, payload.x, payload.z, command.sequence);
  }
}
