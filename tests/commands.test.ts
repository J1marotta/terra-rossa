import { describe, expect, it } from 'vitest';

import {
  CommandOrder,
  PROTOCOL_VERSION,
  createCommand,
  parseCommand,
  validateCommand,
  type CommandContext,
  type CommandType,
} from '../shared';

const context: CommandContext = { roomId: 'room_1', matchId: 'match_1' };

const examples: ReadonlyArray<readonly [CommandType, Record<string, unknown>]> =
  [
    ['ready', { ready: true }],
    ['start', {}],
    ['move', { x: 0.5, z: -0.5 }],
    ['aim', { angleRadians: Math.PI / 2 }],
    ['dash', {}],
    ['fire', {}],
    ['reload_start', {}],
    ['reload_attempt', { clientElapsedMilliseconds: 1_000 }],
    ['melee', {}],
    ['interact', {}],
    ['rematch', {}],
    ['leave', {}],
  ];

describe('command protocol', () => {
  it.each(examples)(
    'round-trips a %s command through JSON',
    (type, payload) => {
      const parsed = parseCommand({
        protocolVersion: PROTOCOL_VERSION,
        ...context,
        sequence: 12,
        type,
        payload,
      });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) throw new Error(parsed.error.message);
      expect(parseCommand(JSON.parse(JSON.stringify(parsed.command)))).toEqual(
        parsed,
      );
    },
  );

  it('rejects unknown types and malformed envelope fields', () => {
    const base = createCommand(context, 1, 'fire', {});
    expect(parseCommand({ ...base, type: 'teleport' })).toMatchObject({
      ok: false,
      error: { code: 'unknown_command' },
    });
    expect(parseCommand({ ...base, damage: 999 })).toMatchObject({
      ok: false,
      error: { code: 'malformed_command' },
    });
  });

  it('rejects authoritative outcomes embedded in payloads', () => {
    const base = createCommand(context, 1, 'fire', {});
    expect(
      parseCommand({
        ...base,
        payload: { damage: 999, hitPlayerId: 'victim' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'malformed_command' } });
  });

  it.each([
    { x: Number.NaN, z: 0 },
    { x: Number.POSITIVE_INFINITY, z: 0 },
    { x: 1, z: 1 },
    { x: 1.01, z: 0 },
  ])('rejects malformed movement $x,$z', (payload) => {
    const base = createCommand(context, 1, 'fire', {});
    expect(parseCommand({ ...base, type: 'move', payload })).toMatchObject({
      ok: false,
      error: { code: 'malformed_command' },
    });
  });

  it('rejects wrong room and match without consuming sequence', () => {
    const order = new CommandOrder();
    const command = createCommand(context, 4, 'dash', {});
    expect(
      validateCommand(command, { ...context, roomId: 'other' }, order),
    ).toMatchObject({ ok: false, error: { code: 'wrong_room' } });
    expect(
      validateCommand(command, { ...context, matchId: 'other' }, order),
    ).toMatchObject({ ok: false, error: { code: 'wrong_match' } });
    expect(order.lastAccepted).toBe(-1);
    expect(validateCommand(command, context, order).ok).toBe(true);
  });

  it('accepts only strictly increasing sequences', () => {
    const order = new CommandOrder();
    const command = (sequence: number) =>
      createCommand(context, sequence, 'melee', {});

    expect(validateCommand(command(2), context, order).ok).toBe(true);
    for (const sequence of [2, 1]) {
      expect(validateCommand(command(sequence), context, order)).toMatchObject({
        ok: false,
        error: { code: 'stale_sequence', sequence },
      });
    }
    expect(validateCommand(command(3), context, order).ok).toBe(true);
  });

  it('returns actionable protocol mismatch errors', () => {
    const command = createCommand(context, 1, 'leave', {});
    expect(parseCommand({ ...command, protocolVersion: 'old' })).toMatchObject({
      ok: false,
      error: { code: 'protocol_mismatch' },
    });
  });
});
