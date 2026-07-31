import { describe, expect, it } from 'vitest';

import { evaluateBrowserSupport } from '../client/src/browserSupport';

describe('Chrome-only browser support', () => {
  it('accepts current desktop Chrome identities', () => {
    expect(
      evaluateBrowserSupport(
        'Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
      ).supported,
    ).toBe(true);
  });

  it.each([
    'Mozilla/5.0 Firefox/141.0',
    'Mozilla/5.0 AppleWebKit/537.36 Edg/140.0 Chrome/140.0',
    'Mozilla/5.0 Safari/605.1.15',
  ])('rejects unsupported browser identity %s', (userAgent) => {
    const result = evaluateBrowserSupport(userAgent);
    expect(result.supported).toBe(false);
    expect(result.message).toContain('Google Chrome');
  });
});
