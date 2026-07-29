export type LastStandingResult =
  | { readonly kind: 'ongoing'; readonly winnerPlayerId: '' }
  | { readonly kind: 'winner'; readonly winnerPlayerId: string }
  | { readonly kind: 'draw'; readonly winnerPlayerId: '' };

export function resolveLastStanding(
  players: readonly { readonly id: string; readonly alive: boolean }[],
): LastStandingResult {
  if (players.length < 2) return { kind: 'ongoing', winnerPlayerId: '' };
  const living = players.filter((player) => player.alive);
  if (living.length > 1) return { kind: 'ongoing', winnerPlayerId: '' };
  if (living.length === 1) {
    return { kind: 'winner', winnerPlayerId: living[0]?.id ?? '' };
  }
  return { kind: 'draw', winnerPlayerId: '' };
}
