import { normalizeAngleRadians } from './coordinates';
import { requireIntegerInRange, requireNumberInRange } from './numeric';
import { PROTOCOL_VERSION } from './protocol';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_SEQUENCE = 0xffff_ffff;

export type CommandType =
  | 'ready'
  | 'start'
  | 'move'
  | 'aim'
  | 'dash'
  | 'fire'
  | 'reload_start'
  | 'reload_attempt'
  | 'melee'
  | 'interact'
  | 'rematch'
  | 'leave';

interface CommandPayloads {
  ready: { readonly ready: boolean };
  start: Record<string, never>;
  move: { readonly x: number; readonly z: number };
  aim: { readonly angleRadians: number };
  dash: Record<string, never>;
  fire: Record<string, never>;
  reload_start: Record<string, never>;
  reload_attempt: Record<string, never>;
  melee: Record<string, never>;
  interact: Record<string, never>;
  rematch: Record<string, never>;
  leave: Record<string, never>;
}

export type GameCommand<T extends CommandType = CommandType> = {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly roomId: string;
  readonly matchId: string | null;
  readonly sequence: number;
  readonly type: T;
  readonly payload: CommandPayloads[T];
};

export type ProtocolErrorCode =
  | 'malformed_command'
  | 'unknown_command'
  | 'protocol_mismatch'
  | 'wrong_room'
  | 'wrong_match'
  | 'stale_sequence';

export interface ProtocolErrorEnvelope {
  readonly type: 'protocol_error';
  readonly code: ProtocolErrorCode;
  readonly message: string;
  readonly sequence: number | null;
}

export type CommandValidation =
  | { readonly ok: true; readonly command: GameCommand }
  | { readonly ok: false; readonly error: ProtocolErrorEnvelope };

export interface CommandContext {
  readonly roomId: string;
  readonly matchId: string | null;
}

const COMMAND_TYPES = new Set<CommandType>([
  'ready',
  'start',
  'move',
  'aim',
  'dash',
  'fire',
  'reload_start',
  'reload_attempt',
  'melee',
  'interact',
  'rematch',
  'leave',
]);

function error(
  code: ProtocolErrorCode,
  message: string,
  sequence: number | null = null,
): CommandValidation {
  return {
    ok: false,
    error: Object.freeze({ type: 'protocol_error', code, message, sequence }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
) {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function parsePayload(
  type: CommandType,
  value: unknown,
): CommandPayloads[CommandType] {
  if (!isRecord(value)) throw new TypeError('payload must be an object.');

  if (type === 'ready') {
    if (!hasExactKeys(value, ['ready']) || typeof value.ready !== 'boolean') {
      throw new TypeError(
        'ready payload must contain only a boolean ready field.',
      );
    }
    return Object.freeze({ ready: value.ready });
  }

  if (type === 'move') {
    if (!hasExactKeys(value, ['x', 'z'])) {
      throw new TypeError('move payload must contain only x and z.');
    }
    const x = requireNumberInRange('move.x', value.x, -1, 1);
    const z = requireNumberInRange('move.z', value.z, -1, 1);
    if (x * x + z * z > 1.000_001) {
      throw new RangeError('move vector magnitude cannot exceed 1.');
    }
    return Object.freeze({ x, z });
  }

  if (type === 'aim') {
    if (!hasExactKeys(value, ['angleRadians'])) {
      throw new TypeError('aim payload must contain only angleRadians.');
    }
    const angleRadians = requireNumberInRange(
      'aim.angleRadians',
      value.angleRadians,
      -Math.PI,
      Math.PI,
    );
    return Object.freeze({ angleRadians: normalizeAngleRadians(angleRadians) });
  }

  if (!hasExactKeys(value, [])) {
    throw new TypeError(`${type} payload must be empty.`);
  }
  return Object.freeze({});
}

export function parseCommand(value: unknown): CommandValidation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'protocolVersion',
      'roomId',
      'matchId',
      'sequence',
      'type',
      'payload',
    ])
  ) {
    return error('malformed_command', 'Command envelope has invalid fields.');
  }
  if (value.protocolVersion !== PROTOCOL_VERSION) {
    return error(
      'protocol_mismatch',
      `Client protocol must be ${PROTOCOL_VERSION}; received ${String(value.protocolVersion)}.`,
    );
  }
  if (
    typeof value.type !== 'string' ||
    !COMMAND_TYPES.has(value.type as CommandType)
  ) {
    return error('unknown_command', `Unknown command: ${String(value.type)}.`);
  }
  if (!validId(value.roomId)) {
    return error(
      'malformed_command',
      'roomId must be 1-64 safe ID characters.',
    );
  }
  if (value.matchId !== null && !validId(value.matchId)) {
    return error(
      'malformed_command',
      'matchId must be null or 1-64 safe ID characters.',
    );
  }

  let sequence: number;
  try {
    sequence = requireIntegerInRange(
      'sequence',
      value.sequence,
      0,
      MAX_SEQUENCE,
    );
    const type = value.type as CommandType;
    const payload = parsePayload(type, value.payload);
    return {
      ok: true,
      command: Object.freeze({
        protocolVersion: PROTOCOL_VERSION,
        roomId: value.roomId,
        matchId: value.matchId,
        sequence,
        type,
        payload,
      }) as GameCommand,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return error('malformed_command', message, null);
  }
}

export class CommandOrder {
  #lastAccepted = -1;

  get lastAccepted() {
    return this.#lastAccepted;
  }

  accept(sequence: number): boolean {
    requireIntegerInRange('sequence', sequence, 0, MAX_SEQUENCE);
    if (sequence <= this.#lastAccepted) return false;
    this.#lastAccepted = sequence;
    return true;
  }
}

export function validateCommand(
  value: unknown,
  context: CommandContext,
  order: CommandOrder,
): CommandValidation {
  const parsed = parseCommand(value);
  if (!parsed.ok) return parsed;
  const { command } = parsed;
  if (command.roomId !== context.roomId) {
    return error(
      'wrong_room',
      `Command room ${command.roomId} does not match ${context.roomId}.`,
      command.sequence,
    );
  }
  if (command.matchId !== context.matchId) {
    return error(
      'wrong_match',
      `Command match ${String(command.matchId)} does not match ${String(context.matchId)}.`,
      command.sequence,
    );
  }
  if (!order.accept(command.sequence)) {
    return error(
      'stale_sequence',
      `Sequence ${command.sequence} was already handled or arrived out of order.`,
      command.sequence,
    );
  }
  return parsed;
}

export function createCommand<T extends CommandType>(
  context: CommandContext,
  sequence: number,
  type: T,
  payload: CommandPayloads[T],
): GameCommand<T> {
  const parsed = parseCommand({
    protocolVersion: PROTOCOL_VERSION,
    roomId: context.roomId,
    matchId: context.matchId,
    sequence,
    type,
    payload,
  });
  if (!parsed.ok) throw new TypeError(parsed.error.message);
  return parsed.command as GameCommand<T>;
}
