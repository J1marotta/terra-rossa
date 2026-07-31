import type { WorldPoint } from './coordinates';
import { SeededRandom } from './random';

export const PICKUP_INTERACTION_RANGE_METRES = 1.6;
export const MAXIMUM_PISTOL_RESERVE_AMMO = 64;
export const PICKUP_DEFINITIONS = Object.freeze({
  ammo: Object.freeze({ kind: 'ammo', amount: 12 }),
  heal: Object.freeze({ kind: 'heal', amount: 25 }),
});

const PICKUP_POINT_TUPLES: ReadonlyArray<readonly [number, number]> = [
  [-9, -7],
  [-3, -7],
  [3, -7],
  [9, -7],
  [-9, 7],
  [-3, 7],
  [3, 7],
  [9, 7],
  [-12, -2],
  [-12, 2],
  [12, -2],
  [12, 2],
  [-4, -10],
  [4, -10],
  [-4, 10],
  [4, 10],
];

export const AUTHORED_PICKUP_POINTS: readonly WorldPoint[] = Object.freeze(
  PICKUP_POINT_TUPLES.map(([x, z]) => Object.freeze({ x, z })),
);

export interface PlannedPickup extends WorldPoint {
  readonly id: string;
  readonly kind: keyof typeof PICKUP_DEFINITIONS;
  readonly amount: number;
}

export function planPickups(seed: number): readonly PlannedPickup[] {
  const random = new SeededRandom(seed);
  return Object.freeze(
    AUTHORED_PICKUP_POINTS.map((point) => ({
      point,
      order: random.nextFloat(),
    }))
      .sort((left, right) => left.order - right.order)
      .slice(0, 12)
      .map(({ point }, index) => {
        const definition =
          index < 8 ? PICKUP_DEFINITIONS.ammo : PICKUP_DEFINITIONS.heal;
        return Object.freeze({
          id: `pickup-${index}`,
          kind: definition.kind,
          amount: definition.amount,
          x: point.x,
          z: point.z,
        });
      }),
  );
}

const SHOTGUN_POINTS: readonly WorldPoint[] = Object.freeze([
  Object.freeze({ x: -3.5, z: 0 }),
  Object.freeze({ x: 3.5, z: 0 }),
  Object.freeze({ x: 0, z: -5 }),
  Object.freeze({ x: 0, z: 5 }),
]);

export function planShotgunPickup(seed: number) {
  return SHOTGUN_POINTS[
    new SeededRandom(seed).nextInteger(0, SHOTGUN_POINTS.length)
  ]!;
}
