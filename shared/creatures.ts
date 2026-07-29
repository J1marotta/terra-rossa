export const CREATURE_POPULATION_CAP = 48;

export interface CreatureTarget {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly alive: boolean;
}

export interface CreatureSpawn {
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly z: number;
  readonly collisionRadius: number;
  readonly speedMetresPerSecond: number;
  readonly maximumHealth: number;
}

export interface CreatureDamageResult {
  readonly applied: boolean;
  readonly killed: boolean;
  readonly healthAfter: number;
}
