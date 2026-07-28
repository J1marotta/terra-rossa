import { randomUUID } from 'node:crypto';

import { Room, ServerError, type Client } from '@colyseus/core';

import {
  MAX_PLAYERS,
  PROTOCOL_VERSION,
  type JoinOptions,
} from '../../shared/protocol';
import { consoleLogger, type GameLogger } from '../logger';
import { sanitizeDisplayName } from './displayName';
import {
  PlayerState,
  createGameRoomState,
  type GameRoomStateInstance,
} from './state';

interface RoomOptions {
  logger?: GameLogger;
}

export class GameRoom extends Room<{ state: GameRoomStateInstance }> {
  override maxClients = MAX_PLAYERS;
  #logger: GameLogger = consoleLogger;
  #playerIdBySession = new Map<string, string>();

  override onCreate(options: RoomOptions) {
    this.#logger = options.logger ?? consoleLogger;
    this.setState(createGameRoomState());
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
    this.#playerIdBySession.set(client.sessionId, playerId);
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
    this.#logger.info('room_disposed', { roomId: this.roomId });
  }
}
