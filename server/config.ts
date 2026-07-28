export type ServerEnvironment =
  'development' | 'test' | 'staging' | 'production';

export interface ServerConfig {
  environment: ServerEnvironment;
  host: string;
  port: number;
  allowedOrigins: readonly string[];
  health: {
    service: string;
    version: string;
  };
}

type ServerEnvironmentSource = Readonly<Record<string, string | undefined>>;

const VALID_ENVIRONMENTS = new Set<ServerEnvironment>([
  'development',
  'test',
  'staging',
  'production',
]);

function requiredHostedValue(
  source: ServerEnvironmentSource,
  name: string,
  environment: ServerEnvironment,
  fallback: string,
) {
  const value = source[name]?.trim();
  if (value) return value;
  if (environment === 'staging' || environment === 'production') {
    throw new Error(`${name} is required when APP_ENV is ${environment}.`);
  }
  return fallback;
}

export function resolveServerConfig(
  source: ServerEnvironmentSource,
): ServerConfig {
  const environment = source.APP_ENV ?? 'development';
  if (!VALID_ENVIRONMENTS.has(environment as ServerEnvironment)) {
    throw new Error(
      `APP_ENV must be development, test, staging, or production.`,
    );
  }

  const typedEnvironment = environment as ServerEnvironment;
  const port = Number(source.PORT ?? '2567');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const origins = requiredHostedValue(
    source,
    'ALLOWED_ORIGINS',
    typedEnvironment,
    'http://localhost:5173',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must contain at least one origin.');
  }
  for (const origin of origins) {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      (url.protocol !== 'http:' && url.protocol !== 'https:')
    ) {
      throw new Error(`Invalid allowed origin: ${origin}`);
    }
  }

  return {
    environment: typedEnvironment,
    host: source.HOST?.trim() || '127.0.0.1',
    port,
    allowedOrigins: origins,
    health: {
      service: requiredHostedValue(
        source,
        'SERVICE_NAME',
        typedEnvironment,
        'terra-rossa-server',
      ),
      version: requiredHostedValue(
        source,
        'SERVICE_VERSION',
        typedEnvironment,
        'dev',
      ),
    },
  };
}

export function loadServerConfig(): ServerConfig {
  return resolveServerConfig(process.env);
}
