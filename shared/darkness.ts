export const INITIAL_VISIBILITY_RADIUS_METRES = 16;
export const ACTIVITY_CUE_LIFETIME_TICKS = 40;

export interface DarknessStage {
  readonly startsAtTick: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly visibilityRadiusMetres: number;
  readonly damagePerSecond: number;
}

export const DARKNESS_STAGES: readonly DarknessStage[] = [
  {
    startsAtTick: 0,
    halfWidth: 30,
    halfDepth: 22,
    visibilityRadiusMetres: 16,
    damagePerSecond: 0,
  },
  {
    startsAtTick: 3_600,
    halfWidth: 23,
    halfDepth: 17,
    visibilityRadiusMetres: 15,
    damagePerSecond: 5,
  },
  {
    startsAtTick: 7_200,
    halfWidth: 16,
    halfDepth: 12,
    visibilityRadiusMetres: 13,
    damagePerSecond: 9,
  },
  {
    startsAtTick: 10_800,
    halfWidth: 10,
    halfDepth: 8,
    visibilityRadiusMetres: 11,
    damagePerSecond: 15,
  },
  {
    startsAtTick: 14_400,
    halfWidth: 6,
    halfDepth: 5,
    visibilityRadiusMetres: 9,
    damagePerSecond: 25,
  },
  {
    startsAtTick: 18_000,
    halfWidth: 2.5,
    halfDepth: 2,
    visibilityRadiusMetres: 8,
    damagePerSecond: 50,
  },
  {
    startsAtTick: 21_600,
    halfWidth: 0,
    halfDepth: 0,
    visibilityRadiusMetres: 7,
    damagePerSecond: 100,
  },
];

export function darknessStageAtTick(tick: number) {
  let index = 0;
  for (let candidate = 1; candidate < DARKNESS_STAGES.length; candidate += 1) {
    if (tick < DARKNESS_STAGES[candidate]!.startsAtTick) break;
    index = candidate;
  }
  return { index, stage: DARKNESS_STAGES[index]! };
}

export function isOutsideDarknessBoundary(
  x: number,
  z: number,
  halfWidth: number,
  halfDepth: number,
) {
  if (halfWidth <= 0 || halfDepth <= 0) return true;
  return Math.abs(x) > halfWidth || Math.abs(z) > halfDepth;
}

export type ActivityDirection =
  'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const DIRECTIONS: readonly ActivityDirection[] = [
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
  'N',
  'NE',
];

export function approximateActivityDirection(
  viewerX: number,
  viewerZ: number,
  sourceX: number,
  sourceZ: number,
): ActivityDirection {
  const angle = Math.atan2(sourceZ - viewerZ, sourceX - viewerX);
  const octant = Math.round(angle / (Math.PI / 4));
  return DIRECTIONS[(octant + 8) % 8]!;
}
