import { describe, expect, it } from 'vitest';

import { resolveLastStanding } from '../shared/match';

describe('last-player-standing result', () => {
  it.each([2, 3, 4])(
    'selects the sole survivor in every %i-player elimination position',
    (count) => {
      for (let winner = 0; winner < count; winner += 1) {
        const players = Array.from({ length: count }, (_, index) => ({
          id: `player-${index}`,
          alive: index === winner,
        }));
        expect(resolveLastStanding(players)).toEqual({
          kind: 'winner',
          winnerPlayerId: `player-${winner}`,
        });
      }
    },
  );

  it.each([2, 3, 4])('draws when all %i players die together', (count) => {
    expect(
      resolveLastStanding(
        Array.from({ length: count }, (_, index) => ({
          id: `player-${index}`,
          alive: false,
        })),
      ),
    ).toEqual({ kind: 'draw', winnerPlayerId: '' });
  });

  it('stays ongoing while at least two players live', () => {
    expect(
      resolveLastStanding([
        { id: 'a', alive: true },
        { id: 'b', alive: true },
        { id: 'c', alive: false },
      ]).kind,
    ).toBe('ongoing');
  });

  it('keeps a living solo tester active and ends when that dog dies', () => {
    expect(resolveLastStanding([{ id: 'solo', alive: true }])).toEqual({
      kind: 'ongoing',
      winnerPlayerId: '',
    });
    expect(resolveLastStanding([{ id: 'solo', alive: false }])).toEqual({
      kind: 'draw',
      winnerPlayerId: '',
    });
  });
});
