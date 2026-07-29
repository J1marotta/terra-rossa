import { requireWorldPoint, type WorldPoint } from './coordinates';
import { requireNumberInRange } from './numeric';

export interface MapBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface CollisionObstacle {
  readonly id: string;
  readonly center: WorldPoint;
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly height: number;
  readonly color: string;
  readonly visualCap: boolean;
  readonly centralCover: boolean;
}

export interface SpawnRoute {
  readonly id: string;
  readonly waypoints: readonly WorldPoint[];
}

export interface SpawnRegion {
  readonly id: string;
  readonly center: WorldPoint;
  readonly radius: number;
  readonly routes: readonly SpawnRoute[];
}

export interface AuthoredMap {
  readonly id: string;
  readonly bounds: MapBounds;
  readonly conflictBounds: MapBounds;
  readonly obstacles: readonly CollisionObstacle[];
  readonly spawns: readonly SpawnRegion[];
}

export interface MapVisualPrimitive {
  readonly sourceObstacleId: string;
  readonly center: WorldPoint;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly elevation: number;
  readonly color: string;
}

const obstacle = (
  id: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  color: string,
  options: { visualCap?: boolean; centralCover?: boolean } = {},
): CollisionObstacle =>
  Object.freeze({
    id,
    center: Object.freeze({ x, z }),
    halfWidth: width / 2,
    halfDepth: depth / 2,
    height,
    color,
    visualCap: options.visualCap ?? true,
    centralCover: options.centralCover ?? false,
  });

const route = (
  id: string,
  points: ReadonlyArray<readonly [number, number]>,
): SpawnRoute =>
  Object.freeze({
    id,
    waypoints: Object.freeze(points.map(([x, z]) => Object.freeze({ x, z }))),
  });

export const TERRA_ROSSA_MAP: AuthoredMap = Object.freeze({
  id: 'red_hollow_v1',
  bounds: Object.freeze({ minX: -30, maxX: 30, minZ: -22, maxZ: 22 }),
  conflictBounds: Object.freeze({ minX: -10, maxX: 10, minZ: -8, maxZ: 8 }),
  obstacles: Object.freeze([
    obstacle('north-screen', 0, -17, 8, 3, 3.2, '#4d3138'),
    obstacle('east-screen', 25, 0, 3, 8, 3.2, '#53343b'),
    obstacle('south-screen', 0, 17, 8, 3, 3.2, '#4d3138'),
    obstacle('west-screen', -25, 0, 3, 8, 3.2, '#53343b'),
    obstacle('centre-ruin', 0, 0, 5, 4, 2.8, '#6b3c3d', {
      centralCover: true,
    }),
    obstacle('centre-northwest', -6.5, -4.5, 3, 2.5, 2.2, '#49353e', {
      centralCover: true,
    }),
    obstacle('centre-southeast', 6.5, 4.5, 3, 2.5, 2.2, '#49353e', {
      centralCover: true,
    }),
  ]),
  spawns: Object.freeze([
    Object.freeze({
      id: 'northwest',
      center: Object.freeze({ x: -25, z: -17 }),
      radius: 2,
      routes: Object.freeze([
        route('northwest-north', [
          [-18, -13],
          [-10, -9],
          [0, -7],
        ]),
        route('northwest-west', [
          [-21, -9],
          [-14, -2],
          [-9, 0],
        ]),
      ]),
    }),
    Object.freeze({
      id: 'northeast',
      center: Object.freeze({ x: 25, z: -17 }),
      radius: 2,
      routes: Object.freeze([
        route('northeast-north', [
          [18, -13],
          [10, -9],
          [0, -7],
        ]),
        route('northeast-east', [
          [21, -9],
          [14, -2],
          [9, 0],
        ]),
      ]),
    }),
    Object.freeze({
      id: 'southeast',
      center: Object.freeze({ x: 25, z: 17 }),
      radius: 2,
      routes: Object.freeze([
        route('southeast-south', [
          [18, 13],
          [10, 9],
          [0, 7],
        ]),
        route('southeast-east', [
          [21, 9],
          [14, 2],
          [9, 0],
        ]),
      ]),
    }),
    Object.freeze({
      id: 'southwest',
      center: Object.freeze({ x: -25, z: 17 }),
      radius: 2,
      routes: Object.freeze([
        route('southwest-south', [
          [-18, 13],
          [-10, 9],
          [0, 7],
        ]),
        route('southwest-west', [
          [-21, 9],
          [-14, 2],
          [-9, 0],
        ]),
      ]),
    }),
  ]),
});

export function pointInsideBounds(point: WorldPoint, bounds: MapBounds) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.z >= bounds.minZ &&
    point.z <= bounds.maxZ
  );
}

export function pointInsideObstacle(
  point: WorldPoint,
  obstacle: CollisionObstacle,
) {
  return (
    point.x >= obstacle.center.x - obstacle.halfWidth &&
    point.x <= obstacle.center.x + obstacle.halfWidth &&
    point.z >= obstacle.center.z - obstacle.halfDepth &&
    point.z <= obstacle.center.z + obstacle.halfDepth
  );
}

export function segmentIntersectsObstacle(
  start: WorldPoint,
  end: WorldPoint,
  obstacle: CollisionObstacle,
) {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  let minimum = 0;
  let maximum = 1;
  const axes: ReadonlyArray<readonly [number, number, number, number]> = [
    [
      start.x,
      deltaX,
      obstacle.center.x - obstacle.halfWidth,
      obstacle.center.x + obstacle.halfWidth,
    ],
    [
      start.z,
      deltaZ,
      obstacle.center.z - obstacle.halfDepth,
      obstacle.center.z + obstacle.halfDepth,
    ],
  ];
  for (const [origin, delta, lower, upper] of axes) {
    if (delta === 0) {
      if (origin < lower || origin > upper) return false;
      continue;
    }
    const first = (lower - origin) / delta;
    const second = (upper - origin) / delta;
    minimum = Math.max(minimum, Math.min(first, second));
    maximum = Math.min(maximum, Math.max(first, second));
    if (minimum > maximum) return false;
  }
  return true;
}

export function hasDirectSightline(
  map: AuthoredMap,
  start: WorldPoint,
  end: WorldPoint,
) {
  return !map.obstacles.some((item) =>
    segmentIntersectsObstacle(start, end, item),
  );
}

export function createMapVisuals(
  map: AuthoredMap,
): readonly MapVisualPrimitive[] {
  return Object.freeze(
    map.obstacles.flatMap((item) => {
      const width = item.halfWidth * 2;
      const depth = item.halfDepth * 2;
      const base: MapVisualPrimitive = Object.freeze({
        sourceObstacleId: item.id,
        center: item.center,
        width,
        depth,
        height: item.height,
        elevation: item.height / 2,
        color: item.color,
      });
      if (!item.visualCap) return [base];
      return [
        base,
        Object.freeze({
          sourceObstacleId: item.id,
          center: item.center,
          width: Math.max(0.2, width - 0.35),
          depth: Math.max(0.2, depth - 0.35),
          height: 0.18,
          elevation: item.height + 0.09,
          color: '#8a5960',
        }),
      ];
    }),
  );
}

export function validateAuthoredMap(map: AuthoredMap): readonly string[] {
  const errors: string[] = [];
  const obstacleIds = new Set<string>();
  for (const item of map.obstacles) {
    if (obstacleIds.has(item.id))
      errors.push(`Duplicate obstacle ID: ${item.id}.`);
    obstacleIds.add(item.id);
    try {
      requireWorldPoint(`obstacle ${item.id}`, item.center);
      requireNumberInRange(`${item.id}.halfWidth`, item.halfWidth, 0.1, 100);
      requireNumberInRange(`${item.id}.halfDepth`, item.halfDepth, 0.1, 100);
      requireNumberInRange(`${item.id}.height`, item.height, 0.1, 100);
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const spawnIds = new Set<string>();
  for (const spawn of map.spawns) {
    if (spawnIds.has(spawn.id)) errors.push(`Duplicate spawn ID: ${spawn.id}.`);
    spawnIds.add(spawn.id);
    if (!pointInsideBounds(spawn.center, map.bounds)) {
      errors.push(`Spawn ${spawn.id} is outside map bounds.`);
    }
    if (map.obstacles.some((item) => pointInsideObstacle(spawn.center, item))) {
      errors.push(`Spawn ${spawn.id} overlaps an obstacle.`);
    }
    if (spawn.routes.length < 2) {
      errors.push(`Spawn ${spawn.id} needs at least two routes.`);
    }
    for (const route of spawn.routes) {
      const points = [spawn.center, ...route.waypoints];
      const destination = route.waypoints.at(-1);
      if (
        destination === undefined ||
        !pointInsideBounds(destination, map.conflictBounds)
      ) {
        errors.push(`Route ${route.id} does not reach the conflict area.`);
      }
      points.forEach((point) => {
        if (!pointInsideBounds(point, map.bounds)) {
          errors.push(`Route ${route.id} leaves map bounds.`);
        }
      });
      for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        if (
          start !== undefined &&
          end !== undefined &&
          map.obstacles.some((item) =>
            segmentIntersectsObstacle(start, end, item),
          )
        ) {
          errors.push(`Route ${route.id} crosses collision geometry.`);
        }
      }
    }
  }

  for (let left = 0; left < map.spawns.length; left += 1) {
    for (let right = left + 1; right < map.spawns.length; right += 1) {
      const first = map.spawns[left];
      const second = map.spawns[right];
      if (
        first !== undefined &&
        second !== undefined &&
        hasDirectSightline(map, first.center, second.center)
      ) {
        errors.push(
          `Spawns ${first.id} and ${second.id} have direct sightline.`,
        );
      }
    }
  }
  if (map.obstacles.filter((item) => item.centralCover).length < 2) {
    errors.push('Conflict area needs multiple cover obstacles.');
  }
  return Object.freeze(errors);
}
