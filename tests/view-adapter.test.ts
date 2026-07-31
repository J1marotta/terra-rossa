import { describe, expect, it } from 'vitest';

import { adaptRoomState } from '../client/src/multiplayer/viewAdapter';
import {
  CreatureProjectileState,
  CreatureState,
  PlayerState,
  createGameRoomState,
} from '../shared/state';

describe('room view adapter', () => {
  it('copies schema state into immutable renderer data', () => {
    const state = createGameRoomState();
    const player = new PlayerState();
    player.id = 'player-b';
    player.sessionId = 'session-local';
    player.displayName = 'Scout';
    player.ready = true;
    player.connected = true;
    player.disconnectEvent = 0;
    player.x = 12;
    player.z = -4;
    player.spawnRegionId = 'northwest';
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
    player.reloadTicksElapsed = 4;
    player.reloadCompletionTick = 45;
    player.reloadAttempted = false;
    player.reloadOutcome = 'normal';
    player.reloadEvent = 1;
    player.reloadResultTicksRemaining = 12;
    player.meleeWindupTicksRemaining = 2;
    player.meleeRecoveryTicksRemaining = 0;
    player.meleeAngleRadians = 1;
    player.meleeEvent = 3;
    player.meleeTargetId = 'player-a';
    player.health = 76;
    player.maximumHealth = 100;
    player.alive = true;
    player.eliminationEvent = 0;
    player.eliminatedById = '';
    player.pickupEvent = 1;
    player.pickupKind = 'ammo';
    state.players.set(player.id, player);

    const view = adaptRoomState(state, 'session-local');

    expect(view.players).toEqual([
      {
        id: 'player-b',
        displayName: 'Scout',
        ready: true,
        connected: true,
        disconnectEvent: 0,
        isLocal: true,
        positionVisible: true,
        x: 12,
        z: -4,
        spawnRegionId: 'northwest',
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
        reloadTicksElapsed: 4,
        reloadCompletionTick: 45,
        reloadAttempted: false,
        reloadOutcome: 'normal',
        reloadEvent: 1,
        reloadResultTicksRemaining: 12,
        meleeWindupTicksRemaining: 2,
        meleeRecoveryTicksRemaining: 0,
        meleeAngleRadians: 1,
        meleeEvent: 3,
        meleeTargetId: 'player-a',
        health: 76,
        maximumHealth: 100,
        alive: true,
        eliminationEvent: 0,
        eliminatedById: '',
        pickupEvent: 1,
        pickupKind: 'ammo',
      },
    ]);
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.players)).toBe(true);
    expect(Object.isFrozen(view.players[0])).toBe(true);

    player.displayName = 'Changed on server';
    expect(view.players[0]?.displayName).toBe('Scout');
  });

  it('keeps hidden schema coordinates out of renderer-facing positions', () => {
    const state = createGameRoomState();
    const player = new PlayerState();
    player.id = 'hidden';
    player.sessionId = 'remote';
    player.displayName = 'Hidden dog';
    Object.defineProperty(player, 'x', { value: undefined });
    Object.defineProperty(player, 'z', { value: undefined });
    state.players.set(player.id, player);

    const view = adaptRoomState(state, 'local');

    expect(view.players[0]).toMatchObject({
      id: 'hidden',
      positionVisible: false,
      x: 0,
      z: 0,
    });
  });

  it('adapts visible swarmers into immutable presentation data', () => {
    const state = createGameRoomState();
    const creature = new CreatureState();
    Object.assign(creature, {
      id: 'swarmer-1',
      kind: 'swarmer',
      x: 3,
      z: 4,
      health: 12,
      maximumHealth: 36,
      alive: true,
      hitEvent: 2,
      deathEvent: 0,
      attackWindupTicksRemaining: 8,
      attackWarningEvent: 1,
      attackEvent: 0,
    });
    state.creatures.set(creature.id, creature);

    const view = adaptRoomState(state, 'none');

    expect(view.creatures).toEqual([
      {
        id: 'swarmer-1',
        kind: 'swarmer',
        positionVisible: true,
        x: 3,
        z: 4,
        health: 12,
        maximumHealth: 36,
        alive: true,
        hitEvent: 2,
        deathEvent: 0,
        attackWindupTicksRemaining: 8,
        attackWarningEvent: 1,
        attackEvent: 0,
      },
    ]);
    expect(Object.isFrozen(view.creatures)).toBe(true);
    expect(Object.isFrozen(view.creatures[0])).toBe(true);
  });

  it('keeps hidden projectiles out of drawable presentation state', () => {
    const state = createGameRoomState();
    const projectile = new CreatureProjectileState();
    projectile.id = 'hidden-shot';
    projectile.ownerId = 'spitter';
    Object.defineProperty(projectile, 'x', { value: undefined });
    Object.defineProperty(projectile, 'z', { value: undefined });
    state.creatureProjectiles.set(projectile.id, projectile);

    const view = adaptRoomState(state, 'none');

    expect(view.creatureProjectiles).toEqual([
      {
        id: 'hidden-shot',
        positionVisible: false,
        x: 0,
        z: 0,
      },
    ]);
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
