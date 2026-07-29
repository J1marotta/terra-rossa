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
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(local()?.moveX).toBe(1);
    expect(local()?.lastProcessedSequence).toBe(1);
    client.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'dash', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(local()?.dashEvent).toBe(1);
    client.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 3, 'dash', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(local()?.dashEvent).toBe(1);
    expect(local()?.lastProcessedSequence).toBe(3);
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

  it('owns aim, ammunition, cadence, wall hits, and dry fire', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const shooterClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Shooter',
    });
    const targetClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Target',
    });
    const shooter = [...room.state.players.values()].find(
      (player) => player.sessionId === shooterClient.sessionId,
    );
    const target = [...room.state.players.values()].find(
      (player) => player.sessionId === targetClient.sessionId,
    );
    expect(shooter).toBeDefined();
    expect(target).toBeDefined();
    if (shooter === undefined || target === undefined) return;
    shooter.x = -20;
    shooter.z = -10;
    target.x = -15;
    target.z = -10;
    shooterClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'aim', {
        angleRadians: 0,
      }),
    );
    shooterClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(shooter.magazineAmmo).toBe(7);
    expect(shooter.shotEvent).toBe(1);
    expect(shooter.shotTargetId).toBe(target.id);

    shooterClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 3, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(shooter.magazineAmmo).toBe(7);
    expect(shooter.shotEvent).toBe(1);

    shooter.x = -28;
    shooter.z = 0;
    target.x = -20;
    target.z = 0;
    shooter.fireCooldownTicksRemaining = 0;
    shooterClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 4, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(shooter.shotTargetId).toBe('');
    expect(shooter.shotEndX).toBeCloseTo(-26.5, 4);

    shooter.magazineAmmo = 0;
    shooter.fireCooldownTicksRemaining = 0;
    shooterClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 5, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(shooter.dryFireEvent).toBe(1);
    expect(shooter.shotEvent).toBe(2);
    await Promise.all([shooterClient.leave(), targetClient.leave()]);
  });

  it('owns reload timing, blocks firing during commitment, and transfers rounds', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const client = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Reloader',
    });
    const player = [...room.state.players.values()].find(
      (candidate) => candidate.sessionId === client.sessionId,
    );
    expect(player).toBeDefined();
    if (player === undefined) return;
    player.magazineAmmo = 3;
    player.reserveAmmo = 10;
    client.send(
      COMMAND_MESSAGE,
      createCommand(
        { roomId: room.roomId, matchId: null },
        1,
        'reload_start',
        {},
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(player.reloadOutcome).toBe('normal');
    expect(player.reloadCompletionTick).toBeGreaterThan(0);
    client.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(player.magazineAmmo).toBe(3);
    expect(player.shotEvent).toBe(0);

    player.reloadTicksElapsed = 30;
    client.send(
      COMMAND_MESSAGE,
      createCommand(
        { roomId: room.roomId, matchId: null },
        3,
        'reload_attempt',
        { clientElapsedMilliseconds: 1_000 },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(player.reloadOutcome).toBe('perfect');
    expect(player.magazineAmmo).toBe(8);
    expect(player.reserveAmmo).toBe(5);
    expect(player.reloadCompletionTick).toBe(0);
    await client.leave();
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
