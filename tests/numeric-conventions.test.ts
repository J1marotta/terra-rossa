import { describe, expect, it } from 'vitest';

import {
  FIXED_STEP_SECONDS,
  SeededRandom,
  millisecondsToTicks,
  normalizeAngleRadians,
  renderToWorld,
  requireFiniteNumber,
  requireNumberInRange,
  requireSimulationTick,
  requireWorldPoint,
  ticksToSeconds,
  worldToRender,
} from '../shared';

describe('numeric validation', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite value %s',
    (value) => expect(() => requireFiniteNumber('value', value)).toThrow(),
  );

  it('accepts inclusive bounds and rejects values beyond them', () => {
    expect(requireNumberInRange('value', -2, -2, 3)).toBe(-2);
    expect(requireNumberInRange('value', 3, -2, 3)).toBe(3);
    expect(() => requireNumberInRange('value', 3.01, -2, 3)).toThrow(
      'between -2 and 3',
    );
  });
});

describe('coordinate conventions', () => {
  it('maps world X/Z directly to renderer X/Z and reserves Y for elevation', () => {
    expect(worldToRender({ x: 12, z: -4 }, 1.5)).toEqual({
      x: 12,
      y: 1.5,
      z: -4,
    });
    expect(renderToWorld({ x: 12, y: 1.5, z: -4 })).toEqual({ x: 12, z: -4 });
  });

  it('rejects invalid and out-of-protocol world coordinates', () => {
    expect(() => requireWorldPoint('position', { x: 2_049, z: 0 })).toThrow();
    expect(() =>
      requireWorldPoint('position', { x: 0, z: Number.NaN }),
    ).toThrow();
  });

  it('normalizes finite radians into the half-open canonical turn', () => {
    expect(normalizeAngleRadians(Math.PI * 3)).toBe(-Math.PI);
    expect(normalizeAngleRadians(-Math.PI * 2)).toBe(0);
    expect(() => normalizeAngleRadians(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('fixed simulation time', () => {
  it('uses stable 30 Hz ticks independent of render timing', () => {
    expect(ticksToSeconds(30)).toBe(1);
    expect(FIXED_STEP_SECONDS).toBe(1 / 30);
    expect(millisecondsToTicks(34)).toBe(2);
  });

  it('rejects fractional, negative, and overflowing tick values', () => {
    for (const tick of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => requireSimulationTick(tick)).toThrow();
    }
  });
});

describe('seeded random', () => {
  it('repeats choices for the same seed', () => {
    const left = new SeededRandom(42);
    const right = new SeededRandom(42);
    expect(Array.from({ length: 8 }, () => left.nextFloat())).toEqual(
      Array.from({ length: 8 }, () => right.nextFloat()),
    );
  });

  it('keeps integer choices inside the requested half-open range', () => {
    const random = new SeededRandom(0);
    const values = Array.from({ length: 100 }, () => random.nextInteger(-3, 4));
    expect(values.every((value) => value >= -3 && value < 4)).toBe(true);
    expect(() => random.nextInteger(3, 3)).toThrow();
    expect(() => random.pick([])).toThrow();
  });
});
