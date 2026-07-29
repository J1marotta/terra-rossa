import { describe, expect, it } from 'vitest';

import { CreatureRegistry } from '../server/creatures/CreatureRegistry';
import {
  CREATURE_POPULATION_CAP,
  type CreatureSpawn,
} from '../shared/creatures';
import { createGameRoomState } from '../shared/state';

const spawn = (
  id: string,
  overrides: Partial<CreatureSpawn> = {},
): CreatureSpawn => ({
  id,
  kind: 'foundation',
  x: 0,
  z: 0,
  collisionRadius: 0.4,
  speedMetresPerSecond: 3,
  maximumHealth: 30,
  ...overrides,
});

describe('creature registry', () => {
  it('owns synchronized and runtime lifecycle without leaks', () => {
    const state = createGameRoomState();
    const registry = new CreatureRegistry(state.creatures);

    expect(registry.spawn(spawn('creature-1'))?.id).toBe('creature-1');
    expect(registry.size).toBe(1);
    expect(state.creatures.size).toBe(1);
    expect(registry.spawn(spawn('creature-1'))).toBeNull();
    expect(registry.despawn('creature-1')).toBe(true);
    expect(registry.size).toBe(0);
    expect(state.creatures.size).toBe(0);
    expect(registry.despawn('creature-1')).toBe(false);
  });

  it('enforces the hard population cap and clears both stores', () => {
    const state = createGameRoomState();
    const registry = new CreatureRegistry(state.creatures);
    for (let index = 0; index < CREATURE_POPULATION_CAP; index += 1) {
      expect(registry.spawn(spawn(`creature-${index}`))).not.toBeNull();
    }
    expect(registry.spawn(spawn('over-cap'))).toBeNull();
    expect(registry.size).toBe(CREATURE_POPULATION_CAP);
    expect(state.creatures.size).toBe(CREATURE_POPULATION_CAP);

    registry.clear();

    expect(registry.size).toBe(0);
    expect(state.creatures.size).toBe(0);
  });

  it('selects targets through an injected policy and moves at fixed-step speed', () => {
    const state = createGameRoomState();
    const registry = new CreatureRegistry(state.creatures);
    const creature = registry.spawn(spawn('mover'));
    expect(creature).not.toBeNull();
    const targets = [
      { id: 'far', x: 10, z: 0, alive: true },
      { id: 'near', x: 2, z: 0, alive: true },
    ];

    registry.step(targets, (_candidate, options) => options[1] ?? null);

    expect(creature?.targetId).toBe('near');
    expect(creature?.x).toBeCloseTo(0.1, 5);
    expect(creature?.z).toBe(0);
  });

  it('supports spatial queries and server-owned damage/death', () => {
    const state = createGameRoomState();
    const registry = new CreatureRegistry(state.creatures);
    registry.spawn(spawn('near', { x: 1, maximumHealth: 20 }));
    registry.spawn(spawn('far', { x: 12 }));

    expect(registry.queryRadius(0, 0, 2).map((item) => item.id)).toEqual([
      'near',
    ]);
    expect(registry.damage('near', 7)).toEqual({
      applied: true,
      killed: false,
      healthAfter: 13,
    });
    expect(registry.damage('near', 99)).toEqual({
      applied: true,
      killed: true,
      healthAfter: 0,
    });
    expect(state.creatures.get('near')).toMatchObject({
      alive: false,
      hitEvent: 2,
      deathEvent: 1,
      targetId: '',
    });
    expect(registry.damage('near', 1).applied).toBe(false);
  });
});
