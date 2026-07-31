import { describe, expect, it } from 'vitest';

import { CommandRateLimiter } from '../server/CommandRateLimiter';

describe('command rate limiter', () => {
  it('allows expected input cadence and rejects aim floods', () => {
    const limiter = new CommandRateLimiter();
    expect(
      Array.from({ length: 30 }, () => limiter.allow(1_000, 'aim')).every(
        Boolean,
      ),
    ).toBe(true);
    expect(limiter.allow(1_000, 'aim')).toBe(false);
  });

  it('caps aggregate traffic and resets on the next window', () => {
    const limiter = new CommandRateLimiter();
    const accepted = Array.from({ length: 80 }, (_value, index) =>
      limiter.allow(1_000, index % 3 === 0 ? 'move' : 'fire'),
    ).filter(Boolean);
    expect(accepted.length).toBeLessThanOrEqual(60);
    expect(limiter.allow(2_000, 'fire')).toBe(true);
  });

  it('fails closed for an invalid clock value', () => {
    const limiter = new CommandRateLimiter();
    expect(limiter.allow(Number.NaN, 'fire')).toBe(false);
  });
});
