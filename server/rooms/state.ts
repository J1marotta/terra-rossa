import { MapSchema, schema, type SchemaType } from '@colyseus/schema';

import { PROTOCOL_VERSION } from '../../shared/protocol';

export const PlayerState = schema(
  {
    id: 'string',
    sessionId: 'string',
    displayName: 'string',
  },
  'PlayerState',
);

export type PlayerStateInstance = SchemaType<typeof PlayerState>;

export const GameRoomState = schema(
  {
    protocolVersion: 'string',
    phase: 'string',
    players: { map: PlayerState },
  },
  'GameRoomState',
);

export type GameRoomStateInstance = SchemaType<typeof GameRoomState>;

export function createGameRoomState(): GameRoomStateInstance {
  const state = new GameRoomState();
  state.protocolVersion = PROTOCOL_VERSION;
  state.phase = 'waiting';
  state.players = new MapSchema<PlayerStateInstance>();
  return state;
}
