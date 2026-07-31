import { ColyseusSDK } from '@colyseus/sdk';

import { GAME_ROOM_NAME, PROTOCOL_VERSION } from '../shared/protocol';
import { GameRoomState } from '../shared/state';

function requiredUrl(
  name: string,
  value: string | undefined,
  protocol: string,
) {
  if (value === undefined) throw new Error(`${name} is required.`);
  const url = new URL(value);
  if (url.protocol !== protocol) {
    throw new Error(`${name} must use ${protocol}//.`);
  }
  return url.toString().replace(/\/$/, '');
}

const healthUrl = requiredUrl('HEALTH_URL', process.env.HEALTH_URL, 'https:');
const websocketUrl = requiredUrl(
  'COLYSEUS_URL',
  process.env.COLYSEUS_URL,
  'wss:',
);

const response = await fetch(`${healthUrl}/health`);
if (!response.ok)
  throw new Error(`Health check failed with ${response.status}.`);
const health = (await response.json()) as {
  ok?: boolean;
  protocolVersion?: string;
  version?: string;
};
if (!health.ok || health.protocolVersion !== PROTOCOL_VERSION) {
  throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
}
const expectedVersion = process.env.EXPECTED_VERSION;
if (expectedVersion !== undefined && health.version !== expectedVersion) {
  throw new Error(
    `Server version ${String(health.version)} does not match expected ${expectedVersion}.`,
  );
}

const sdk = new ColyseusSDK(websocketUrl);
const room = await sdk.joinOrCreate(
  GAME_ROOM_NAME,
  { protocolVersion: PROTOCOL_VERSION, displayName: 'Deploy Smoke' },
  GameRoomState,
);
const findLocalPlayer = () =>
  [...room.state.players.values()].find(
    (candidate) => candidate.sessionId === room.sessionId,
  );
const player =
  findLocalPlayer() ??
  (await new Promise<ReturnType<typeof findLocalPlayer>>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for server identity.')),
      5_000,
    );
    room.onStateChange(() => {
      const synchronizedPlayer = findLocalPlayer();
      if (synchronizedPlayer === undefined) return;
      clearTimeout(timeout);
      resolve(synchronizedPlayer);
    });
  }));
if (player === undefined)
  throw new Error('Server identity was not synchronized.');

console.log(
  JSON.stringify({
    ok: true,
    service: 'terra-rossa-server',
    version: health.version,
    protocolVersion: health.protocolVersion,
    playerId: player.id,
  }),
);
await room.leave(true);
