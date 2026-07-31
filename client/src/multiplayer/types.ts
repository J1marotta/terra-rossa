export type ConnectionStatus =
  'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

export interface PlayerView {
  readonly id: string;
  readonly displayName: string;
  readonly visualSlot: number;
  readonly ready: boolean;
  readonly connected: boolean;
  readonly disconnectEvent: number;
  readonly isLocal: boolean;
  readonly positionVisible: boolean;
  readonly x: number;
  readonly z: number;
  readonly spawnRegionId: string;
  readonly lastProcessedSequence: number;
  readonly dashTicksRemaining: number;
  readonly dashCooldownTicksRemaining: number;
  readonly dashRecoveryTicksRemaining: number;
  readonly dashX: number;
  readonly dashZ: number;
  readonly dashEvent: number;
  readonly aimAngleRadians: number;
  readonly weaponId: string;
  readonly magazineAmmo: number;
  readonly reserveAmmo: number;
  readonly shotEvent: number;
  readonly dryFireEvent: number;
  readonly shotEndX: number;
  readonly shotEndZ: number;
  readonly shotTargetId: string;
  readonly reloadTicksElapsed: number;
  readonly reloadCompletionTick: number;
  readonly reloadAttempted: boolean;
  readonly reloadOutcome: string;
  readonly reloadEvent: number;
  readonly reloadResultTicksRemaining: number;
  readonly meleeWindupTicksRemaining: number;
  readonly meleeRecoveryTicksRemaining: number;
  readonly meleeAngleRadians: number;
  readonly meleeEvent: number;
  readonly meleeTargetId: string;
  readonly health: number;
  readonly maximumHealth: number;
  readonly alive: boolean;
  readonly eliminationEvent: number;
  readonly eliminatedById: string;
  readonly pickupEvent: number;
  readonly pickupKind: string;
  readonly activityCueEvent: number;
  readonly activityCueKind: string;
  readonly activityCueDirection: string;
  readonly activityCueTicksRemaining: number;
}

export interface CreatureView {
  readonly id: string;
  readonly kind: string;
  readonly positionVisible: boolean;
  readonly x: number;
  readonly z: number;
  readonly health: number;
  readonly maximumHealth: number;
  readonly alive: boolean;
  readonly hitEvent: number;
  readonly deathEvent: number;
  readonly attackWindupTicksRemaining: number;
  readonly attackWarningEvent: number;
  readonly attackEvent: number;
}

export interface CreatureProjectileView {
  readonly id: string;
  readonly positionVisible: boolean;
  readonly x: number;
  readonly z: number;
}

export interface PickupView {
  readonly id: string;
  readonly kind: string;
  readonly positionVisible: boolean;
  readonly x: number;
  readonly z: number;
}

export interface RoomView {
  readonly protocolVersion: string;
  readonly phase: string;
  readonly roomCode: string;
  readonly soloTesting: boolean;
  readonly hostPlayerId: string;
  readonly startApprovedEvent: number;
  readonly matchSeed: number;
  readonly matchId: string;
  readonly roundNumber: number;
  readonly countdownTicksRemaining: number;
  readonly resultKind: string;
  readonly winnerPlayerId: string;
  readonly resultEvent: number;
  readonly creaturePopulation: number;
  readonly creatureUpdateMilliseconds: number;
  readonly visibilityRadiusMetres: number;
  readonly darknessStage: number;
  readonly darknessElapsedTicks: number;
  readonly darknessNextStageTick: number;
  readonly darknessHalfWidth: number;
  readonly darknessHalfDepth: number;
  readonly darknessDamagePerSecond: number;
  readonly darknessWarningEvent: number;
  readonly telemetryCreatureDamageToPlayers: number;
  readonly telemetryPlayerDamageToCreatures: number;
  readonly telemetryPvpDeathsUnderCreaturePressure: number;
  readonly telemetryAmmoExpended: number;
  readonly telemetryLastEncounterRegion: string;
  readonly simulationP50Milliseconds: number;
  readonly simulationP95Milliseconds: number;
  readonly simulationP99Milliseconds: number;
  readonly serverEntityCount: number;
  readonly serverHeapMegabytes: number;
  readonly players: readonly PlayerView[];
  readonly creatures: readonly CreatureView[];
  readonly creatureProjectiles: readonly CreatureProjectileView[];
  readonly pickups: readonly PickupView[];
}

export interface ConnectionSnapshot {
  readonly status: ConnectionStatus;
  readonly room: RoomView | null;
  readonly error: string | null;
}
