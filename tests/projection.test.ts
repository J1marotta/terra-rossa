import { describe, expect, it } from 'vitest';

import { calculateOrthographicBounds } from '../client/src/game/projection';

describe('orthographic projection', () => {
  it('preserves vertical world scale while adapting horizontal space', () => {
    expect(calculateOrthographicBounds(1600, 800, 18)).toEqual({
      left: -18,
      right: 18,
      top: 9,
      bottom: -9,
    });
    expect(calculateOrthographicBounds(800, 800, 18)).toEqual({
      left: -9,
      right: 9,
      top: 9,
      bottom: -9,
    });
  });

  it('rejects dimensions that would corrupt aim projection', () => {
    expect(() => calculateOrthographicBounds(0, 800)).toThrow('positive');
    expect(() => calculateOrthographicBounds(800, -1)).toThrow('positive');
  });
});
