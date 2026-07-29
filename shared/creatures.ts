export const CREATURE_POPULATION_CAP = 48;
export const SWARMER = Object.freeze({
  kind: 'swarmer',
  collisionRadius: 0.42,
  speedMetresPerSecond: 3.4,
  maximumHealth: 36,
  attackRangeMetres: 1.15,
  attackDamage: 12,
  attackWindupMilliseconds: 400,
  attackCooldownMilliseconds: 900,
  separationPaddingMetres: 0.18,
});

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
