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
export const SPITTER = Object.freeze({
  kind: 'spitter',
  collisionRadius: 0.38,
  speedMetresPerSecond: 2.2,
  maximumHealth: 24,
  preferredRangeMetres: 9,
  minimumRangeMetres: 5,
  maximumRangeMetres: 13,
  attackDamage: 18,
  attackWindupMilliseconds: 650,
  attackCooldownMilliseconds: 1_500,
  projectileSpeedMetresPerSecond: 8,
  projectileRadius: 0.22,
  projectileLifetimeMilliseconds: 2_200,
});
export const CREATURE_PROJECTILE_CAP = 64;

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
