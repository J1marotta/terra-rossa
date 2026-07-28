import { describe, expect, it } from 'vitest';

import { GAME_NAME } from '../shared';

describe('workspace', () => {
  it('shares framework-neutral values with tests', () => {
    expect(GAME_NAME).toBe('Terra Rossa');
  });
});
