import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';

import { loadServerConfig } from './config';

const config = loadServerConfig();
const gameServer = new Server({
  transport: new WebSocketTransport(),
});

await gameServer.listen(config.port);
console.log(
  `${config.health.service} ${config.health.version} listening on ${config.host}:${config.port} (${config.environment}).`,
);
