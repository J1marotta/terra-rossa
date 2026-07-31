import { describe, expect, it } from 'vitest';

import { CENTRE_SHOTGUN, STARTING_PISTOL } from '../shared/combat';
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
    reloadResultTicksRemaining: 0,
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
    expect(dog.reloadResultTicksRemaining).toBeGreaterThan(0);
    while (dog.reloadResultTicksRemaining > 1) advanceReload(dog);
    expect(dog.reloadResultTicksRemaining).toBe(1);
    advanceReload(dog);
    expect(dog.reloadResultTicksRemaining).toBe(0);
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

  it('uses the equipped shotgun magazine and active-reload timing', () => {
    const dog = player({
      magazineAmmo: 0,
      reserveAmmo: CENTRE_SHOTGUN.reserveSize,
    });
    expect(startReload(dog, CENTRE_SHOTGUN)).toBe(true);
    while (
      dog.reloadTicksElapsed * (1_000 / 30) <
      CENTRE_SHOTGUN.reload.perfectWindowStartMilliseconds
    )
      advanceReload(dog, CENTRE_SHOTGUN);
    expect(
      attemptActiveReload(
        dog,
        CENTRE_SHOTGUN.reload.perfectWindowStartMilliseconds,
        CENTRE_SHOTGUN,
      ),
    ).toBe(true);
    while (dog.reloadCompletionTick > 0) advanceReload(dog, CENTRE_SHOTGUN);
    expect(dog.magazineAmmo).toBe(CENTRE_SHOTGUN.magazineSize);
  });
});
