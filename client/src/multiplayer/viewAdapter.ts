import type { GameRoomStateInstance } from '../../../shared/state';
import type {
  CreatureProjectileView,
  CreatureView,
  PlayerView,
  RoomView,
} from './types';

export function adaptRoomState(
  state: GameRoomStateInstance,
  localSessionId: string,
): RoomView {
  const players: PlayerView[] = [];
  state.players.forEach((player) => {
    const positionVisible =
      Number.isFinite(player.x) && Number.isFinite(player.z);
    players.push(
      Object.freeze({
        id: player.id,
        displayName: player.displayName,
        ready: player.ready,
        connected: player.connected,
        disconnectEvent: player.disconnectEvent,
        isLocal: player.sessionId === localSessionId,
        positionVisible,
        x: positionVisible ? player.x : 0,
        z: positionVisible ? player.z : 0,
        spawnRegionId: player.spawnRegionId ?? '',
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
  const creatures: CreatureView[] = [];
  state.creatures.forEach((creature) => {
    const positionVisible =
      Number.isFinite(creature.x) && Number.isFinite(creature.z);
    creatures.push(
      Object.freeze({
        id: creature.id,
        kind: creature.kind,
        positionVisible,
        x: positionVisible ? creature.x : 0,
        z: positionVisible ? creature.z : 0,
        health: creature.health,
        maximumHealth: creature.maximumHealth,
        alive: creature.alive,
        hitEvent: creature.hitEvent,
        deathEvent: creature.deathEvent,
        attackWindupTicksRemaining: creature.attackWindupTicksRemaining,
        attackWarningEvent: creature.attackWarningEvent,
        attackEvent: creature.attackEvent,
      }),
    );
  });
  creatures.sort((left, right) => left.id.localeCompare(right.id));
  const creatureProjectiles: CreatureProjectileView[] = [];
  state.creatureProjectiles.forEach((projectile) => {
    const positionVisible =
      Number.isFinite(projectile.x) && Number.isFinite(projectile.z);
    creatureProjectiles.push(
      Object.freeze({
        id: projectile.id,
        positionVisible,
        x: positionVisible ? projectile.x : 0,
        z: positionVisible ? projectile.z : 0,
      }),
    );
  });
  creatureProjectiles.sort((left, right) => left.id.localeCompare(right.id));

  return Object.freeze({
    protocolVersion: state.protocolVersion,
    phase: state.phase,
    roomCode: state.roomCode,
    hostPlayerId: state.hostPlayerId,
    startApprovedEvent: state.startApprovedEvent,
    matchSeed: state.matchSeed,
    matchId: state.matchId,
    roundNumber: state.roundNumber,
    countdownTicksRemaining: state.countdownTicksRemaining,
    resultKind: state.resultKind,
    winnerPlayerId: state.winnerPlayerId,
    resultEvent: state.resultEvent,
    creaturePopulation: state.creaturePopulation,
    creatureUpdateMilliseconds: state.creatureUpdateMilliseconds,
    players: Object.freeze(players),
    creatures: Object.freeze(creatures),
    creatureProjectiles: Object.freeze(creatureProjectiles),
  });
}
