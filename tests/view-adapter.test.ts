import { describe, expect, it } from 'vitest';

import { adaptRoomState } from '../client/src/multiplayer/viewAdapter';
import { PlayerState, createGameRoomState } from '../shared/state';

describe('room view adapter', () => {
  it('copies schema state into immutable renderer data', () => {
    const state = createGameRoomState();
    const player = new PlayerState();
    player.id = 'player-b';
    player.sessionId = 'session-local';
    player.displayName = 'Scout';
    player.x = 12;
    player.z = -4;
    player.lastProcessedSequence = 7;
    player.dashX = 1;
    player.dashZ = 0;
    player.dashTicksRemaining = 3;
    player.dashCooldownTicksRemaining = 20;
    player.dashRecoveryTicksRemaining = 0;
    player.dashEvent = 2;
    player.aimAngleRadians = 1;
    player.magazineAmmo = 7;
    player.reserveAmmo = 32;
    player.shotEvent = 1;
    player.dryFireEvent = 0;
    player.shotEndX = 15;
    player.shotEndZ = -4;
    player.shotTargetId = 'player-a';
    state.players.set(player.id, player);

    const view = adaptRoomState(state, 'session-local');

    expect(view.players).toEqual([
      {
        id: 'player-b',
        displayName: 'Scout',
        isLocal: true,
        x: 12,
        z: -4,
        lastProcessedSequence: 7,
        dashX: 1,
        dashZ: 0,
        dashTicksRemaining: 3,
        dashCooldownTicksRemaining: 20,
        dashRecoveryTicksRemaining: 0,
        dashEvent: 2,
        aimAngleRadians: 1,
        magazineAmmo: 7,
        reserveAmmo: 32,
        shotEvent: 1,
        dryFireEvent: 0,
        shotEndX: 15,
        shotEndZ: -4,
        shotTargetId: 'player-a',
      },
    ]);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.players)).toBe(true);
    expect(Object.isFrozen(view.players[0])).toBe(true);

    player.displayName = 'Changed on server';
    expect(view.players[0]?.displayName).toBe('Scout');
  });

  it('sorts stable player IDs without changing schema insertion order', () => {
    const state = createGameRoomState();
    for (const id of ['z-player', 'a-player']) {
      const player = new PlayerState();
      player.id = id;
      player.sessionId = id;
      player.displayName = id;
      state.players.set(id, player);
    }

    const view = adaptRoomState(state, 'none');

    expect(view.players.map((player) => player.id)).toEqual([
      'a-player',
      'z-player',
    ]);
    expect([...state.players.keys()]).toEqual(['z-player', 'a-player']);
  });
});
