import { requireFiniteNumber, requireNumberInRange } from './numeric';

export const WORLD_COORDINATE_LIMIT = 2_048;
export const RENDER_ELEVATION_LIMIT = 256;
export const FULL_TURN_RADIANS = Math.PI * 2;

export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

export interface RenderPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function requireWorldPoint(name: string, value: WorldPoint): WorldPoint {
  return Object.freeze({
    x: requireNumberInRange(
      `${name}.x`,
      value.x,
      -WORLD_COORDINATE_LIMIT,
      WORLD_COORDINATE_LIMIT,
    ),
    z: requireNumberInRange(
      `${name}.z`,
      value.z,
      -WORLD_COORDINATE_LIMIT,
      WORLD_COORDINATE_LIMIT,
    ),
  });
}

export function normalizeAngleRadians(angle: number): number {
  const finiteAngle = requireFiniteNumber('angle', angle);
  const normalized =
    ((((finiteAngle + Math.PI) % FULL_TURN_RADIANS) + FULL_TURN_RADIANS) %
      FULL_TURN_RADIANS) -
    Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function worldToRender(point: WorldPoint, elevation = 0): RenderPoint {
  const world = requireWorldPoint('worldPoint', point);
  return Object.freeze({
    x: world.x,
    y: requireNumberInRange(
      'elevation',
      elevation,
      -RENDER_ELEVATION_LIMIT,
      RENDER_ELEVATION_LIMIT,
    ),
    z: world.z,
  });
}

export function renderToWorld(point: RenderPoint): WorldPoint {
  requireNumberInRange(
    'renderPoint.y',
    point.y,
    -RENDER_ELEVATION_LIMIT,
    RENDER_ELEVATION_LIMIT,
  );
  return requireWorldPoint('renderPoint', point);
}
