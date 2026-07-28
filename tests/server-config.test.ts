import { describe, expect, it } from 'vitest';

import { resolveServerConfig } from '../server/config';

describe('server configuration', () => {
  it('starts locally without hosted credentials', () => {
    expect(resolveServerConfig({})).toEqual({
      environment: 'development',
      host: '127.0.0.1',
      port: 2567,
      allowedOrigins: ['http://localhost:5173'],
      health: { service: 'terra-rossa-server', version: 'dev' },
    });
  });

  it('loads test values from the provided source only', () => {
    expect(
      resolveServerConfig({
        APP_ENV: 'test',
        HOST: '0.0.0.0',
        PORT: '3000',
        ALLOWED_ORIGINS: 'http://one.test,https://two.test',
        SERVICE_NAME: 'test-server',
        SERVICE_VERSION: 'test-sha',
      }),
    ).toMatchObject({
      environment: 'test',
      host: '0.0.0.0',
      port: 3000,
      allowedOrigins: ['http://one.test', 'https://two.test'],
      health: { service: 'test-server', version: 'test-sha' },
    });
  });

  it('rejects missing hosted metadata and invalid ports', () => {
    expect(() => resolveServerConfig({ APP_ENV: 'production' })).toThrow(
      'ALLOWED_ORIGINS is required',
    );
    expect(() => resolveServerConfig({ PORT: '70000' })).toThrow('PORT');
  });
});
