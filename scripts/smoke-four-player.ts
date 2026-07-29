import { ColyseusSDK } from '@colyseus/sdk';

import { createCommand } from '../shared/commands';
import {
  COMMAND_MESSAGE,
  GAME_ROOM_NAME,
  PROTOCOL_VERSION,
} from '../shared/protocol';
import { GameRoomState, type GameRoomStateInstance } from '../shared/state';

const endpoint = process.env.COLYSEUS_URL;
if (endpoint === undefined || new URL(endpoint).protocol !== 'wss:') {
  throw new Error('COLYSEUS_URL must be a hosted wss:// endpoint.');
}

interface HostedRoom {
  readonly roomId: string;
  readonly state: GameRoomStateInstance;
  send(type: string, message: unknown): void;
  leave(consented?: boolean): Promise<number>;
}

async function waitFor(
  description: string,
  condition: () => boolean,
  timeoutMilliseconds = 8_000,
) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!condition()) {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${description}.`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

const rooms: HostedRoom[] = [];
try {
  for (let index = 0; index < 4; index += 1) {
    const sdk = new ColyseusSDK(endpoint);
    rooms.push(
      (await sdk.joinOrCreate(
        GAME_ROOM_NAME,
        {
          protocolVersion: PROTOCOL_VERSION,
          displayName: `Hosted Dog ${index + 1}`,
        },
        GameRoomState,
      )) as HostedRoom,
    );
  }
  await waitFor('all four synchronized players', () =>
    rooms.every((room) => room.state.players.size === 4),
  );

  const firstState = rooms[0]?.state;
  if (firstState === undefined)
    throw new Error('First room state is unavailable.');
  const initial = [...firstState.players.values()].map((player) => ({
    id: player.id,
    x: player.x,
    z: player.z,
  }));
  if (new Set(initial.map((player) => `${player.x},${player.z}`)).size !== 4) {
    throw new Error('Hosted players did not receive four unique spawns.');
  }

  const directions = [
    { x: Math.SQRT1_2, z: Math.SQRT1_2 },
    { x: -Math.SQRT1_2, z: Math.SQRT1_2 },
    { x: -Math.SQRT1_2, z: -Math.SQRT1_2 },
    { x: Math.SQRT1_2, z: -Math.SQRT1_2 },
  ];
  rooms.forEach((room, index) => {
    const direction = directions[index];
    if (direction === undefined) throw new Error('Missing movement direction.');
    room.send(
      COMMAND_MESSAGE,
      createCommand(
        { roomId: room.roomId, matchId: null },
        0,
        'move',
        direction,
      ),
    );
    room.send(
      COMMAND_MESSAGE,
      createCommand({ roomId: room.roomId, matchId: null }, 1, 'dash', {}),
    );
  });

  await waitFor('four accepted hosted dashes', () =>
    rooms.every((room) =>
      [...room.state.players.values()].every(
        (player) => player.dashEvent === 1,
      ),
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 300));

  const reference = [...(rooms[0]?.state.players.values() ?? [])]
    .map((player) => ({ id: player.id, x: player.x, z: player.z }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    initial.some((start) => {
      const end = reference.find((player) => player.id === start.id);
      return (
        end === undefined || Math.hypot(end.x - start.x, end.z - start.z) < 1
      );
    })
  ) {
    throw new Error('At least one hosted dog failed to move authoritatively.');
  }
  for (const room of rooms.slice(1)) {
    const view = [...room.state.players.values()]
      .map((player) => ({ id: player.id, x: player.x, z: player.z }))
      .sort((left, right) => left.id.localeCompare(right.id));
    view.forEach((player, index) => {
      const expected = reference[index];
      if (
        expected === undefined ||
        player.id !== expected.id ||
        Math.hypot(player.x - expected.x, player.z - expected.z) > 0.01
      ) {
        throw new Error('Hosted clients disagree on authoritative positions.');
      }
    });
  }

  console.log(
    JSON.stringify({
      ok: true,
      clients: rooms.length,
      uniqueSpawns: 4,
      synchronizedPlayers: reference.length,
      dashEvents: 4,
    }),
  );
} finally {
  await Promise.allSettled(rooms.map((room) => room.leave(true)));
}
