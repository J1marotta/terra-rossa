import { describe, expect, it, vi } from 'vitest';

import {
  PlayerPresentationRegistry,
  PositionSnapshotBuffer,
} from '../client/src/game/PlayerPresentation';
import type { PlayerView } from '../client/src/multiplayer/types';

const view = (
  id: string,
  x: number,
  z: number,
  isLocal = false,
): PlayerView => ({
  id,
  displayName: id,
  ready: false,
  connected: true,
  disconnectEvent: 0,
  isLocal,
  positionVisible: true,
  x,
  z,
  spawnRegionId: 'northwest',
  lastProcessedSequence: 0,
  dashX: 0,
  dashZ: 0,
  dashTicksRemaining: 0,
  dashCooldownTicksRemaining: 0,
  dashRecoveryTicksRemaining: 0,
  dashEvent: 0,
  aimAngleRadians: 0,
  weaponId: 'red-hollow-pistol',
  magazineAmmo: 8,
  reserveAmmo: 32,
  shotEvent: 0,
  dryFireEvent: 0,
  shotEndX: 0,
  shotEndZ: 0,
  shotTargetId: '',
  reloadTicksElapsed: 0,
  reloadCompletionTick: 0,
  reloadAttempted: false,
  reloadOutcome: 'none',
  reloadEvent: 0,
  reloadResultTicksRemaining: 0,
  meleeWindupTicksRemaining: 0,
  meleeRecoveryTicksRemaining: 0,
  meleeAngleRadians: 0,
  meleeEvent: 0,
  meleeTargetId: '',
  health: 100,
  maximumHealth: 100,
  alive: true,
  eliminationEvent: 0,
  eliminatedById: '',
  pickupEvent: 0,
  pickupKind: '',
  activityCueEvent: 0,
  activityCueKind: '',
  activityCueDirection: '',
  activityCueTicksRemaining: 0,
});

describe('remote position presentation', () => {
  it('interpolates by elapsed time instead of render-frame count', () => {
    const buffer = new PositionSnapshotBuffer();
    buffer.push(0, 0, 100);
    buffer.push(10, 20, 200);
    expect(buffer.sample(250, 100)).toEqual({ x: 5, z: 10 });
    expect(buffer.sample(175, 0)).toEqual({ x: 7.5, z: 15 });
  });

  it('holds the oldest or newest snapshot outside buffered time', () => {
    const buffer = new PositionSnapshotBuffer();
    buffer.push(2, 3, 100);
    buffer.push(4, 7, 200);
    expect(buffer.sample(0, 0)).toEqual({ x: 2, z: 3 });
    expect(buffer.sample(1_000, 0)).toEqual({ x: 4, z: 7 });
  });

  it('reuses stable IDs and disposes a leaving player exactly once', () => {
    const registry = new PlayerPresentationRegistry<{ id: string }>();
    const create = vi.fn((player: PlayerView) => ({ id: player.id }));
    const dispose = vi.fn();
    registry.reconcile(
      [view('a', 0, 0), view('b', 1, 1)],
      100,
      create,
      dispose,
    );
    registry.reconcile(
      [view('a', 2, 2), view('b', 3, 3)],
      150,
      create,
      dispose,
    );
    expect(create).toHaveBeenCalledTimes(2);

    registry.reconcile([view('a', 4, 4)], 200, create, dispose);
    registry.reconcile([view('a', 5, 5)], 250, create, dispose);
    expect(dispose).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledWith({ id: 'b' });
    expect(registry.size).toBe(1);
  });

  it('disposes every remaining object once during teardown', () => {
    const registry = new PlayerPresentationRegistry<{ id: string }>();
    const dispose = vi.fn();
    registry.reconcile(
      [view('a', 0, 0), view('b', 1, 1)],
      100,
      (player) => ({
        id: player.id,
      }),
      dispose,
    );
    registry.disposeAll(dispose);
    registry.disposeAll(dispose);
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});
