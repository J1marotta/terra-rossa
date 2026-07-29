import { describe, expect, it } from 'vitest';

import { allocateSpawnRegions, spawnSeparationScore } from '../shared/spawns';

describe('seeded spawn allocation', () => {
  it('is deterministic, unique, and balanced across many seeds', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      for (const playerCount of [2, 3, 4]) {
        const first = allocateSpawnRegions(playerCount, seed);
        const second = allocateSpawnRegions(playerCount, seed);
        expect(first.map(({ id }) => id)).toEqual(second.map(({ id }) => id));
        expect(new Set(first.map(({ id }) => id)).size).toBe(playerCount);
        if (playerCount === 2) {
          expect(spawnSeparationScore(first)).toBeGreaterThan(50);
        }
        if (playerCount === 4) {
          expect(new Set(first.map(({ id }) => id))).toEqual(
            new Set(['northwest', 'northeast', 'southeast', 'southwest']),
          );
        }
      }
    }
  });

  it('rejects unsupported room sizes', () => {
    expect(() => allocateSpawnRegions(1, 0)).toThrow('two to four');
    expect(() => allocateSpawnRegions(5, 0)).toThrow('two to four');
  });
});
