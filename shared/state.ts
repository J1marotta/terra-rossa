import { MapSchema, schema, type SchemaType } from '@colyseus/schema';

import { PROTOCOL_VERSION } from './protocol';

export const PlayerState = schema(
  {
    id: 'string',
    sessionId: 'string',
    displayName: 'string',
    ready: 'boolean',
    connected: 'boolean',
    disconnectEvent: 'uint32',
    x: { type: 'float32', view: 1 },
    z: { type: 'float32', view: 1 },
    spawnRegionId: { type: 'string', view: 2 },
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

export const CreatureState = schema(
  {
    id: 'string',
    kind: 'string',
    x: { type: 'float32', view: 1 },
    z: { type: 'float32', view: 1 },
    collisionRadius: 'float32',
    speedMetresPerSecond: 'float32',
    health: 'float32',
    maximumHealth: 'float32',
    targetId: 'string',
    alive: 'boolean',
    hitEvent: 'uint32',
    deathEvent: 'uint32',
    attackWindupTicksRemaining: 'uint16',
    attackCooldownTicksRemaining: 'uint16',
    attackWarningEvent: 'uint32',
    attackEvent: 'uint32',
  },
  'CreatureState',
);

export type CreatureStateInstance = SchemaType<typeof CreatureState>;

export const GameRoomState = schema(
  {
    protocolVersion: 'string',
    phase: 'string',
    roomCode: 'string',
    hostPlayerId: 'string',
    startApprovedEvent: 'uint32',
    matchSeed: 'uint32',
    matchId: 'string',
    roundNumber: 'uint16',
    countdownTicksRemaining: 'uint16',
    resultKind: 'string',
    winnerPlayerId: 'string',
    resultEvent: 'uint32',
    players: { map: PlayerState },
    creatures: { map: CreatureState },
  },
  'GameRoomState',
);

export type GameRoomStateInstance = SchemaType<typeof GameRoomState>;

export function createGameRoomState(): GameRoomStateInstance {
  const state = new GameRoomState();
  state.protocolVersion = PROTOCOL_VERSION;
  state.phase = 'lobby';
  state.roomCode = '';
  state.hostPlayerId = '';
  state.startApprovedEvent = 0;
  state.matchSeed = 0;
  state.matchId = '';
  state.roundNumber = 0;
  state.countdownTicksRemaining = 0;
  state.resultKind = '';
  state.winnerPlayerId = '';
  state.resultEvent = 0;
  state.players = new MapSchema<PlayerStateInstance>();
  state.creatures = new MapSchema<CreatureStateInstance>();
  return state;
}
