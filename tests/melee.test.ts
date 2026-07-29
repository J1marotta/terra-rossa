import { describe, expect, it } from 'vitest';

import { selectMeleeTarget } from '../shared/melee';

const source = { id: 'source', x: -20, z: -10, aimAngleRadians: 0 };

describe('melee target selection', () => {
  it('selects the closest target in the forward arc', () => {
    const target = selectMeleeTarget(source, [
      { id: 'far', x: -18.2, z: -10, radius: 0.55 },
      { id: 'near', x: -18.8, z: -10.2, radius: 0.55 },
    ]);
    expect(target?.id).toBe('near');
  });

  it('rejects targets outside range or behind the attacker', () => {
    expect(
      selectMeleeTarget(source, [{ id: 'far', x: -17, z: -10, radius: 0.55 }]),
    ).toBeNull();
    expect(
      selectMeleeTarget(source, [
        { id: 'behind', x: -21, z: -10, radius: 0.55 },
      ]),
    ).toBeNull();
  });

  it('does not strike through authored obstacles', () => {
    expect(
      selectMeleeTarget({ id: 'source', x: -27.5, z: 0, aimAngleRadians: 0 }, [
        { id: 'blocked', x: -25.8, z: 0, radius: 0.3 },
      ]),
    ).toBeNull();
  });
});
