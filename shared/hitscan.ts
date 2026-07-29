import type { AuthoredMap } from './map';

export interface HitscanTarget {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export interface HitscanResult {
  readonly endX: number;
  readonly endZ: number;
  readonly targetId: string | null;
  readonly distance: number;
}

function rayBoxDistance(
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  let near = 0;
  let far = Number.POSITIVE_INFINITY;
  for (const [origin, direction, minimum, maximum] of [
    [originX, directionX, minX, maxX],
    [originZ, directionZ, minZ, maxZ],
  ] as const) {
    if (Math.abs(direction) < 1e-9) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const first = (minimum - origin) / direction;
    const second = (maximum - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  return near;
}

function rayCircleDistance(
  originX: number,
  originZ: number,
  directionX: number,
  directionZ: number,
  target: HitscanTarget,
) {
  const toX = target.x - originX;
  const toZ = target.z - originZ;
  const along = toX * directionX + toZ * directionZ;
  if (along < 0) return null;
  const perpendicularSquared = toX * toX + toZ * toZ - along * along;
  const radiusSquared = target.radius * target.radius;
  if (perpendicularSquared > radiusSquared) return null;
  return Math.max(0, along - Math.sqrt(radiusSquared - perpendicularSquared));
}

export function traceHitscan(
  map: AuthoredMap,
  originX: number,
  originZ: number,
  angleRadians: number,
  rangeMetres: number,
  targets: readonly HitscanTarget[],
): HitscanResult {
  const directionX = Math.cos(angleRadians);
  const directionZ = Math.sin(angleRadians);
  let distance = rangeMetres;
  let targetId: string | null = null;

  for (const obstacle of map.obstacles) {
    const hit = rayBoxDistance(
      originX,
      originZ,
      directionX,
      directionZ,
      obstacle.center.x - obstacle.halfWidth,
      obstacle.center.x + obstacle.halfWidth,
      obstacle.center.z - obstacle.halfDepth,
      obstacle.center.z + obstacle.halfDepth,
    );
    if (hit !== null && hit < distance) distance = hit;
  }
  for (const target of targets) {
    const hit = rayCircleDistance(
      originX,
      originZ,
      directionX,
      directionZ,
      target,
    );
    if (hit !== null && hit <= distance) {
      distance = hit;
      targetId = target.id;
    }
  }
  return Object.freeze({
    endX: originX + directionX * distance,
    endZ: originZ + directionZ * distance,
    targetId,
    distance,
  });
}
