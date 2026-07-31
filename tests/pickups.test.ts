import { describe, expect, it } from 'vitest';

import {
  AUTHORED_PICKUP_POINTS,
  PICKUP_DEFINITIONS,
  planPickups,
  planShotgunPickup,
} from '../shared/pickups';
import {
  pointInsideBounds,
  pointInsideObstacle,
  TERRA_ROSSA_MAP,
} from '../shared/map';

describe('pickup plan', () => {
  it('uses valid authored points and a seeded eight-ammo/four-heal mix', () => {
    AUTHORED_PICKUP_POINTS.forEach((point) => {
      expect(pointInsideBounds(point, TERRA_ROSSA_MAP.bounds)).toBe(true);
      expect(
        TERRA_ROSSA_MAP.obstacles.some((obstacle) =>
          pointInsideObstacle(point, obstacle),
        ),
      ).toBe(false);
    });
    const plan = planPickups(77);
    expect(plan).toHaveLength(12);
    expect(plan.filter((pickup) => pickup.kind === 'ammo')).toHaveLength(8);
    expect(plan.filter((pickup) => pickup.kind === 'heal')).toHaveLength(4);
    expect(planPickups(77)).toEqual(plan);
    expect(planPickups(78)).not.toEqual(plan);
    expect(
      plan.every(
        (pickup) => pickup.amount === PICKUP_DEFINITIONS[pickup.kind].amount,
      ),
    ).toBe(true);
  });

  it('chooses one valid centre-biased shotgun point deterministically', () => {
    const point = planShotgunPickup(99);
    expect(pointInsideBounds(point, TERRA_ROSSA_MAP.conflictBounds)).toBe(true);
    expect(
      TERRA_ROSSA_MAP.obstacles.some((obstacle) =>
        pointInsideObstacle(point, obstacle),
      ),
    ).toBe(false);
    expect(planShotgunPickup(99)).toEqual(point);
  });
});
