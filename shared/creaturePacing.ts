import { SPITTER, SWARMER, type CreatureSpawn } from './creatures';
import type { WorldPoint } from './coordinates';
import { SeededRandom } from './random';

export const NORMAL_CREATURE_BUDGET = 16;
export const STRESS_CREATURE_BUDGET = 48;
export const CREATURE_PLAYER_SAFETY_METRES = 5;

export interface CreatureSpawnZone {
  readonly id: string;
  readonly region: 'northwest' | 'northeast' | 'southeast' | 'southwest';
  readonly points: readonly WorldPoint[];
}

const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-3, -2],
  [0, -3],
  [3, -2],
  [-4, 0],
  [4, 0],
  [-3, 2],
  [0, 3],
  [3, 2],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

const zone = (
  id: string,
  region: CreatureSpawnZone['region'],
  centerX: number,
  centerZ: number,
): CreatureSpawnZone =>
  Object.freeze({
    id,
    region,
    points: Object.freeze(
      OFFSETS.map(([offsetX, offsetZ]) =>
        Object.freeze({ x: centerX + offsetX, z: centerZ + offsetZ }),
      ),
    ),
  });

export const CREATURE_SPAWN_ZONES: readonly CreatureSpawnZone[] = Object.freeze(
  [
    zone('northwest-pressure', 'northwest', -15, -10),
    zone('northeast-pressure', 'northeast', 15, -10),
    zone('southeast-pressure', 'southeast', 15, 10),
    zone('southwest-pressure', 'southwest', -15, 10),
  ],
);

export interface CreaturePacingPlayer {
  readonly x: number;
  readonly z: number;
}

export interface PlannedCreatureSpawn extends CreatureSpawn {
  readonly zoneId: string;
}

export function planCreaturePopulation(
  players: readonly CreaturePacingPlayer[],
  seed: number,
  budget = NORMAL_CREATURE_BUDGET,
) {
  const random = new SeededRandom(seed);
  const perZone = Math.ceil(budget / CREATURE_SPAWN_ZONES.length);
  const planned: PlannedCreatureSpawn[] = [];
  CREATURE_SPAWN_ZONES.forEach((spawnZone) => {
    const available = spawnZone.points
      .filter((point) =>
        players.every(
          (player) =>
            Math.hypot(point.x - player.x, point.z - player.z) >=
            CREATURE_PLAYER_SAFETY_METRES,
        ),
      )
      .map((point) => ({ point, order: random.nextFloat() }))
      .sort((left, right) => left.order - right.order)
      .slice(0, perZone);
    available.forEach(({ point }) => {
      if (planned.length >= budget) return;
      const definition = planned.length % 4 === 3 ? SPITTER : SWARMER;
      planned.push({
        id: `creature-${planned.length}`,
        kind: definition.kind,
        x: point.x,
        z: point.z,
        collisionRadius: definition.collisionRadius,
        speedMetresPerSecond: definition.speedMetresPerSecond,
        maximumHealth: definition.maximumHealth,
        zoneId: spawnZone.id,
      });
    });
  });
  return Object.freeze(planned);
}
