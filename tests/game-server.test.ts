import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  COMMAND_MESSAGE,
  GAME_ROOM_NAME,
  PROTOCOL_VERSION,
} from '../shared/protocol';
import { resolveServerConfig } from '../server/config';
import { createGameServer } from '../server/index';
import type { GameLogger, LogFields } from '../server/logger';
import type { GameRoom } from '../server/rooms/GameRoom';

describe.sequential('minimal game server', () => {
  const events: Array<{ event: string; fields: LogFields | undefined }> = [];
  const logger: GameLogger = {
    info: (event, fields) => events.push({ event, fields }),
    error: (event, fields) => events.push({ event, fields }),
  };
  const config = resolveServerConfig({ APP_ENV: 'test' });
  let testServer: ColyseusTestServer;

  beforeAll(async () => {
    testServer = await boot(createGameServer(config, logger).gameServer);
  });

  afterAll(async () => {
    await testServer.cleanup();
    await testServer.shutdown();
  });

  it('reports usable health and version metadata', async () => {
    const response = await testServer.http.get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.data).toMatchObject({
      ok: true,
      service: 'terra-rossa-server',
      version: 'dev',
      environment: 'test',
      protocolVersion: PROTOCOL_VERSION,
    });
  });

  it('assigns sanitized, server-owned identities', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const first = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: '  Scout<script> ',
    });
    const nextPatch = room.waitForNextPatch();
    const second = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Luna',
    });
    await nextPatch;

    const players = Array.from(first.state.players.values());
    expect(players).toHaveLength(2);
    expect(new Set(players.map((player) => player.id)).size).toBe(2);
    const localPlayer = players.find(
      (player) => player.sessionId === first.sessionId,
    );
    expect(localPlayer?.id).toBeTruthy();
    expect(localPlayer?.id).not.toBe(first.sessionId);
    expect(localPlayer?.displayName).toBe('Scoutscript');

    await Promise.all([first.leave(), second.leave()]);
  });

  it('rejects a fifth client and incompatible protocols', async () => {
    const incompatibleRoom =
      await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    await expect(
      testServer.connectTo(incompatibleRoom, { protocolVersion: 'old-client' }),
    ).rejects.toThrow(`server requires ${PROTOCOL_VERSION}`);

    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const clients = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        testServer.connectTo(room, {
          protocolVersion: PROTOCOL_VERSION,
          displayName: `Dog ${index + 1}`,
        }),
      ),
    );
    await expect(
      testServer.connectTo(room, {
        protocolVersion: PROTOCOL_VERSION,
        displayName: 'Dog 5',
      }),
    ).rejects.toThrow();
    await Promise.all(clients.map((client) => client.leave()));
  });

  it('applies ordered movement commands and synchronizes acknowledgement', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const initialPatch = room.waitForNextPatch();
    const client = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Mover',
    });
    await initialPatch;
    const local = () =>
      Array.from(client.state.players.values()).find(
        (player) => player.sessionId === client.sessionId,
      );
    const startX = local()?.x;
    expect(startX).toBeTypeOf('number');
    client.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'move', {
        x: 1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(local()?.x).toBeGreaterThan(startX ?? Number.POSITIVE_INFINITY);
    expect(local()?.lastProcessedSequence).toBe(1);
    client.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'move', {
        x: -1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(local()?.moveX).toBe(1);
    expect(local()?.lastProcessedSequence).toBe(1);
    await client.leave();
  });

  it('synchronizes one legal position to four connected clients', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const clients = [];
    for (let index = 0; index < 4; index += 1) {
      clients.push(
        await testServer.connectTo(room, {
          protocolVersion: PROTOCOL_VERSION,
          displayName: `Viewer ${index + 1}`,
        }),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
    clients[0]?.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'move', {
        x: 1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));

    const movingSession = clients[0]?.sessionId;
    const positions = clients.map(
      (client) =>
        Array.from(client.state.players.values()).find(
          (player) => player.sessionId === movingSession,
        )?.x,
    );
    expect(positions.every((position) => typeof position === 'number')).toBe(
      true,
    );
    const numbers = positions.filter(
      (position): position is number => position !== undefined,
    );
    expect(Math.max(...numbers) - Math.min(...numbers)).toBeLessThan(0.001);
    await Promise.all(clients.map((client) => client.leave()));
  });

  it('disposes an empty room and records lifecycle events', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const roomId = room.roomId;
    const client = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Last Dog',
    });
    await client.leave();
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(testServer.getRoomById(roomId)).toBeUndefined();
    expect(events.map(({ event }) => event)).toEqual(
      expect.arrayContaining([
        'room_created',
        'player_joined',
        'player_left',
        'room_disposed',
      ]),
    );
  });
});
import { createCommand } from '../shared/commands';
