import { MapSchema, schema, type SchemaType } from '@colyseus/schema';

import { PROTOCOL_VERSION } from './protocol';

export const PlayerState = schema(
  {
    id: 'string',
    sessionId: 'string',
    displayName: 'string',
    ready: 'boolean',
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
    reloadTicksElapsed: 'uint16',
    reloadCompletionTick: 'uint16',
    reloadAttempted: 'boolean',
    reloadOutcome: 'string',
    reloadEvent: 'uint32',
    reloadResultTicksRemaining: 'uint8',
    meleeWindupTicksRemaining: 'uint8',
    meleeRecoveryTicksRemaining: 'uint8',
    meleeAngleRadians: 'float32',
    meleeEvent: 'uint32',
    meleeTargetId: 'string',
    health: 'float32',
    maximumHealth: 'float32',
    alive: 'boolean',
    eliminationEvent: 'uint32',
    eliminatedById: 'string',
  },
  'PlayerState',
);

export type PlayerStateInstance = SchemaType<typeof PlayerState>;

export const GameRoomState = schema(
  {
    protocolVersion: 'string',
    phase: 'string',
    roomCode: 'string',
    hostPlayerId: 'string',
    startApprovedEvent: 'uint32',
    players: { map: PlayerState },
  },
  'GameRoomState',
);

export type GameRoomStateInstance = SchemaType<typeof GameRoomState>;

export function createGameRoomState(): GameRoomStateInstance {
  const state = new GameRoomState();
  state.protocolVersion = PROTOCOL_VERSION;
  state.phase = 'waiting';
  state.roomCode = '';
  state.hostPlayerId = '';
  state.startApprovedEvent = 0;
  state.players = new MapSchema<PlayerStateInstance>();
  return state;
}
