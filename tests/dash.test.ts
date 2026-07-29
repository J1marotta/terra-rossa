import { describe, expect, it } from 'vitest';

import { LocalPrediction } from '../client/src/game/LocalPrediction';
import {
  DASH_COOLDOWN_TICKS,
  DASH_DISTANCE_METRES,
  DASH_DURATION_TICKS,
  DASH_RECOVERY_TICKS,
  PLAYER_COLLISION_RADIUS,
  PLAYER_SPEED_METRES_PER_SECOND,
  attemptDash,
  integratePlayerMovement,
  type MovingPlayer,
} from '../shared/movement';

function player(overrides: Partial<MovingPlayer> = {}): MovingPlayer {
  return {
    x: -20,
    z: -10,
    moveX: 1,
    moveZ: 0,
    speed: PLAYER_SPEED_METRES_PER_SECOND,
    collisionRadius: PLAYER_COLLISION_RADIUS,
    lastProcessedSequence: -1,
    dashX: 0,
    dashZ: 0,
    dashTicksRemaining: 0,
    dashCooldownTicksRemaining: 0,
    dashRecoveryTicksRemaining: 0,
    dashEvent: 0,
    ...overrides,
  };
}

describe('authoritative dash', () => {
  it('travels exactly its configured open-ground distance', () => {
    const dog = player();
    expect(attemptDash(dog)).toBe(true);
    for (let tick = 0; tick < DASH_DURATION_TICKS; tick += 1) {
      integratePlayerMovement(dog);
    }
    expect(dog.x).toBeCloseTo(-20 + DASH_DISTANCE_METRES, 8);
    expect(dog.dashTicksRemaining).toBe(0);
    expect(dog.dashRecoveryTicksRemaining).toBe(DASH_RECOVERY_TICKS);
    expect(dog.dashEvent).toBe(1);
  });

  it('cannot be repeated until server cooldown and recovery expire', () => {
    const dog = player();
    expect(attemptDash(dog)).toBe(true);
    expect(attemptDash(dog)).toBe(false);
    expect(dog.dashEvent).toBe(1);
    for (let tick = 0; tick < DASH_COOLDOWN_TICKS; tick += 1) {
      integratePlayerMovement(dog);
      expect(attemptDash(dog)).toBe(tick === DASH_COOLDOWN_TICKS - 1);
      if (tick === DASH_COOLDOWN_TICKS - 1) break;
    }
    expect(dog.dashEvent).toBe(2);
  });

  it('stops at collision geometry instead of crossing it', () => {
    const dog = player({ x: -5, z: -17 });
    expect(attemptDash(dog)).toBe(true);
    for (let tick = 0; tick < DASH_DURATION_TICKS; tick += 1) {
      integratePlayerMovement(dog);
    }
    expect(dog.x).toBeLessThanOrEqual(-4 - PLAYER_COLLISION_RADIUS);
  });

  it('keeps the full collision circle inside map bounds', () => {
    const dog = player({ x: 28, z: -10 });
    expect(attemptDash(dog)).toBe(true);
    for (let tick = 0; tick < DASH_DURATION_TICKS; tick += 1) {
      integratePlayerMovement(dog);
    }
    expect(dog.x).toBe(30 - PLAYER_COLLISION_RADIUS);
  });

  it('requires movement intent and grants no invulnerability state', () => {
    const dog = player({ moveX: 0 });
    expect(attemptDash(dog)).toBe(false);
    expect(Object.keys(dog).some((key) => /invulner/i.test(key))).toBe(false);
  });

  it('predicts presentation immediately but reconciles to server legality', () => {
    const prediction = new LocalPrediction();
    prediction.reconcile(-20, -10, -1);
    prediction.predict(0, 1, 0);
    expect(prediction.predictDash(1)).toBe(true);
    prediction.predict(2, 1, 0);
    expect(prediction.sample(0)?.x).toBeGreaterThan(-19.5);

    const result = prediction.reconcile(-19.05, -10, 2, {
      dashX: 1,
      dashZ: 0,
      dashTicksRemaining: DASH_DURATION_TICKS - 1,
      dashCooldownTicksRemaining: DASH_COOLDOWN_TICKS - 1,
      dashRecoveryTicksRemaining: 0,
      dashEvent: 1,
    });
    expect(result).not.toBe('hard');
  });
});
