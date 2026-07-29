import { ColyseusSDK } from '@colyseus/sdk';

import { createCommand, type CommandType } from '../shared/commands';
import type { WorldPoint } from '../shared/coordinates';
import { TERRA_ROSSA_MAP } from '../shared/map';
import {
  COMMAND_MESSAGE,
  GAME_ROOM_NAME,
  PROTOCOL_VERSION,
} from '../shared/protocol';
import { SeededRandom } from '../shared/random';
import { GameRoomState, type GameRoomStateInstance } from '../shared/state';

const endpoint = process.env.COLYSEUS_URL;
if (
  endpoint === undefined ||
  !['ws:', 'wss:'].includes(new URL(endpoint).protocol)
)
  throw new Error('COLYSEUS_URL must be a ws:// or wss:// endpoint.');

const repeats = Number(process.env.MATCH_HARNESS_REPEATS ?? 2);
const playerCount = Number(process.env.MATCH_HARNESS_PLAYERS ?? 4);
const latencyMilliseconds = Number(process.env.MATCH_HARNESS_LATENCY_MS ?? 0);
const jitterMilliseconds = Number(process.env.MATCH_HARNESS_JITTER_MS ?? 0);
const seed = Number(process.env.MATCH_HARNESS_SEED ?? 7305);
const random = new SeededRandom(seed);
if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4)
  throw new Error('MATCH_HARNESS_PLAYERS must be 2, 3, or 4.');

interface HarnessRoom {
  readonly roomId: string;
  readonly sessionId: string;
  readonly state: GameRoomStateInstance;
  send(type: string, message: unknown): void;
  leave(consented?: boolean): Promise<number>;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(
  description: string,
  condition: () => boolean,
  timeoutMilliseconds = 12_000,
) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!condition()) {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${description}.`);
    await wait(25);
  }
}

async function runMatch(iteration: number) {
  const clients: HarnessRoom[] = [];
  const sequences = [0, 0, 0, 0];
  let reveals = 0;
  let combatEvents = 0;
  const send = async (
    index: number,
    type: CommandType,
    payload: Record<string, unknown>,
  ) => {
    const room = clients[index];
    if (room === undefined) throw new Error('Missing harness client.');
    const delay =
      latencyMilliseconds +
      (jitterMilliseconds === 0
        ? 0
        : random.nextInteger(-jitterMilliseconds, jitterMilliseconds + 1));
    if (delay > 0) await wait(delay);
    const sequence = sequences[index] ?? 0;
    room.send(
      COMMAND_MESSAGE,
      createCommand(
        {
          roomId: room.roomId,
          matchId: room.state.matchId || null,
        },
        sequence,
        type,
        payload as never,
      ),
    );
    sequences[index] = sequence + 1;
  };

  try {
    const hostSdk = new ColyseusSDK(endpoint);
    clients.push(
      (await hostSdk.create(
        GAME_ROOM_NAME,
        {
          protocolVersion: PROTOCOL_VERSION,
          displayName: `Harness ${iteration}-1`,
        },
        GameRoomState,
      )) as HarnessRoom,
    );
    for (let index = 1; index < playerCount; index += 1) {
      clients.push(
        (await new ColyseusSDK(endpoint).joinById(
          clients[0]!.roomId,
          {
            protocolVersion: PROTOCOL_VERSION,
            displayName: `Harness ${iteration}-${index + 1}`,
          },
          GameRoomState,
        )) as HarnessRoom,
      );
    }
    await waitFor(`${playerCount} public roster entries`, () =>
      clients.every((room) => room.state.players.size === playerCount),
    );
    clients.forEach((room) => {
      const positioned = [...room.state.players.values()].filter(
        (player) => Number.isFinite(player.x) && Number.isFinite(player.z),
      );
      if (
        positioned.length !== 1 ||
        positioned[0]?.sessionId !== room.sessionId
      )
        throw new Error('Initial hidden-position assertion failed.');
    });
    await Promise.all(
      clients.map((_room, index) => send(index, 'ready', { ready: true })),
    );
    await waitFor('all ready', () =>
      clients.every((room) =>
        [...room.state.players.values()].every((player) => player.ready),
      ),
    );
    await send(0, 'start', {});
    await waitFor(
      'authoritative countdown and play',
      () => clients.every((room) => room.state.phase === 'playing'),
      6_000,
    );

    const waypointIndexes = [0, 0, 0, 0];
    const patrol: readonly WorldPoint[] = [
      { x: -9, z: -7 },
      { x: 9, z: -7 },
      { x: 9, z: 7 },
      { x: -9, z: 7 },
    ];
    let patrolIndex = 0;
    let nextFireAt = 0;
    const deadline = Date.now() + 55_000;
    while (clients[0]!.state.phase === 'playing' && Date.now() < deadline) {
      for (let index = 0; index < clients.length; index += 1) {
        const room = clients[index]!;
        const local = [...room.state.players.values()].find(
          (player) => player.sessionId === room.sessionId,
        );
        if (local === undefined || !local.alive) continue;
        const spawn = TERRA_ROSSA_MAP.spawns.find(
          (candidate) => candidate.id === local.spawnRegionId,
        );
        const route = spawn?.routes[0];
        let destination = route?.waypoints[waypointIndexes[index] ?? 0];
        if (
          destination !== undefined &&
          Math.hypot(destination.x - local.x, destination.z - local.z) < 0.8
        ) {
          waypointIndexes[index] = (waypointIndexes[index] ?? 0) + 1;
          destination = route?.waypoints[waypointIndexes[index] ?? 0];
        }
        const opponents = [...room.state.players.values()].filter(
          (player) =>
            player.id !== local.id &&
            player.alive &&
            Number.isFinite(player.x) &&
            Number.isFinite(player.z),
        );
        if (opponents.length > 0) reveals += 1;
        if (index === 0 && destination === undefined) {
          const nearest = opponents.sort(
            (left, right) =>
              Math.hypot(left.x - local.x, left.z - local.z) -
              Math.hypot(right.x - local.x, right.z - local.z),
          )[0];
          destination = nearest ?? patrol[patrolIndex];
          if (
            nearest === undefined &&
            destination !== undefined &&
            Math.hypot(destination.x - local.x, destination.z - local.z) < 1
          ) {
            patrolIndex = (patrolIndex + 1) % patrol.length;
            destination = patrol[patrolIndex];
          }
          if (nearest !== undefined) {
            await send(index, 'aim', {
              angleRadians: Math.atan2(
                nearest.z - local.z,
                nearest.x - local.x,
              ),
            });
            if (local.magazineAmmo === 0 && local.reserveAmmo > 0) {
              if (local.reloadCompletionTick === 0)
                await send(index, 'reload_start', {});
            } else if (
              local.reloadCompletionTick === 0 &&
              Date.now() >= nextFireAt
            ) {
              await send(index, 'fire', {});
              nextFireAt = Date.now() + 280;
              combatEvents += 1;
            }
          }
        }
        const deltaX = (destination?.x ?? local.x) - local.x;
        const deltaZ = (destination?.z ?? local.z) - local.z;
        const distance = Math.hypot(deltaX, deltaZ);
        await send(index, 'move', {
          x: distance > 0.75 ? deltaX / distance : 0,
          z: distance > 0.75 ? deltaZ / distance : 0,
        });
      }
      await wait(50);
    }
    if (clients[0]!.state.phase !== 'round_over')
      throw new Error('Four-client match did not produce a result.');
    const outcome = `${clients[0]!.state.resultKind}:${clients[0]!.state.winnerPlayerId}`;
    if (
      clients.some(
        (room) =>
          `${room.state.resultKind}:${room.state.winnerPlayerId}` !== outcome,
      )
    )
      throw new Error('Clients disagreed on the public match result.');
    if (reveals === 0 || combatEvents === 0)
      throw new Error('Harness did not exercise visibility and combat.');
    await send(0, 'rematch', {});
    await waitFor('clean rematch lobby', () =>
      clients.every(
        (room) =>
          room.state.phase === 'lobby' &&
          [...room.state.players.values()].every(
            (player) => player.alive && player.connected && !player.ready,
          ),
      ),
    );
    return { iteration, outcome, reveals, combatEvents };
  } finally {
    await Promise.allSettled(clients.map((room) => room.leave(true)));
  }
}

const results = [];
for (let iteration = 1; iteration <= repeats; iteration += 1) {
  results.push(await runMatch(iteration));
}
console.log(
  JSON.stringify({
    ok: true,
    seed,
    repeats,
    playerCount,
    latencyMilliseconds,
    jitterMilliseconds,
    results,
  }),
);
