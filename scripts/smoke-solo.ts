import { ColyseusSDK } from '@colyseus/sdk';

import { createCommand } from '../shared/commands';
import {
  COMMAND_MESSAGE,
  GAME_ROOM_NAME,
  PROTOCOL_VERSION,
} from '../shared/protocol';
import { GameRoomState } from '../shared/state';

const endpoint = process.env.COLYSEUS_URL;
if (endpoint === undefined || new URL(endpoint).protocol !== 'wss:') {
  throw new Error('COLYSEUS_URL must be a hosted wss:// endpoint.');
}

const room = await new ColyseusSDK(endpoint).create(
  GAME_ROOM_NAME,
  {
    protocolVersion: PROTOCOL_VERSION,
    displayName: 'Solo Smoke',
    soloTesting: true,
  },
  GameRoomState,
);

const waitFor = async (description: string, condition: () => boolean) => {
  const deadline = Date.now() + 8_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${description}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

try {
  await waitFor('solo room identity', () => room.state.players.size === 1);
  room.send(
    COMMAND_MESSAGE,
    createCommand({ roomId: room.roomId, matchId: null }, 0, 'ready', {
      ready: true,
    }),
  );
  room.send(
    COMMAND_MESSAGE,
    createCommand({ roomId: room.roomId, matchId: null }, 1, 'start', {}),
  );
  await waitFor(
    'solo countdown and play',
    () => room.state.phase === 'playing',
  );
  if (!room.state.soloTesting || room.state.creatures.size === 0) {
    throw new Error('Solo room did not populate the authoritative PvE slice.');
  }
  console.log(
    JSON.stringify({
      ok: true,
      soloTesting: room.state.soloTesting,
      players: room.state.players.size,
      creatures: room.state.creatures.size,
      pickups: room.state.pickups.size,
    }),
  );
} finally {
  await room.leave(true);
}
