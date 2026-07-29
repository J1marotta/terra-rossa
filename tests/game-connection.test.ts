import { describe, expect, it, vi } from 'vitest';

import {
  GameConnection,
  type RoomTransport,
} from '../client/src/multiplayer/GameConnection';
import {
  PlayerState,
  createGameRoomState,
  type GameRoomStateInstance,
} from '../shared/state';

function createFakeRoom() {
  const state = createGameRoomState();
  const player = new PlayerState();
  player.id = 'server-player-id';
  player.sessionId = 'local-session';
  player.displayName = 'Scout';
  player.x = 5;
  player.z = -3;
  player.lastProcessedSequence = 2;
  state.players.set(player.id, player);

  let stateListener: ((state: GameRoomStateInstance) => void) | undefined;
  let errorListener: ((code: number, message?: string) => void) | undefined;
  let leaveListener: ((code: number, reason?: string) => void) | undefined;
  const room: RoomTransport = {
    roomId: 'room-test',
    sessionId: 'local-session',
    state,
    onStateChange: vi.fn((listener) => {
      stateListener = listener;
    }),
    onError: vi.fn((listener) => {
      errorListener = listener;
    }),
    onLeave: vi.fn((listener) => {
      leaveListener = listener;
    }),
    removeAllListeners: vi.fn(),
    leave: vi.fn(async () => 1000),
    send: vi.fn(),
  };
  return {
    room,
    emitState: () => stateListener?.(state),
    emitError: (code: number, message?: string) =>
      errorListener?.(code, message),
    emitLeave: (code: number, reason?: string) => leaveListener?.(code, reason),
  };
}

describe('game connection', () => {
  it('publishes lifecycle and the server-owned local identity', async () => {
    const fake = createFakeRoom();
    const connection = new GameConnection(
      'ws://game.test',
      async () => fake.room,
    );
    const statuses: string[] = [];
    connection.subscribe((snapshot) => statuses.push(snapshot.status));

    await connection.connect();
    fake.emitState();

    expect(statuses).toEqual(['connecting', 'connected', 'connected']);
    expect(connection.getSnapshot().room?.players[0]).toEqual({
      id: 'server-player-id',
      displayName: 'Scout',
      isLocal: true,
      x: 5,
      z: -3,
      lastProcessedSequence: 2,
    });

    connection.disconnect();
    expect(fake.room.removeAllListeners).toHaveBeenCalledOnce();
    expect(fake.room.leave).toHaveBeenCalledWith(true);
    expect(connection.getSnapshot().status).toBe('closed');
  });

  it('sends ordered movement intent without client-authored position', async () => {
    const fake = createFakeRoom();
    const connection = new GameConnection(
      'ws://game.test',
      async () => fake.room,
    );
    await connection.connect();

    expect(connection.sendMovement(1, 0)).toBe(0);
    expect(connection.sendMovement(0, -1)).toBe(1);
    expect(fake.room.send).toHaveBeenCalledTimes(2);
    expect(fake.room.send).toHaveBeenLastCalledWith(
      'command',
      expect.objectContaining({
        roomId: 'room-test',
        sequence: 1,
        type: 'move',
        payload: { x: 0, z: -1 },
      }),
    );
    expect(fake.room.send).not.toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ position: expect.anything() }),
    );
    connection.disconnect();
  });

  it('ignores stale joins after disconnect and closes the late room', async () => {
    const fake = createFakeRoom();
    let resolveJoin: ((room: RoomTransport) => void) | undefined;
    const join = new Promise<RoomTransport>((resolve) => {
      resolveJoin = resolve;
    });
    const connection = new GameConnection('ws://game.test', () => join);

    const connecting = connection.connect();
    connection.disconnect();
    resolveJoin?.(fake.room);
    await connecting;

    expect(fake.room.removeAllListeners).toHaveBeenCalledOnce();
    expect(fake.room.leave).toHaveBeenCalledOnce();
    expect(connection.getSnapshot().status).toBe('closed');
  });

  it('provides an actionable error when the server cannot be reached', async () => {
    const connection = new GameConnection('ws://game.test', async () => {
      throw new Error('refused');
    });

    await connection.connect();

    expect(connection.getSnapshot()).toMatchObject({ status: 'failed' });
    expect(connection.getSnapshot().error).toContain('Start the game server');
    expect(connection.getSnapshot().error).toContain('ws://game.test');
  });

  it('reports unexpected room errors and closure reasons', async () => {
    const fake = createFakeRoom();
    const connection = new GameConnection(
      'ws://game.test',
      async () => fake.room,
    );
    await connection.connect();

    fake.emitError(4001, 'protocol mismatch');
    expect(connection.getSnapshot().error).toContain('protocol mismatch');
    fake.emitLeave(1006, 'network lost');
    expect(connection.getSnapshot()).toMatchObject({
      status: 'closed',
      error: 'Connection closed (1006): network lost',
    });
  });
});
