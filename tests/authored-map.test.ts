import { describe, expect, it } from 'vitest';

import {
  TERRA_ROSSA_MAP,
  createMapVisuals,
  hasDirectSightline,
  segmentIntersectsObstacle,
  validateAuthoredMap,
  type AuthoredMap,
} from '../shared';

describe('authored collision map', () => {
  it('passes deterministic structural validation', () => {
    expect(validateAuthoredMap(TERRA_ROSSA_MAP)).toEqual([]);
    expect(validateAuthoredMap(TERRA_ROSSA_MAP)).toEqual([]);
  });

  it('blocks opening sightlines between every spawn pair', () => {
    for (let left = 0; left < TERRA_ROSSA_MAP.spawns.length; left += 1) {
      for (
        let right = left + 1;
        right < TERRA_ROSSA_MAP.spawns.length;
        right += 1
      ) {
        const first = TERRA_ROSSA_MAP.spawns[left];
        const second = TERRA_ROSSA_MAP.spawns[right];
        expect(first).toBeDefined();
        expect(second).toBeDefined();
        if (first !== undefined && second !== undefined) {
          expect(
            hasDirectSightline(TERRA_ROSSA_MAP, first.center, second.center),
          ).toBe(false);
        }
      }
    }
  });

  it('gives every spawn two collision-free routes into the conflict area', () => {
    for (const spawn of TERRA_ROSSA_MAP.spawns) {
      expect(spawn.routes.length).toBeGreaterThanOrEqual(2);
      for (const route of spawn.routes) {
        const points = [spawn.center, ...route.waypoints];
        for (let index = 1; index < points.length; index += 1) {
          const start = points[index - 1];
          const end = points[index];
          expect(start).toBeDefined();
          expect(end).toBeDefined();
          if (start !== undefined && end !== undefined) {
            expect(
              TERRA_ROSSA_MAP.obstacles.some((obstacle) =>
                segmentIntersectsObstacle(start, end, obstacle),
              ),
            ).toBe(false);
          }
        }
      }
    }
  });

  it('derives richer visual pieces from collision obstacle IDs', () => {
    const visuals = createMapVisuals(TERRA_ROSSA_MAP);
    const sourceIds = new Set(TERRA_ROSSA_MAP.obstacles.map((item) => item.id));
    expect(visuals.length).toBeGreaterThan(TERRA_ROSSA_MAP.obstacles.length);
    expect(visuals.every((item) => sourceIds.has(item.sourceObstacleId))).toBe(
      true,
    );
  });

  it('reports a broken authored route without runtime editor state', () => {
    const broken = structuredClone(TERRA_ROSSA_MAP) as AuthoredMap;
    const firstSpawn = broken.spawns[0];
    expect(firstSpawn).toBeDefined();
    if (firstSpawn === undefined) return;
    const changed = {
      ...broken,
      spawns: [
        { ...firstSpawn, routes: [firstSpawn.routes[0]].filter(Boolean) },
        ...broken.spawns.slice(1),
      ],
    } as AuthoredMap;
    expect(validateAuthoredMap(changed)).toContain(
      'Spawn northwest needs at least two routes.',
    );
  });
});
