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
