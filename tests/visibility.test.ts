import { describe, expect, it } from 'vitest';

import { TERRA_ROSSA_MAP } from '../shared/map';
import {
  BASE_VISIBILITY_RANGE_METRES,
  canViewerSeeTarget,
} from '../shared/visibility';
import {
  approximateActivityDirection,
  darknessStageAtTick,
  isOutsideDarknessBoundary,
} from '../shared/darkness';

const subject = (x: number, z: number, alive = true) => ({ x, z, alive });

describe('opponent visibility', () => {
  it('requires both range and an unobstructed map sightline', () => {
    expect(
      canViewerSeeTarget(TERRA_ROSSA_MAP, subject(-10, -10), subject(-5, -10)),
    ).toBe(true);
    expect(
      canViewerSeeTarget(TERRA_ROSSA_MAP, subject(-28, 0), subject(-22, 0)),
    ).toBe(false);
    expect(
      canViewerSeeTarget(
        TERRA_ROSSA_MAP,
        subject(0, -20),
        subject(0, BASE_VISIBILITY_RANGE_METRES + 1),
      ),
    ).toBe(false);
  });

  it('accepts a later server-owned darkness range without changing the rule', () => {
    expect(
      canViewerSeeTarget(TERRA_ROSSA_MAP, subject(-10, -10), subject(-5, -10), {
        maximumRangeMetres: 4,
      }),
    ).toBe(false);
  });

  it('does not reveal from or to eliminated players', () => {
    expect(
      canViewerSeeTarget(
        TERRA_ROSSA_MAP,
        subject(-10, -10, false),
        subject(-5, -10),
      ),
    ).toBe(false);
    expect(
      canViewerSeeTarget(
        TERRA_ROSSA_MAP,
        subject(-10, -10),
        subject(-5, -10, false),
      ),
    ).toBe(false);
  });

  it('reduces hidden activity to a coarse bearing without a coordinate', () => {
    expect(approximateActivityDirection(0, 0, 20, 1)).toBe('E');
    expect(approximateActivityDirection(0, 0, -20, -20)).toBe('NW');
  });

  it('contracts in shared stages and identifies unsafe positions', () => {
    expect(darknessStageAtTick(3_599).index).toBe(0);
    expect(darknessStageAtTick(3_600).index).toBe(1);
    expect(darknessStageAtTick(18_000).stage.damagePerSecond).toBe(50);
    expect(isOutsideDarknessBoundary(24, 0, 23, 17)).toBe(true);
    expect(isOutsideDarknessBoundary(0, 0, 2.5, 2)).toBe(false);
    expect(isOutsideDarknessBoundary(0, 0, 0, 0)).toBe(true);
  });
});
