import { describe, expect, it } from 'vitest';

import { STARTING_PISTOL } from '../shared/combat';
import {
  advanceReload,
  attemptActiveReload,
  initializeReloadState,
  startReload,
  type ReloadingPlayer,
} from '../shared/reload';
import { millisecondsToTicks } from '../shared/time';

function player(overrides: Partial<ReloadingPlayer> = {}): ReloadingPlayer {
  const value: ReloadingPlayer = {
    magazineAmmo: 3,
    reserveAmmo: 10,
    reloadTicksElapsed: 0,
    reloadCompletionTick: 0,
    reloadAttempted: false,
    reloadOutcome: 'none',
    reloadEvent: 0,
    ...overrides,
  };
  initializeReloadState(value);
  return value;
}

function advanceToMilliseconds(dog: ReloadingPlayer, milliseconds: number) {
  const ticks = millisecondsToTicks(milliseconds);
  while (dog.reloadTicksElapsed < ticks) advanceReload(dog);
}

describe('active reload', () => {
  it('completes normally without an optional timing attempt', () => {
    const dog = player();
    expect(startReload(dog)).toBe(true);
    advanceToMilliseconds(dog, STARTING_PISTOL.reload.durationMilliseconds);
    expect(dog.reloadOutcome).toBe('normal');
    expect(dog.magazineAmmo).toBe(8);
    expect(dog.reserveAmmo).toBe(5);
    expect(dog.reloadCompletionTick).toBe(0);
  });

  it.each([
    [1_000, 'perfect'],
    [900, 'good'],
  ] as const)('classifies a %d ms attempt as %s', (elapsed, outcome) => {
    const dog = player();
    startReload(dog);
    advanceToMilliseconds(dog, elapsed);
    expect(attemptActiveReload(dog, elapsed)).toBe(true);
    expect(dog.reloadOutcome).toBe(outcome);
    while (dog.reloadCompletionTick > 0) advanceReload(dog);
    expect(dog.magazineAmmo).toBe(8);
    expect(dog.reserveAmmo).toBe(5);
  });

  it('makes an early or late attempt slower than no attempt', () => {
    for (const elapsed of [200, 1_350]) {
      const dog = player();
      startReload(dog);
      advanceToMilliseconds(dog, elapsed);
      expect(attemptActiveReload(dog, elapsed)).toBe(true);
      expect(dog.reloadOutcome).toBe('failed');
      expect(dog.reloadCompletionTick).toBe(
        millisecondsToTicks(
          STARTING_PISTOL.reload.durationMilliseconds +
            STARTING_PISTOL.reload.fumblePenaltyMilliseconds,
        ),
      );
    }
  });

  it('compensates 150 ms latency but allows only one attempt', () => {
    const dog = player();
    startReload(dog);
    advanceToMilliseconds(dog, 1_150);
    expect(attemptActiveReload(dog, 1_000)).toBe(true);
    expect(dog.reloadOutcome).toBe('perfect');
    expect(attemptActiveReload(dog, 1_000)).toBe(false);
  });

  it('preserves rounds and rejects impossible reload starts', () => {
    expect(startReload(player({ magazineAmmo: 8 }))).toBe(false);
    expect(startReload(player({ reserveAmmo: 0 }))).toBe(false);
    const dog = player({ magazineAmmo: 7, reserveAmmo: 1 });
    startReload(dog);
    while (dog.reloadCompletionTick > 0) advanceReload(dog);
    expect(dog.magazineAmmo).toBe(8);
    expect(dog.reserveAmmo).toBe(0);
  });
});
