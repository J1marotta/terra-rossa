import { ColyseusSDK } from '@colyseus/sdk';

import {
  COMMAND_MESSAGE,
  GAME_ROOM_NAME,
  PROTOCOL_VERSION,
  type JoinOptions,
} from '../../../shared/protocol';
import { createCommand } from '../../../shared/commands';
import {
  GameRoomState,
  type GameRoomStateInstance,
} from '../../../shared/state';
import type { ConnectionSnapshot } from './types';
import { adaptRoomState } from './viewAdapter';

type Listener = (snapshot: ConnectionSnapshot) => void;

export interface RoomTransport {
  readonly roomId: string;
  readonly sessionId: string;
  readonly state: GameRoomStateInstance;
  onStateChange(callback: (state: GameRoomStateInstance) => void): unknown;
  onError(callback: (code: number, message?: string) => void): unknown;
  onLeave(callback: (code: number, reason?: string) => void): unknown;
  removeAllListeners(): void;
  leave(consented?: boolean): Promise<number>;
  send(type: string, message: unknown): void;
}

export type JoinRoom = (options: JoinOptions) => Promise<RoomTransport>;

const IDLE: ConnectionSnapshot = Object.freeze({
  status: 'idle',
  room: null,
  error: null,
});

export function createJoinRoom(endpoint: string): JoinRoom {
  const sdk = new ColyseusSDK(endpoint);
  return async (options) =>
    sdk.joinOrCreate(GAME_ROOM_NAME, options, GameRoomState);
}

export class GameConnection {
  readonly #endpoint: string;
  readonly #joinRoom: JoinRoom;
  readonly #listeners = new Set<Listener>();
  #snapshot = IDLE;
  #room: RoomTransport | null = null;
  #generation = 0;
  #nextSequence = 0;

  constructor(endpoint: string, joinRoom: JoinRoom = createJoinRoom(endpoint)) {
    this.#endpoint = endpoint;
    this.#joinRoom = joinRoom;
  }

  getSnapshot = () => this.#snapshot;

  subscribe = (listener: Listener) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  async connect(displayName = 'Scout') {
    if (this.#snapshot.status === 'connecting' || this.#room !== null) return;
    const generation = ++this.#generation;
    this.#publish({ status: 'connecting', room: null, error: null });

    try {
      const room = await this.#joinRoom({
        protocolVersion: PROTOCOL_VERSION,
        displayName,
      });
      if (generation !== this.#generation) {
        room.removeAllListeners();
        await room.leave(true);
        return;
      }
      this.#room = room;
      this.#nextSequence = 0;
      const publishState = (state: GameRoomStateInstance) => {
        if (generation !== this.#generation) return;
        this.#publish({
          status: 'connected',
          room: adaptRoomState(state, room.sessionId),
          error: null,
        });
      };
      room.onStateChange(publishState);
      room.onError((code, message) => {
        if (generation !== this.#generation) return;
        this.#publish({
          status: 'failed',
          room: null,
          error: `Connection error ${code} from ${this.#endpoint}: ${message ?? 'No details supplied.'}`,
        });
      });
      room.onLeave((code, reason) => {
        if (generation !== this.#generation) return;
        this.#room = null;
        this.#publish({
          status: 'closed',
          room: null,
          error:
            code === 1000
              ? null
              : `Connection closed (${code}): ${reason ?? 'Start the server and reload Chrome.'}`,
        });
      });
      publishState(room.state);
    } catch (error) {
      if (generation !== this.#generation) return;
      const detail = error instanceof Error ? error.message : String(error);
      this.#publish({
        status: 'failed',
        room: null,
        error: `Could not connect to ${this.#endpoint}. Start the game server, then reload Chrome. ${detail}`,
      });
    }
  }

  disconnect() {
    ++this.#generation;
    const room = this.#room;
    this.#room = null;
    if (room !== null) {
      room.removeAllListeners();
      void room.leave(true);
    }
    this.#publish({ status: 'closed', room: null, error: null });
  }

  sendMovement = (x: number, z: number) => {
    const room = this.#room;
    if (room === null || this.#snapshot.status !== 'connected') return null;
    const sequence = this.#nextSequence;
    const command = createCommand(
      { roomId: room.roomId, matchId: null },
      sequence,
      'move',
      { x, z },
    );
    room.send(COMMAND_MESSAGE, command);
    this.#nextSequence += 1;
    return sequence;
  };

  sendDash = () => {
    const room = this.#room;
    if (room === null || this.#snapshot.status !== 'connected') return null;
    const sequence = this.#nextSequence;
    const command = createCommand(
      { roomId: room.roomId, matchId: null },
      sequence,
      'dash',
      {},
    );
    room.send(COMMAND_MESSAGE, command);
    this.#nextSequence += 1;
    return sequence;
  };

  sendAim = (angleRadians: number) => {
    const room = this.#room;
    if (room === null || this.#snapshot.status !== 'connected') return null;
    const sequence = this.#nextSequence;
    const command = createCommand(
      { roomId: room.roomId, matchId: null },
      sequence,
      'aim',
      { angleRadians },
    );
    room.send(COMMAND_MESSAGE, command);
    this.#nextSequence += 1;
    return sequence;
  };

  sendFire = () => {
    const room = this.#room;
    if (room === null || this.#snapshot.status !== 'connected') return null;
    const sequence = this.#nextSequence;
    const command = createCommand(
      { roomId: room.roomId, matchId: null },
      sequence,
      'fire',
      {},
    );
    room.send(COMMAND_MESSAGE, command);
    this.#nextSequence += 1;
    return sequence;
  };

  #publish(snapshot: ConnectionSnapshot) {
    this.#snapshot = Object.freeze(snapshot);
    this.#listeners.forEach((listener) => listener(this.#snapshot));
  }
}
