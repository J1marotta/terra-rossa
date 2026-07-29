import { SHARED_MELEE } from './combat';
import { traceHitscan, type HitscanTarget } from './hitscan';
import { TERRA_ROSSA_MAP, type AuthoredMap } from './map';

export interface MeleeSource {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly aimAngleRadians: number;
}

function angleDifference(left: number, right: number) {
  return Math.atan2(Math.sin(left - right), Math.cos(left - right));
}

export function selectMeleeTarget(
  source: MeleeSource,
  targets: readonly HitscanTarget[],
  map: AuthoredMap = TERRA_ROSSA_MAP,
) {
  const candidates = targets
    .map((target) => {
      const x = target.x - source.x;
      const z = target.z - source.z;
      return {
        target,
        distance: Math.hypot(x, z),
        angle: Math.atan2(z, x),
      };
    })
    .filter(
      ({ distance, angle }) =>
        distance <= SHARED_MELEE.rangeMetres &&
        Math.abs(angleDifference(angle, source.aimAngleRadians)) <=
          SHARED_MELEE.arcRadians / 2,
    )
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.target.id.localeCompare(right.target.id),
    );
  for (const candidate of candidates) {
    const ray = traceHitscan(
      map,
      source.x,
      source.z,
      candidate.angle,
      candidate.distance,
      [candidate.target],
    );
    if (ray.targetId === candidate.target.id) return candidate.target;
  }
  return null;
}
