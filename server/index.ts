import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';

const port = 2567;
const gameServer = new Server({
  transport: new WebSocketTransport(),
});

await gameServer.listen(port);
console.log(`Terra Rossa server listening on port ${port}.`);
