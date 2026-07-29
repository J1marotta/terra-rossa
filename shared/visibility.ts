import type { AuthoredMap } from './map';
import { hasDirectSightline } from './map';

export const BASE_VISIBILITY_RANGE_METRES = 16;

export interface VisibilitySubject {
  readonly x: number;
  readonly z: number;
  readonly alive: boolean;
}

export interface VisibilityInputs {
  readonly maximumRangeMetres?: number;
}

export function canViewerSeeTarget(
  map: AuthoredMap,
  viewer: VisibilitySubject,
  target: VisibilitySubject,
  inputs: VisibilityInputs = {},
) {
  if (!viewer.alive || !target.alive) return false;
  const maximumRange =
    inputs.maximumRangeMetres ?? BASE_VISIBILITY_RANGE_METRES;
  const deltaX = target.x - viewer.x;
  const deltaZ = target.z - viewer.z;
  if (deltaX * deltaX + deltaZ * deltaZ > maximumRange * maximumRange)
    return false;
  return hasDirectSightline(
    map,
    { x: viewer.x, z: viewer.z },
    { x: target.x, z: target.z },
  );
}
