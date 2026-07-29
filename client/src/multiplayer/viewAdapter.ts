import type { GameRoomStateInstance } from '../../../shared/state';
import type { PlayerView, RoomView } from './types';

export function adaptRoomState(
  state: GameRoomStateInstance,
  localSessionId: string,
): RoomView {
  const players: PlayerView[] = [];
  state.players.forEach((player) => {
    players.push(
      Object.freeze({
        id: player.id,
        displayName: player.displayName,
        ready: player.ready,
        isLocal: player.sessionId === localSessionId,
        x: player.x,
        z: player.z,
        spawnRegionId: player.spawnRegionId,
        lastProcessedSequence: player.lastProcessedSequence,
        dashTicksRemaining: player.dashTicksRemaining,
        dashCooldownTicksRemaining: player.dashCooldownTicksRemaining,
        dashRecoveryTicksRemaining: player.dashRecoveryTicksRemaining,
        dashX: player.dashX,
        dashZ: player.dashZ,
        dashEvent: player.dashEvent,
        aimAngleRadians: player.aimAngleRadians,
        magazineAmmo: player.magazineAmmo,
        reserveAmmo: player.reserveAmmo,
        shotEvent: player.shotEvent,
        dryFireEvent: player.dryFireEvent,
        shotEndX: player.shotEndX,
        shotEndZ: player.shotEndZ,
        shotTargetId: player.shotTargetId,
        reloadTicksElapsed: player.reloadTicksElapsed,
        reloadCompletionTick: player.reloadCompletionTick,
        reloadAttempted: player.reloadAttempted,
        reloadOutcome: player.reloadOutcome,
        reloadEvent: player.reloadEvent,
        reloadResultTicksRemaining: player.reloadResultTicksRemaining,
        meleeWindupTicksRemaining: player.meleeWindupTicksRemaining,
        meleeRecoveryTicksRemaining: player.meleeRecoveryTicksRemaining,
        meleeAngleRadians: player.meleeAngleRadians,
        meleeEvent: player.meleeEvent,
        meleeTargetId: player.meleeTargetId,
        health: player.health,
        maximumHealth: player.maximumHealth,
        alive: player.alive,
        eliminationEvent: player.eliminationEvent,
        eliminatedById: player.eliminatedById,
      }),
    );
  });
  players.sort((left, right) => left.id.localeCompare(right.id));

  return Object.freeze({
    protocolVersion: state.protocolVersion,
    phase: state.phase,
    roomCode: state.roomCode,
    hostPlayerId: state.hostPlayerId,
    startApprovedEvent: state.startApprovedEvent,
    matchSeed: state.matchSeed,
    players: Object.freeze(players),
  });
}
