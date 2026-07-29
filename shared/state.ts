import { MapSchema, schema, type SchemaType } from '@colyseus/schema';

import { PROTOCOL_VERSION } from './protocol';

export const PlayerState = schema(
  {
    id: 'string',
    sessionId: 'string',
    displayName: 'string',
    x: 'float32',
    z: 'float32',
    moveX: 'float32',
    moveZ: 'float32',
    speed: 'float32',
    collisionRadius: 'float32',
    lastProcessedSequence: 'int64',
    dashX: 'float32',
    dashZ: 'float32',
    dashTicksRemaining: 'uint8',
    dashCooldownTicksRemaining: 'uint16',
    dashRecoveryTicksRemaining: 'uint8',
    dashEvent: 'uint32',
    aimAngleRadians: 'float32',
    magazineAmmo: 'uint16',
    reserveAmmo: 'uint16',
    fireCooldownTicksRemaining: 'uint16',
    shotEvent: 'uint32',
    dryFireEvent: 'uint32',
    shotEndX: 'float32',
    shotEndZ: 'float32',
    shotTargetId: 'string',
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
