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
import { resolvePrivateRoom } from '../server/roomRegistry';

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
    await new Promise((resolve) => setTimeout(resolve, 100));

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

  it('gives four clients distinct position views and retracts concealed coordinates', async () => {
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
    const serverPlayers = clients.map((client) => {
      const player = [...room.state.players.values()].find(
        (candidate) => candidate.sessionId === client.sessionId,
      );
      if (player === undefined) throw new Error('Missing test player.');
      return player;
    });
    const positions = [
      [-10, -10],
      [-5, -10],
      [10, 10],
      [15, 10],
    ] as const;
    serverPlayers.forEach((player, index) => {
      const position = positions[index];
      if (position === undefined) throw new Error('Missing test position.');
      player.x = position[0];
      player.z = position[1];
    });
    room.state.phase = 'playing';
    await new Promise((resolve) => setTimeout(resolve, 120));

    const visibleIds = clients.map((client) =>
      [...client.state.players.values()]
        .filter(
          (player) => Number.isFinite(player.x) && Number.isFinite(player.z),
        )
        .map((player) => player.id)
        .sort(),
    );
    expect(visibleIds[0]).toEqual(
      [serverPlayers[0]?.id, serverPlayers[1]?.id].sort(),
    );
    expect(visibleIds[1]).toEqual(
      [serverPlayers[0]?.id, serverPlayers[1]?.id].sort(),
    );
    expect(visibleIds[2]).toEqual(
      [serverPlayers[2]?.id, serverPlayers[3]?.id].sort(),
    );
    expect(visibleIds[3]).toEqual(
      [serverPlayers[2]?.id, serverPlayers[3]?.id].sort(),
    );

    serverPlayers[1]!.x = 10;
    serverPlayers[1]!.z = -10;
    await new Promise((resolve) => setTimeout(resolve, 120));
    const firstViewOfSecond = [...clients[0]!.state.players.values()].find(
      (player) => player.id === serverPlayers[1]!.id,
    );
    expect(firstViewOfSecond?.x).toBeUndefined();
    expect(firstViewOfSecond?.z).toBeUndefined();
    await Promise.all(clients.map((client) => client.leave()));
  });

  it('creates a short private code and enforces ready host start rules', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const host = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Host',
    });
    const guest = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Guest',
    });
    expect(room.state.roomCode).toMatch(/^[A-Z2-9]{6}$/);
    const lookup = await testServer.http.get(`/rooms/${room.state.roomCode}`);
    expect(lookup.statusCode).toBe(200);
    expect(lookup.data).toMatchObject({ ok: true, roomId: room.roomId });
    const players = [...room.state.players.values()];
    const hostPlayer = players.find(
      (player) => player.sessionId === host.sessionId,
    );
    const guestPlayer = players.find(
      (player) => player.sessionId === guest.sessionId,
    );
    expect(hostPlayer?.id).toBe(room.state.hostPlayerId);
    expect(players.every((player) => !player.ready)).toBe(true);

    guest.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'ready', {
        ready: true,
      }),
    );
    guest.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'start', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(room.state.phase).toBe('lobby');
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'start', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(room.state.phase).toBe('lobby');
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'ready', {
        ready: true,
      }),
    );
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 3, 'start', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(room.state.phase).toBe('countdown');
    expect(room.state.startApprovedEvent).toBe(1);
    expect(guestPlayer?.ready).toBe(true);
    expect(
      new Set(
        [...room.state.players.values()].map((player) => player.spawnRegionId),
      ).size,
    ).toBe(2);
    const hostView = [...host.state.players.values()];
    const guestView = [...guest.state.players.values()];
    expect(
      hostView.find((player) => player.sessionId === host.sessionId)
        ?.spawnRegionId,
    ).toBeTruthy();
    expect(
      hostView.find((player) => player.sessionId === guest.sessionId)
        ?.spawnRegionId,
    ).toBeUndefined();
    expect(
      guestView.find((player) => player.sessionId === host.sessionId)
        ?.spawnRegionId,
    ).toBeUndefined();
    expect(
      guestView.find((player) => player.sessionId === guest.sessionId)
        ?.spawnRegionId,
    ).toBeTruthy();
    expect(resolvePrivateRoom(room.state.roomCode)?.closed).toBe(true);
    room.state.phase = 'round_over';
    host.send(
      COMMAND_MESSAGE,
      createCommand(
        { roomId: room.roomId, matchId: room.state.matchId },
        4,
        'rematch',
        {},
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(room.state.phase).toBe('lobby');
    expect(
      [...room.state.players.values()].every((player) => !player.ready),
    ).toBe(true);
    await Promise.all([host.leave(), guest.leave()]);
  });

  it.each([2, 3, 4])(
    'approves a fully ready %i-player lobby',
    async (count) => {
      const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
      const clients = [];
      for (let index = 0; index < count; index += 1) {
        clients.push(
          await testServer.connectTo(room, {
            protocolVersion: PROTOCOL_VERSION,
            displayName: `Ready ${index + 1}`,
          }),
        );
      }
      clients.forEach((client) => {
        client.send(
          COMMAND_MESSAGE,
          createCommand({ roomId: room.roomId, matchId: null }, 1, 'ready', {
            ready: true,
          }),
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 40));
      clients[0]?.send(
        COMMAND_MESSAGE,
        createCommand({ roomId: room.roomId, matchId: null }, 2, 'start', {}),
      );
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(room.state.phase).toBe('countdown');
      await Promise.all(clients.map((client) => client.leave()));
    },
  );

  it('transfers host and clears readiness when a lobby player leaves', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const host = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Host',
    });
    const guest = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Guest',
    });
    guest.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'ready', {
        ready: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    await host.leave();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const remaining = [...room.state.players.values()][0];
    expect(room.state.hostPlayerId).toBe(remaining?.id);
    expect(remaining?.ready).toBe(false);
    expect(room.state.phase).toBe('lobby');
    await guest.leave();
  });

  it('owns countdown, locks late joins, and rejects old-round commands', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME, {
      seed: 42,
    });
    const host = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Host',
    });
    const guest = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Guest',
    });
    for (const client of [host, guest]) {
      client.send(
        COMMAND_MESSAGE,
        createCommand({ roomId: room.roomId, matchId: null }, 1, 'ready', {
          ready: true,
        }),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'start', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    const firstMatchId = room.state.matchId;
    expect(room.state.phase).toBe('countdown');
    expect(firstMatchId).toMatch(/^round-1-/);
    const hostPlayer = [...room.state.players.values()].find(
      (player) => player.sessionId === host.sessionId,
    );
    expect(hostPlayer).toBeDefined();
    if (hostPlayer === undefined) return;
    const spawnX = hostPlayer.x;
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: firstMatchId }, 3, 'move', {
        x: 1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(hostPlayer.x).toBe(spawnX);
    await expect(
      testServer.connectTo(room, {
        protocolVersion: PROTOCOL_VERSION,
        displayName: 'Late',
      }),
    ).rejects.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 3_050));
    expect(room.state.phase).toBe('playing');
    expect(room.state.creatures.size).toBe(16);
    expect(room.state.creaturePopulation).toBe(16);
    expect(room.state.creatureUpdateMilliseconds).toBeGreaterThanOrEqual(0);
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 4, 'move', {
        x: 1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(hostPlayer.lastProcessedSequence).toBe(3);
    host.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: firstMatchId }, 4, 'move', {
        x: 1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(hostPlayer.x).toBeGreaterThan(spawnX);

    room.state.phase = 'round_over';
    host.send(
      COMMAND_MESSAGE,
      createCommand(
        { roomId: room.roomId, matchId: firstMatchId },
        5,
        'rematch',
        {},
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(room.state.phase).toBe('lobby');
    expect(room.state.matchId).toBe('');
    expect(room.locked).toBe(false);
    await Promise.all([host.leave(), guest.leave()]);
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
    room.state.phase = 'playing';
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
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(local()?.x).toBeGreaterThan(startX ?? Number.POSITIVE_INFINITY);
    expect(local()?.lastProcessedSequence).toBe(1);
    client.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'move', {
        x: -1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
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

  it('synchronizes a legal position only to its authorized owner view', async () => {
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
    room.state.phase = 'playing';
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
    expect(positions[0]).toBeTypeOf('number');
    expect(positions.slice(1)).toEqual([undefined, undefined, undefined]);
    expect(clients.every((client) => client.state.players.size === 4)).toBe(
      true,
    );
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
    room.state.phase = 'playing';
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
    room.state.phase = 'playing';
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

  it('resolves empty-gun melee after wind-up with knockback and recovery', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const attackerClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Brawler',
    });
    const targetClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Target',
    });
    room.state.phase = 'playing';
    const attacker = [...room.state.players.values()].find(
      (player) => player.sessionId === attackerClient.sessionId,
    );
    const target = [...room.state.players.values()].find(
      (player) => player.sessionId === targetClient.sessionId,
    );
    expect(attacker).toBeDefined();
    expect(target).toBeDefined();
    if (attacker === undefined || target === undefined) return;
    attacker.x = -20;
    attacker.z = -10;
    attacker.aimAngleRadians = 0;
    attacker.magazineAmmo = 0;
    target.x = -18.5;
    target.z = -10;
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'melee', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(attacker.meleeEvent).toBe(1);
    expect(attacker.meleeTargetId).toBe(target.id);
    expect(target.x).toBeGreaterThan(-18.5);
    expect(attacker.meleeRecoveryTicksRemaining).toBeGreaterThan(0);
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'melee', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(attacker.meleeEvent).toBe(1);

    attacker.meleeRecoveryTicksRemaining = 0;
    attacker.magazineAmmo = 3;
    attacker.reserveAmmo = 10;
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand(
        { roomId: room.roomId, matchId: null },
        3,
        'reload_start',
        {},
      ),
    );
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 4, 'melee', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(attacker.meleeEvent).toBe(1);
    await Promise.all([attackerClient.leave(), targetClient.leave()]);
  });

  it('eliminates exactly once at zero health and ignores dead input', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const attackerClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Attacker',
    });
    const targetClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Target',
    });
    room.state.phase = 'playing';
    const attacker = [...room.state.players.values()].find(
      (player) => player.sessionId === attackerClient.sessionId,
    );
    const target = [...room.state.players.values()].find(
      (player) => player.sessionId === targetClient.sessionId,
    );
    expect(attacker).toBeDefined();
    expect(target).toBeDefined();
    if (attacker === undefined || target === undefined) return;
    attacker.x = -20;
    attacker.z = -10;
    attacker.aimAngleRadians = 0;
    target.x = -15;
    target.z = -10;
    target.health = 20;
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(target.health).toBe(0);
    expect(target.alive).toBe(false);
    expect(target.eliminatedById).toBe(attacker.id);
    expect(target.eliminationEvent).toBe(1);
    expect(room.state.phase).toBe('round_over');
    expect(room.state.resultKind).toBe('winner');
    expect(room.state.winnerPlayerId).toBe(attacker.id);
    expect(room.state.resultEvent).toBe(1);

    const deadX = target.x;
    targetClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'move', {
        x: 1,
        z: 0,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(target.x).toBe(deadX);
    attacker.fireCooldownTicksRemaining = 0;
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 2, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(target.eliminationEvent).toBe(1);
    attackerClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 3, 'rematch', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(room.state.phase).toBe('lobby');
    expect(target.alive).toBe(true);
    expect(target.health).toBe(100);
    expect(target.magazineAmmo).toBe(8);
    expect(target.reserveAmmo).toBe(32);
    expect(target.eliminationEvent).toBe(0);
    await Promise.all([attackerClient.leave(), targetClient.leave()]);
  });

  it('resolves mutual lethal shots from the same simulation step', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const firstClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'First',
    });
    const secondClient = await testServer.connectTo(room, {
      protocolVersion: PROTOCOL_VERSION,
      displayName: 'Second',
    });
    room.state.phase = 'playing';
    const first = [...room.state.players.values()].find(
      (player) => player.sessionId === firstClient.sessionId,
    );
    const second = [...room.state.players.values()].find(
      (player) => player.sessionId === secondClient.sessionId,
    );
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;
    Object.assign(first, { x: -20, z: -10, aimAngleRadians: 0, health: 20 });
    Object.assign(second, {
      x: -15,
      z: -10,
      aimAngleRadians: Math.PI,
      health: 20,
    });
    firstClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'fire', {}),
    );
    secondClient.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'fire', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(first.alive).toBe(false);
    expect(second.alive).toBe(false);
    expect(first.eliminatedById).toBe(second.id);
    expect(second.eliminatedById).toBe(first.id);
    expect(room.state.phase).toBe('round_over');
    expect(room.state.resultKind).toBe('draw');
    expect(room.state.winnerPlayerId).toBe('');
    expect(room.state.resultEvent).toBe(1);
    await Promise.all([firstClient.leave(), secondClient.leave()]);
  });

  it.each([2, 3, 4])(
    'immediately forfeits active disconnects in a %i-player room',
    async (count) => {
      const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
      const clients = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          testServer.connectTo(room, {
            protocolVersion: PROTOCOL_VERSION,
            displayName: `Disconnect ${index + 1}`,
          }),
        ),
      );
      room.state.phase = 'playing';
      const departing = [...room.state.players.values()].find(
        (player) => player.sessionId === clients[0]?.sessionId,
      );
      expect(departing).toBeDefined();
      await clients[0]!.leave();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(departing).toMatchObject({
        connected: false,
        alive: false,
        eliminatedById: 'disconnect',
        disconnectEvent: 1,
      });
      if (count === 2) {
        expect(room.state.phase).toBe('round_over');
        expect(room.state.resultKind).toBe('winner');
        expect(room.state.hostPlayerId).not.toBe(departing?.id);
      } else {
        expect(room.state.phase).toBe('playing');
      }
      await Promise.all(clients.slice(1).map((client) => client.leave()));
    },
  );

  it('reevaluates multiple disconnects and removes forfeited dogs on rematch', async () => {
    const room = await testServer.createRoom<GameRoom>(GAME_ROOM_NAME);
    const clients = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        testServer.connectTo(room, {
          protocolVersion: PROTOCOL_VERSION,
          displayName: `Rematch ${index + 1}`,
        }),
      ),
    );
    room.state.phase = 'playing';
    await clients[0]!.leave();
    await clients[1]!.leave();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(room.state.phase).toBe('round_over');
    expect(room.state.players.size).toBe(3);
    const survivor = [...room.state.players.values()].find(
      (player) => player.connected,
    );
    expect(room.state.winnerPlayerId).toBe(survivor?.id);
    clients[2]!.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'rematch', {}),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(room.state.phase).toBe('lobby');
    expect([...room.state.players.values()]).toEqual([survivor]);
    expect(survivor).toMatchObject({ connected: true, alive: true });
    await clients[2]!.leave();
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
