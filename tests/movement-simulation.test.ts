import { describe, expect, it } from 'vitest';

import {
  FixedStepAccumulator,
  PLAYER_COLLISION_RADIUS,
  PLAYER_SPEED_METRES_PER_SECOND,
  applyMovementInput,
  integratePlayerMovement,
  type MovingPlayer,
} from '../shared/movement';
import { FIXED_STEP_SECONDS } from '../shared/time';

function player(overrides: Partial<MovingPlayer> = {}): MovingPlayer {
  return {
    x: -20,
    z: -10,
    moveX: 0,
    moveZ: 0,
    speed: PLAYER_SPEED_METRES_PER_SECOND,
    collisionRadius: PLAYER_COLLISION_RADIUS,
    lastProcessedSequence: -1,
    ...overrides,
  };
}

describe('authoritative movement simulation', () => {
  it('moves at configured metres per second over fixed steps', () => {
    const dog = player();
    applyMovementInput(dog, 1, 0, 4);
    for (let tick = 0; tick < 30; tick += 1) integratePlayerMovement(dog);
    expect(dog.x).toBeCloseTo(-14, 8);
    expect(dog.z).toBe(-10);
    expect(dog.lastProcessedSequence).toBe(4);
  });

  it('normalizes diagonal input even when called below the protocol boundary', () => {
    const cardinal = player();
    const diagonal = player();
    applyMovementInput(cardinal, 1, 0, 1);
    applyMovementInput(diagonal, 1, 1, 1);
    integratePlayerMovement(cardinal);
    integratePlayerMovement(diagonal);
    expect(Math.hypot(diagonal.x + 20, diagonal.z + 10)).toBeCloseTo(
      PLAYER_SPEED_METRES_PER_SECOND * FIXED_STEP_SECONDS,
      8,
    );
    expect(cardinal.x + 20).toBeCloseTo(
      PLAYER_SPEED_METRES_PER_SECOND * FIXED_STEP_SECONDS,
      8,
    );
  });

  it('keeps the collision circle inside map bounds', () => {
    const dog = player({ x: 29.4, z: 0, moveX: 1 });
    for (let tick = 0; tick < 10; tick += 1) integratePlayerMovement(dog);
    expect(dog.x).toBe(30 - PLAYER_COLLISION_RADIUS);
  });

  it('blocks obstacles and preserves sliding on the free axis', () => {
    const dog = player({ x: -5, z: -17, moveX: 1, moveZ: 0.5 });
    for (let tick = 0; tick < 12; tick += 1) integratePlayerMovement(dog);
    expect(dog.x).toBeLessThanOrEqual(-4 - PLAYER_COLLISION_RADIUS);
    expect(dog.z).toBeGreaterThan(-17);
  });

  it('produces equal fixed work across different elapsed-time partitions', () => {
    const run = (partitions: readonly number[]) => {
      const dog = player();
      dog.moveX = 1;
      const accumulator = new FixedStepAccumulator();
      let steps = 0;
      partitions.forEach((milliseconds) => {
        steps += accumulator.advance(milliseconds, () =>
          integratePlayerMovement(dog),
        );
      });
      return { x: dog.x, steps };
    };
    expect(run([1_000])).toEqual(run(Array.from({ length: 100 }, () => 10)));
    expect(run([1_000]).steps).toBe(30);
  });

  it('updates four players independently', () => {
    const dogs = [
      player({ moveX: 1 }),
      player({ moveX: -1 }),
      player({ moveZ: 1 }),
      player({ moveZ: -1 }),
    ];
    dogs.forEach((dog) => integratePlayerMovement(dog));
    expect(new Set(dogs.map((dog) => `${dog.x},${dog.z}`)).size).toBe(4);
  });
});
