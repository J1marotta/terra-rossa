import { STARTING_PISTOL } from './combat';
import { FIXED_STEP_MILLISECONDS, millisecondsToTicks } from './time';

export type ReloadOutcome = 'none' | 'normal' | 'good' | 'perfect' | 'failed';

export interface ReloadingPlayer {
  magazineAmmo: number;
  reserveAmmo: number;
  reloadTicksElapsed: number;
  reloadCompletionTick: number;
  reloadAttempted: boolean;
  reloadOutcome: string;
  reloadEvent: number;
}

export const MAX_RELOAD_COMPENSATION_MILLISECONDS = 150;

export function initializeReloadState(player: ReloadingPlayer) {
  player.reloadTicksElapsed = 0;
  player.reloadCompletionTick = 0;
  player.reloadAttempted = false;
  player.reloadOutcome = 'none';
  player.reloadEvent = 0;
}

export function startReload(player: ReloadingPlayer) {
  if (
    player.reloadCompletionTick > 0 ||
    player.magazineAmmo >= STARTING_PISTOL.magazineSize ||
    player.reserveAmmo === 0
  ) {
    return false;
  }
  player.reloadTicksElapsed = 0;
  player.reloadCompletionTick = millisecondsToTicks(
    STARTING_PISTOL.reload.durationMilliseconds,
  );
  player.reloadAttempted = false;
  player.reloadOutcome = 'normal';
  player.reloadEvent += 1;
  return true;
}

export function attemptActiveReload(
  player: ReloadingPlayer,
  clientElapsedMilliseconds: number,
) {
  if (player.reloadCompletionTick === 0 || player.reloadAttempted) return false;
  player.reloadAttempted = true;
  const serverElapsed = player.reloadTicksElapsed * FIXED_STEP_MILLISECONDS;
  const compensatedElapsed = Math.max(
    serverElapsed - MAX_RELOAD_COMPENSATION_MILLISECONDS,
    Math.min(
      clientElapsedMilliseconds,
      serverElapsed + MAX_RELOAD_COMPENSATION_MILLISECONDS,
    ),
  );
  const timing = STARTING_PISTOL.reload;
  if (
    compensatedElapsed >= timing.perfectWindowStartMilliseconds &&
    compensatedElapsed <= timing.perfectWindowEndMilliseconds
  ) {
    player.reloadOutcome = 'perfect';
    player.reloadCompletionTick =
      player.reloadTicksElapsed +
      millisecondsToTicks(timing.perfectCompletionDelayMilliseconds);
  } else if (
    compensatedElapsed >= timing.attemptWindowStartMilliseconds &&
    compensatedElapsed <= timing.attemptWindowEndMilliseconds
  ) {
    player.reloadOutcome = 'good';
    player.reloadCompletionTick =
      player.reloadTicksElapsed +
      millisecondsToTicks(timing.goodCompletionDelayMilliseconds);
  } else {
    player.reloadOutcome = 'failed';
    player.reloadCompletionTick = millisecondsToTicks(
      timing.durationMilliseconds + timing.fumblePenaltyMilliseconds,
    );
  }
  player.reloadEvent += 1;
  completeReloadIfDue(player);
  return true;
}

export function advanceReload(player: ReloadingPlayer) {
  if (player.reloadCompletionTick === 0) return false;
  player.reloadTicksElapsed += 1;
  return completeReloadIfDue(player);
}

function completeReloadIfDue(player: ReloadingPlayer) {
  if (
    player.reloadCompletionTick === 0 ||
    player.reloadTicksElapsed < player.reloadCompletionTick
  ) {
    return false;
  }
  const missing = STARTING_PISTOL.magazineSize - player.magazineAmmo;
  const transferred = Math.min(missing, player.reserveAmmo);
  player.magazineAmmo += transferred;
  player.reserveAmmo -= transferred;
  player.reloadCompletionTick = 0;
  player.reloadEvent += 1;
  return true;
}
