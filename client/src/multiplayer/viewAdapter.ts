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
        isLocal: player.sessionId === localSessionId,
        x: player.x,
        z: player.z,
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
      }),
    );
  });
  players.sort((left, right) => left.id.localeCompare(right.id));

  return Object.freeze({
    protocolVersion: state.protocolVersion,
    phase: state.phase,
    players: Object.freeze(players),
  });
}
