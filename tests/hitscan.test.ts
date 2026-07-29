import { describe, expect, it } from 'vitest';

import { traceHitscan } from '../shared/hitscan';
import { TERRA_ROSSA_MAP } from '../shared/map';

describe('server hitscan', () => {
  it('selects the nearest target inside range', () => {
    const hit = traceHitscan(TERRA_ROSSA_MAP, -20, -10, 0, 22, [
      { id: 'far', x: -10, z: -10, radius: 0.55 },
      { id: 'near', x: -15, z: -10, radius: 0.55 },
    ]);
    expect(hit.targetId).toBe('near');
    expect(hit.distance).toBeCloseTo(4.45, 6);
  });

  it('stops at authored cover before a player', () => {
    const hit = traceHitscan(TERRA_ROSSA_MAP, -28, 0, 0, 22, [
      { id: 'behind-wall', x: -20, z: 0, radius: 0.55 },
    ]);
    expect(hit.targetId).toBeNull();
    expect(hit.endX).toBeCloseTo(-26.5, 6);
  });

  it('expires exactly at weapon range when nothing is hit', () => {
    const hit = traceHitscan(TERRA_ROSSA_MAP, -20, -10, -Math.PI / 2, 8, []);
    expect(hit.targetId).toBeNull();
    expect(hit.distance).toBe(8);
    expect(hit.endZ).toBeCloseTo(-18, 6);
  });
});
