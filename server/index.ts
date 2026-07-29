import { pathToFileURL } from 'node:url';

import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Application } from 'express';

import { GAME_ROOM_NAME, PROTOCOL_VERSION } from '../shared/protocol';
import { loadServerConfig, type ServerConfig } from './config';
import { consoleLogger, type GameLogger } from './logger';
import { GameRoom } from './rooms/GameRoom';
import { resolvePrivateRoom } from './roomRegistry';

export interface GameServer {
  app: Application;
  gameServer: Server;
  transport: WebSocketTransport;
}

export function createGameServer(
  config: ServerConfig,
  logger: GameLogger = consoleLogger,
): GameServer {
  const transport = new WebSocketTransport({
    maxPayload: 4_096,
    pingInterval: 10_000,
    pingMaxRetries: 2,
  });
  const gameServer = new Server({ transport });
  const app = transport.getExpressApp();

  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (origin !== undefined && !config.allowedOrigins.includes(origin)) {
      response.status(403).json({ ok: false, error: 'origin_not_allowed' });
      return;
    }
    if (origin !== undefined) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    next();
  });

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: config.health.service,
      version: config.health.version,
      environment: config.environment,
      protocolVersion: PROTOCOL_VERSION,
    });
  });

  app.get('/rooms/:code', (request, response) => {
    const code = request.params.code?.toUpperCase() ?? '';
    if (!/^[A-Z2-9]{6}$/.test(code)) {
      response.status(400).json({ ok: false, error: 'invalid_code' });
      return;
    }
    const room = resolvePrivateRoom(code);
    if (room === null) {
      response.status(404).json({ ok: false, error: 'missing_room' });
    } else if (room.closed) {
      response.status(410).json({ ok: false, error: 'closed_room' });
    } else if (room.playerCount >= 4) {
      response.status(409).json({ ok: false, error: 'full_room' });
    } else {
      response.json({ ok: true, roomId: room.roomId });
    }
  });

  gameServer.define(GAME_ROOM_NAME, GameRoom, { logger });
  return { app, gameServer, transport };
}

export async function startGameServer(
  config: ServerConfig = loadServerConfig(),
  logger: GameLogger = consoleLogger,
) {
  const server = createGameServer(config, logger);
  await server.gameServer.listen(config.port, config.host);
  logger.info('server_started', {
    environment: config.environment,
    host: config.host,
    port: config.port,
    service: config.health.service,
    version: config.health.version,
  });
  return server;
}

async function run() {
  const logger = consoleLogger;
  const server = await startGameServer(loadServerConfig(), logger);
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('server_shutdown_started', { signal });
    try {
      await server.gameServer.gracefullyShutdown(false);
      logger.info('server_shutdown_complete', { signal });
      process.exitCode = 0;
    } catch (error) {
      logger.error('server_shutdown_failed', {
        signal,
        error: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

const launchedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (launchedDirectly) await run();
