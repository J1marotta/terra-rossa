import { describe, expect, it } from 'vitest';

import {
  CREATURE_PLAYER_SAFETY_METRES,
  CREATURE_SPAWN_ZONES,
  NORMAL_CREATURE_BUDGET,
  STRESS_CREATURE_BUDGET,
  planCreaturePopulation,
} from '../shared/creaturePacing';
import {
  pointInsideBounds,
  pointInsideObstacle,
  TERRA_ROSSA_MAP,
} from '../shared/map';

describe('authored creature pacing', () => {
  it('keeps every authored point valid and distributes normal pressure equally', () => {
    CREATURE_SPAWN_ZONES.forEach((zone) =>
      zone.points.forEach((point) => {
        expect(pointInsideBounds(point, TERRA_ROSSA_MAP.bounds)).toBe(true);
        expect(
          TERRA_ROSSA_MAP.obstacles.some((obstacle) =>
            pointInsideObstacle(point, obstacle),
          ),
        ).toBe(false);
      }),
    );
    const plan = planCreaturePopulation([], 42);
    expect(plan).toHaveLength(NORMAL_CREATURE_BUDGET);
    CREATURE_SPAWN_ZONES.forEach((zone) => {
      expect(plan.filter((spawn) => spawn.zoneId === zone.id)).toHaveLength(4);
    });
    expect(plan.filter((spawn) => spawn.kind === 'swarmer')).toHaveLength(12);
    expect(plan.filter((spawn) => spawn.kind === 'spitter')).toHaveLength(4);
  });

  it('supports the 48-creature stress budget without exceeding the cap', () => {
    const plan = planCreaturePopulation([], 42, STRESS_CREATURE_BUDGET);
    expect(plan).toHaveLength(STRESS_CREATURE_BUDGET);
    expect(new Set(plan.map((spawn) => `${spawn.x},${spawn.z}`)).size).toBe(
      STRESS_CREATURE_BUDGET,
    );
    CREATURE_SPAWN_ZONES.forEach((zone) => {
      expect(plan.filter((spawn) => spawn.zoneId === zone.id)).toHaveLength(12);
    });
  });

  it('is seeded and excludes points too close to any player', () => {
    const first = planCreaturePopulation([], 123);
    const repeat = planCreaturePopulation([], 123);
    const different = planCreaturePopulation([], 124);
    expect(first).toEqual(repeat);
    expect(first.map(({ x, z }) => [x, z])).not.toEqual(
      different.map(({ x, z }) => [x, z]),
    );

    const blockedPoint = CREATURE_SPAWN_ZONES[0]?.points[0];
    expect(blockedPoint).toBeDefined();
    if (blockedPoint === undefined) return;
    const safe = planCreaturePopulation([blockedPoint], 123);
    expect(
      safe.every(
        (spawn) =>
          Math.hypot(spawn.x - blockedPoint.x, spawn.z - blockedPoint.z) >=
          CREATURE_PLAYER_SAFETY_METRES,
      ),
    ).toBe(true);
  });
});
