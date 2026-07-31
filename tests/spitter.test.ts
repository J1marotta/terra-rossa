import { describe, expect, it } from 'vitest';

import { CreatureRegistry } from '../server/creatures/CreatureRegistry';
import { ProjectileRegistry } from '../server/creatures/ProjectileRegistry';
import { SpitterSystem } from '../server/creatures/SpitterSystem';
import {
  CREATURE_PROJECTILE_CAP,
  SPITTER,
  type CreatureTarget,
} from '../shared/creatures';
import { createGameRoomState } from '../shared/state';
import { millisecondsToTicks } from '../shared/time';

function setup() {
  const state = createGameRoomState();
  const creatures = new CreatureRegistry(state.creatures);
  const projectiles = new ProjectileRegistry(state.creatureProjectiles);
  const spitter = creatures.spawn({
    id: 'spitter',
    kind: SPITTER.kind,
    x: -10,
    z: -10,
    collisionRadius: SPITTER.collisionRadius,
    speedMetresPerSecond: SPITTER.speedMetresPerSecond,
    maximumHealth: SPITTER.maximumHealth,
  });
  if (spitter === null) throw new Error('Failed to create test spitter.');
  let nextId = 0;
  return {
    state,
    creatures,
    projectiles,
    spitter,
    system: new SpitterSystem(
      creatures,
      projectiles,
      () => `projectile-${nextId++}`,
    ),
  };
}

const target = (x: number, z: number): CreatureTarget => ({
  id: 'dog',
  x,
  z,
  alive: true,
});

describe('spitter', () => {
  it('warns before spawning an avoidable server projectile that deals damage', () => {
    const { spitter, projectiles, system } = setup();
    const victim = target(-2, -10);
    const attacks: Array<{ targetId: string; damage: number }> = [];
    system.step([victim], (_source, targetId, damage) =>
      attacks.push({ targetId, damage }),
    );
    expect(spitter.attackWarningEvent).toBe(1);
    expect(projectiles.size).toBe(0);
    for (
      let tick = 0;
      tick < millisecondsToTicks(SPITTER.attackWindupMilliseconds);
      tick += 1
    )
      system.step([victim], (_source, targetId, damage) =>
        attacks.push({ targetId, damage }),
      );
    expect(spitter.attackEvent).toBe(1);
    expect(projectiles.size).toBe(1);
    expect(attacks).toEqual([]);

    for (let tick = 0; tick < 40 && attacks.length === 0; tick += 1)
      system.step([victim], (_source, targetId, damage) =>
        attacks.push({ targetId, damage }),
      );
    expect(attacks).toEqual([
      { targetId: 'dog', damage: SPITTER.attackDamage },
    ]);
    expect(projectiles.size).toBe(0);
  });

  it('requires readable range and line of sight before warning or firing', () => {
    const { spitter, system, projectiles } = setup();
    spitter.x = -28;
    spitter.z = 0;
    const hidden = target(-20, 0);
    for (let tick = 0; tick < 30; tick += 1) system.step([hidden], () => {});
    expect(spitter.attackWarningEvent).toBe(0);
    expect(projectiles.size).toBe(0);
  });

  it('allows a warned player to sidestep the projectile until it expires', () => {
    const { system, projectiles, spitter } = setup();
    const victim = target(-2, -10);
    system.step([victim], () => {});
    for (
      let tick = 0;
      tick < millisecondsToTicks(SPITTER.attackWindupMilliseconds);
      tick += 1
    )
      system.step([victim], () => {});
    expect(projectiles.size).toBe(1);
    spitter.alive = false;
    const dodged = target(-2, -5);
    const attacks: unknown[] = [];
    for (
      let tick = 0;
      tick < millisecondsToTicks(SPITTER.projectileLifetimeMilliseconds) + 2;
      tick += 1
    )
      system.step([dodged], (...event) => attacks.push(event));
    expect(attacks).toEqual([]);
    expect(projectiles.size).toBe(0);
  });

  it('destroys projectiles on authored collision', () => {
    const { system, projectiles } = setup();
    projectiles.spawn({
      id: 'wall-shot',
      ownerId: 'spitter',
      x: -28,
      z: 0,
      velocityX: SPITTER.projectileSpeedMetresPerSecond,
      velocityZ: 0,
      collisionRadius: SPITTER.projectileRadius,
      damage: SPITTER.attackDamage,
      lifetimeTicks: 100,
    });
    for (let tick = 0; tick < 20 && projectiles.size > 0; tick += 1)
      system.step([], () => {});
    expect(projectiles.size).toBe(0);
  });

  it('enforces a hard projectile cap and clears without residue', () => {
    const { projectiles, state } = setup();
    for (let index = 0; index < CREATURE_PROJECTILE_CAP; index += 1) {
      expect(
        projectiles.spawn({
          id: `cap-${index}`,
          ownerId: 'spitter',
          x: 0,
          z: 0,
          velocityX: 1,
          velocityZ: 0,
          collisionRadius: SPITTER.projectileRadius,
          damage: 1,
          lifetimeTicks: 3,
        }),
      ).not.toBeNull();
    }
    expect(
      projectiles.spawn({
        id: 'over-cap',
        ownerId: 'spitter',
        x: 0,
        z: 0,
        velocityX: 1,
        velocityZ: 0,
        collisionRadius: 0.2,
        damage: 1,
        lifetimeTicks: 3,
      }),
    ).toBeNull();
    projectiles.clear();
    expect(projectiles.size).toBe(0);
    expect(state.creatureProjectiles.size).toBe(0);
  });
});
