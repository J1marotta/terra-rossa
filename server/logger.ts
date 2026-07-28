export interface LogFields {
  [key: string]: boolean | number | string | undefined;
}

export interface GameLogger {
  info(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

function write(level: 'error' | 'info', event: string, fields: LogFields = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === 'error') console.error(entry);
  else console.log(entry);
}

export const consoleLogger: GameLogger = {
  info: (event, fields) => write('info', event, fields),
  error: (event, fields) => write('error', event, fields),
};
