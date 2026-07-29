import { describe, expect, it } from 'vitest';

import {
  resolveDamageEvents,
  STARTING_PISTOL,
  validateWeaponDefinition,
  type DamageEvent,
  type Damageable,
} from '../shared/combat';

describe('combat data', () => {
  it('provides a complete immutable starting firearm definition', () => {
    expect(STARTING_PISTOL.id).toBe('red-hollow-pistol');
    expect(STARTING_PISTOL.magazineSize).toBe(8);
    expect(STARTING_PISTOL.reserveSize).toBe(32);
    expect(
      STARTING_PISTOL.reload.perfectWindowStartMilliseconds,
    ).toBeGreaterThan(STARTING_PISTOL.reload.attemptWindowStartMilliseconds);
    expect(Object.isFrozen(STARTING_PISTOL)).toBe(true);
    expect(Object.isFrozen(STARTING_PISTOL.reload)).toBe(true);
  });

  it('rejects incomplete and contradictory weapon definitions clearly', () => {
    expect(() =>
      validateWeaponDefinition({ ...STARTING_PISTOL, magazineSize: 0 }),
    ).toThrow('magazineSize');
    expect(() =>
      validateWeaponDefinition({
        ...STARTING_PISTOL,
        reload: {
          ...STARTING_PISTOL.reload,
          perfectWindowEndMilliseconds: 1_300,
        },
      }),
    ).toThrow('perfect window');
    expect(() =>
      validateWeaponDefinition({ ...STARTING_PISTOL, spreadRadians: Infinity }),
    ).toThrow('spreadRadians');
  });
});

describe('authoritative damage flow', () => {
  function event(overrides: Partial<DamageEvent>): DamageEvent {
    return {
      id: 'damage-1',
      sourceId: 'attacker',
      targetId: 'target',
      cause: 'firearm',
      amount: 24,
      occurredAtTick: 10,
      order: 0,
      ...overrides,
    };
  }

  it('orders events deterministically and changes health only through resolution', () => {
    const target: Damageable = {
      id: 'target',
      health: 100,
      maximumHealth: 100,
    };
    const targets = new Map([[target.id, target]]);
    const applied = resolveDamageEvents(targets, [
      event({ id: 'later', occurredAtTick: 11, amount: 20 }),
      event({ id: 'second', order: 1, amount: 15 }),
      event({ id: 'first', order: 0, amount: 10 }),
    ]);
    expect(applied.map(({ event: appliedEvent }) => appliedEvent.id)).toEqual([
      'first',
      'second',
      'later',
    ]);
    expect(applied.map(({ healthAfter }) => healthAfter)).toEqual([90, 75, 55]);
    expect(target.health).toBe(55);
  });

  it('clamps overkill and rejects duplicate or invalid damage', () => {
    const target: Damageable = { id: 'target', health: 10, maximumHealth: 100 };
    const targets = new Map([[target.id, target]]);
    expect(
      resolveDamageEvents(targets, [event({ amount: 99 })])[0]?.healthAfter,
    ).toBe(0);
    expect(() => resolveDamageEvents(targets, [event({}), event({})])).toThrow(
      'duplicate damage event',
    );
    expect(() =>
      resolveDamageEvents(targets, [event({ amount: Number.NaN })]),
    ).toThrow('damage amount');
    expect(() =>
      resolveDamageEvents(targets, [event({ targetId: 'missing' })]),
    ).toThrow('unknown damage target');
  });

  it('allows deterministic mutual lethal damage in one ordered batch', () => {
    const first: Damageable = { id: 'first', health: 20, maximumHealth: 100 };
    const second: Damageable = { id: 'second', health: 20, maximumHealth: 100 };
    const targets = new Map([
      [first.id, first],
      [second.id, second],
    ]);
    const applied = resolveDamageEvents(targets, [
      event({ id: 'second-hits', sourceId: 'second', targetId: 'first' }),
      event({
        id: 'first-hits',
        sourceId: 'first',
        targetId: 'second',
        order: 1,
      }),
    ]);
    expect(applied).toHaveLength(2);
    expect(first.health).toBe(0);
    expect(second.health).toBe(0);
  });
});
