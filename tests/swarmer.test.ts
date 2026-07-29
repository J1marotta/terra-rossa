import { describe, expect, it } from 'vitest';

import { CreatureRegistry } from '../server/creatures/CreatureRegistry';
import { SwarmerSystem } from '../server/creatures/SwarmerSystem';
import { SWARMER, type CreatureTarget } from '../shared/creatures';
import { pointInsideObstacle, TERRA_ROSSA_MAP } from '../shared/map';
import { createGameRoomState } from '../shared/state';
import { millisecondsToTicks } from '../shared/time';

function setup(x = 0, z = 0, id = 'swarmer-a') {
  const state = createGameRoomState();
  const registry = new CreatureRegistry(state.creatures);
  const creature = registry.spawn({
    id,
    kind: SWARMER.kind,
    x,
    z,
    collisionRadius: SWARMER.collisionRadius,
    speedMetresPerSecond: SWARMER.speedMetresPerSecond,
    maximumHealth: SWARMER.maximumHealth,
  });
  if (creature === null) throw new Error('Failed to create test swarmer.');
  return { state, registry, creature, system: new SwarmerSystem(registry) };
}

const target = (x: number, z: number): CreatureTarget => ({
  id: 'dog',
  x,
  z,
  alive: true,
});

describe('swarmer', () => {
  it('selects the nearest living target and pursues at fixed-step speed', () => {
    const { creature, system } = setup(-10, -10);
    system.step([target(-5, -10), { ...target(10, 10), id: 'far' }], () => {});
    expect(creature.targetId).toBe('dog');
    expect(creature.x).toBeCloseTo(-10 + SWARMER.speedMetresPerSecond / 30, 5);
    expect(creature.z).toBe(-10);
  });

  it('warns for the full wind-up before one contact attack', () => {
    const { creature, system } = setup(-10, -10);
    const victim = target(-9.2, -10);
    const attacks: Array<{ id: string; damage: number }> = [];
    system.step([victim], (_source, id, damage) =>
      attacks.push({ id, damage }),
    );
    expect(creature.attackWarningEvent).toBe(1);
    expect(creature.attackWindupTicksRemaining).toBe(
      millisecondsToTicks(SWARMER.attackWindupMilliseconds),
    );
    expect(attacks).toEqual([]);
    for (
      let tick = 0;
      tick < millisecondsToTicks(SWARMER.attackWindupMilliseconds);
      tick += 1
    )
      system.step([victim], (_source, id, damage) =>
        attacks.push({ id, damage }),
      );
    expect(attacks).toEqual([{ id: 'dog', damage: SWARMER.attackDamage }]);
    expect(creature.attackEvent).toBe(1);
    system.step([victim], () => attacks.push({ id: 'early', damage: 0 }));
    expect(attacks).toHaveLength(1);
  });

  it('cancels unreadable damage when geometry blocks the warned target', () => {
    const { creature, system } = setup(-22, 0);
    const victim = target(-21.2, 0);
    system.step([victim], () => {});
    expect(creature.attackWarningEvent).toBe(1);
    const hiddenVictim = target(-28, 0);
    const attacks: unknown[] = [];
    for (
      let tick = 0;
      tick < millisecondsToTicks(SWARMER.attackWindupMilliseconds);
      tick += 1
    )
      system.step([hiddenVictim], (...event) => attacks.push(event));
    expect(attacks).toEqual([]);
  });

  it('slides around authored obstacles without entering collision geometry', () => {
    const { creature, system } = setup(-28, 0, 'turn-right');
    const victim = target(-20, 0);
    let maximumDetour = 0;
    for (let tick = 0; tick < 240; tick += 1) {
      system.step([victim], () => {});
      maximumDetour = Math.max(maximumDetour, Math.abs(creature.z));
      expect(
        TERRA_ROSSA_MAP.obstacles.some((obstacle) =>
          pointInsideObstacle(creature, obstacle),
        ),
      ).toBe(false);
    }
    expect(maximumDetour).toBeGreaterThan(4);
    expect(creature.x).toBeGreaterThan(-24);
  });

  it('separates overlapping swarmers instead of stacking on a player', () => {
    const { registry, creature, system } = setup(-10, -10, 'swarmer-a');
    const other = registry.spawn({
      id: 'swarmer-b',
      kind: SWARMER.kind,
      x: -10,
      z: -10,
      collisionRadius: SWARMER.collisionRadius,
      speedMetresPerSecond: SWARMER.speedMetresPerSecond,
      maximumHealth: SWARMER.maximumHealth,
    });
    expect(other).not.toBeNull();
    system.step([target(-5, -10)], () => {});
    expect(
      Math.hypot(creature.x - other!.x, creature.z - other!.z),
    ).toBeGreaterThan(0);
  });
});
