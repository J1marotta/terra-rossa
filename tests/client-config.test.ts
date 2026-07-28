import { describe, expect, it } from 'vitest';

import { resolveClientConfig } from '../client/src/config';

describe('client configuration', () => {
  it('uses the local server by default during development', () => {
    expect(resolveClientConfig({ MODE: 'development' }).colyseusUrl).toBe(
      'ws://localhost:2567',
    );
  });

  it('requires a public secure endpoint in production', () => {
    expect(() => resolveClientConfig({ MODE: 'production' })).toThrow(
      'required for hosted builds',
    );
    expect(() =>
      resolveClientConfig({
        MODE: 'production',
        VITE_COLYSEUS_URL: 'ws://localhost:2567',
      }),
    ).toThrow('secure wss');
  });

  it('accepts an explicit hosted endpoint', () => {
    expect(
      resolveClientConfig({
        MODE: 'staging',
        VITE_COLYSEUS_URL: 'wss://game.example.test',
      }).colyseusUrl,
    ).toBe('wss://game.example.test');
  });
});
