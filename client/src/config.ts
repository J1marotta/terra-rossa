export type ClientEnvironment =
  'development' | 'test' | 'staging' | 'production';

export interface ClientConfig {
  environment: ClientEnvironment;
  colyseusUrl: string;
  serviceVersion: string;
}

type ClientEnvironmentSource = Readonly<
  Record<string, string | boolean | undefined>
>;

const LOCAL_COLYSEUS_URL = 'ws://localhost:2567';

function isHosted(environment: ClientEnvironment) {
  return environment === 'staging' || environment === 'production';
}

export function resolveClientConfig(
  source: ClientEnvironmentSource,
): ClientConfig {
  const environment = source.MODE;

  if (
    environment !== 'development' &&
    environment !== 'test' &&
    environment !== 'staging' &&
    environment !== 'production'
  ) {
    throw new Error(`Unsupported client environment: ${String(environment)}`);
  }

  const configuredUrl = source.VITE_COLYSEUS_URL;
  const colyseusUrl =
    typeof configuredUrl === 'string' && configuredUrl.length > 0
      ? configuredUrl
      : isHosted(environment)
        ? undefined
        : LOCAL_COLYSEUS_URL;

  if (colyseusUrl === undefined) {
    throw new Error('VITE_COLYSEUS_URL is required for hosted builds.');
  }

  const url = new URL(colyseusUrl);
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('VITE_COLYSEUS_URL must use ws:// or wss://.');
  }

  if (isHosted(environment)) {
    if (url.protocol !== 'wss:') {
      throw new Error(
        'Hosted builds require a secure wss:// Colyseus endpoint.',
      );
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      throw new Error(
        'Hosted builds cannot connect to a local Colyseus endpoint.',
      );
    }
  }

  const configuredVersion = source.VITE_SERVICE_VERSION;
  const serviceVersion =
    typeof configuredVersion === 'string' && configuredVersion.length > 0
      ? configuredVersion
      : isHosted(environment)
        ? undefined
        : 'dev';
  if (serviceVersion === undefined) {
    throw new Error('VITE_SERVICE_VERSION is required for hosted builds.');
  }

  return {
    environment,
    colyseusUrl: url.toString().replace(/\/$/, ''),
    serviceVersion,
  };
}

export const clientConfig = resolveClientConfig(import.meta.env);
