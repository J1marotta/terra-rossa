export const INITIAL_VISIBILITY_RADIUS_METRES = 16;
export const ACTIVITY_CUE_LIFETIME_TICKS = 40;

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
