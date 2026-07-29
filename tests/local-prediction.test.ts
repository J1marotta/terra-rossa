import { describe, expect, it } from 'vitest';

import {
  HARD_SNAP_METRES,
  LocalPrediction,
} from '../client/src/game/LocalPrediction';
import { movementVectorFromKeys } from '../client/src/input/MovementInput';
import { LatencyHarness } from './support/latency-harness';

describe('local movement prediction', () => {
  it('turns WASD state into a normalized independent movement vector', () => {
    const diagonal = movementVectorFromKeys(new Set(['KeyW', 'KeyD']));
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(diagonal.z).toBeCloseTo(-Math.SQRT1_2, 12);
    expect(movementVectorFromKeys(new Set(['KeyA', 'KeyD']))).toEqual({
      x: 0,
      z: 0,
    });
  });

  it('moves immediately before a 150ms round-trip acknowledgement', () => {
    const prediction = new LocalPrediction();
    prediction.reconcile(-20, -10, -1);
    for (let sequence = 0; sequence < 5; sequence += 1) {
      prediction.predict(sequence, 1, 0);
    }
    expect(prediction.sample(0)?.x).toBeGreaterThan(-20);
    expect(prediction.pendingCount).toBe(5);

    const roundTrip = new LatencyHarness<{
      x: number;
      z: number;
      acknowledgement: number;
    }>(150, [0, 20, -10]);
    roundTrip.send({ x: -19.4, z: -10, acknowledgement: 2 });
    expect(roundTrip.advance(149)).toEqual([]);
    const authoritative = roundTrip.advance(21)[0];
    expect(authoritative).toBeDefined();
    if (authoritative === undefined) return;
    const result = prediction.reconcile(
      authoritative.x,
      authoritative.z,
      authoritative.acknowledgement,
    );
    expect(result).toBe('none');
    expect(prediction.pendingCount).toBe(2);
    expect(prediction.sample(0)?.x).toBeCloseTo(-19, 8);
  });

  it('softly corrects ordinary drift without snapping', () => {
    const prediction = new LocalPrediction();
    prediction.reconcile(-20, -10, -1);
    prediction.predict(0, 1, 0);
    const before = prediction.sample(0)?.x ?? 0;
    expect(prediction.reconcile(before - 0.25, -10, 0)).toBe('soft');
    const firstFrame = prediction.sample(1 / 60)?.x ?? 0;
    expect(firstFrame).toBeLessThan(before);
    expect(firstFrame).toBeGreaterThan(before - 0.25);
  });

  it('hard-snaps a deliberately illegal local divergence', () => {
    const prediction = new LocalPrediction();
    prediction.reconcile(-20, -10, -1);
    const steps = Math.ceil(HARD_SNAP_METRES / 0.2) + 2;
    for (let sequence = 0; sequence < steps; sequence += 1) {
      prediction.predict(sequence, 1, 0);
    }
    expect(prediction.reconcile(-20, -10, steps - 1)).toBe('hard');
    expect(prediction.sample(0)).toEqual({ x: -20, z: -10 });
    expect(prediction.pendingCount).toBe(0);
  });
});
