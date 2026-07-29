import { ColyseusSDK } from '@colyseus/sdk';

import { createCommand, type CommandType } from '../shared/commands';
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
const durationMilliseconds = Number(process.env.COMBAT_SMOKE_MS ?? 90_000);

interface HostedRoom {
  readonly roomId: string;
  readonly sessionId: string;
  readonly state: GameRoomStateInstance;
  send(type: string, message: unknown): void;
  leave(consented?: boolean): Promise<number>;
}

const rooms: HostedRoom[] = [];
const sequences = [0, 0, 0, 0];
const nextFireAt = [0, 0, 0, 0];
const nextMeleeAt = [0, 0, 0, 0];
const reloadStartedAt: Array<number | null> = [null, null, null, null];
const observed = {
  shots: 0,
  dryFires: 0,
  reloads: 0,
  melees: 0,
  damage: 0,
  eliminations: 0,
};
const previous = new Map<
  string,
  {
    shot: number;
    dry: number;
    reload: number;
    melee: number;
    health: number;
    death: number;
  }
>();

function send(
  room: HostedRoom,
  index: number,
  type: CommandType,
  payload: Record<string, unknown>,
) {
  const sequence = sequences[index] ?? 0;
  room.send(
    COMMAND_MESSAGE,
    createCommand(
      { roomId: room.roomId, matchId: null },
      sequence,
      type,
      payload as never,
    ),
  );
  sequences[index] = sequence + 1;
}

try {
  for (let index = 0; index < 4; index += 1) {
    rooms.push(
      (await new ColyseusSDK(endpoint).joinOrCreate(
        GAME_ROOM_NAME,
        {
          protocolVersion: PROTOCOL_VERSION,
          displayName: `Combat Gate ${index + 1}`,
        },
        GameRoomState,
      )) as HostedRoom,
    );
  }
  const deadline = Date.now() + 8_000;
  while (!rooms.every((room) => room.state.players.size === 4)) {
    if (Date.now() > deadline)
      throw new Error('Four combat clients did not synchronize.');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  const destinations = [
    { x: -9, z: -7 },
    { x: 9, z: -7 },
    { x: 9, z: 7 },
    { x: -9, z: 7 },
  ];
  const startedAt = Date.now();
  while (Date.now() - startedAt < durationMilliseconds) {
    const now = Date.now();
    const authoritative = rooms[0]?.state;
    if (authoritative === undefined)
      throw new Error('Combat state disappeared.');
    for (const player of authoritative.players.values()) {
      const before = previous.get(player.id);
      if (before !== undefined) {
        observed.shots += player.shotEvent - before.shot;
        observed.dryFires += player.dryFireEvent - before.dry;
        observed.reloads += player.reloadEvent - before.reload;
        observed.melees += player.meleeEvent - before.melee;
        if (player.health < before.health) observed.damage += 1;
        observed.eliminations += player.eliminationEvent - before.death;
      }
      previous.set(player.id, {
        shot: player.shotEvent,
        dry: player.dryFireEvent,
        reload: player.reloadEvent,
        melee: player.meleeEvent,
        health: player.health,
        death: player.eliminationEvent,
      });
    }

    rooms.forEach((room, index) => {
      const local = [...room.state.players.values()].find(
        (player) => player.sessionId === room.sessionId,
      );
      if (local === undefined || !local.alive) return;
      const opponents = [...room.state.players.values()].filter(
        (player) => player.id !== local.id && player.alive,
      );
      const nearest = opponents.sort(
        (left, right) =>
          Math.hypot(left.x - local.x, left.z - local.z) -
          Math.hypot(right.x - local.x, right.z - local.z),
      )[0];
      const destination = destinations[index];
      if (destination === undefined) return;
      const elapsed = now - startedAt;
      const targetPoint =
        elapsed < 9_000 || nearest === undefined ? destination : nearest;
      const deltaX = targetPoint.x - local.x;
      const deltaZ = targetPoint.z - local.z;
      const magnitude = Math.hypot(deltaX, deltaZ);
      send(room, index, 'move', {
        x: magnitude > 0.5 ? deltaX / magnitude : 0,
        z: magnitude > 0.5 ? deltaZ / magnitude : 0,
      });
      if (nearest !== undefined) {
        send(room, index, 'aim', {
          angleRadians: Math.atan2(nearest.z - local.z, nearest.x - local.x),
        });
      }
      if (local.reloadCompletionTick > 0) {
        const reloadAt = reloadStartedAt[index];
        if (
          reloadAt != null &&
          !local.reloadAttempted &&
          now - reloadAt >= 1_000
        ) {
          send(room, index, 'reload_attempt', {
            clientElapsedMilliseconds: now - reloadAt,
          });
          reloadStartedAt[index] = null;
        }
      } else if (local.magazineAmmo === 0 && local.reserveAmmo > 0) {
        send(room, index, 'reload_start', {});
        reloadStartedAt[index] = now;
      } else if (now >= (nextFireAt[index] ?? 0)) {
        send(room, index, 'fire', {});
        nextFireAt[index] = now + 280;
      }
      if (now >= (nextMeleeAt[index] ?? 0)) {
        send(room, index, 'melee', {});
        nextMeleeAt[index] = now + 700;
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (observed.shots < 8)
    throw new Error('Combat gate observed too few shots.');
  if (observed.reloads < 2)
    throw new Error('Combat gate observed no completed reload flow.');
  if (observed.melees < 4)
    throw new Error('Combat gate observed too few melee events.');
  if (observed.damage < 1)
    throw new Error('Combat gate observed no player damage.');
  console.log(JSON.stringify({ ok: true, durationMilliseconds, ...observed }));
} finally {
  await Promise.allSettled(rooms.map((room) => room.leave(true)));
}
