export type DamageCause = 'firearm' | 'melee' | 'creature' | 'darkness';

export interface ReloadTimingDefinition {
  durationMilliseconds: number;
  attemptWindowStartMilliseconds: number;
  attemptWindowEndMilliseconds: number;
  perfectWindowStartMilliseconds: number;
  perfectWindowEndMilliseconds: number;
  fumblePenaltyMilliseconds: number;
}

export interface HitscanWeaponDefinition {
  id: string;
  displayName: string;
  damage: number;
  fireIntervalMilliseconds: number;
  magazineSize: number;
  reserveSize: number;
  rangeMetres: number;
  spreadRadians: number;
  knockbackMetresPerSecond: number;
  reload: ReloadTimingDefinition;
}

export const STARTING_PISTOL = validateWeaponDefinition({
  id: 'red-hollow-pistol',
  displayName: 'Red Hollow Pistol',
  damage: 24,
  fireIntervalMilliseconds: 240,
  magazineSize: 8,
  reserveSize: 32,
  rangeMetres: 22,
  spreadRadians: 0.025,
  knockbackMetresPerSecond: 2.5,
  reload: {
    durationMilliseconds: 1_500,
    attemptWindowStartMilliseconds: 850,
    attemptWindowEndMilliseconds: 1_200,
    perfectWindowStartMilliseconds: 960,
    perfectWindowEndMilliseconds: 1_080,
    fumblePenaltyMilliseconds: 500,
  },
});

function requireFinitePositive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite number greater than zero`);
  }
}

function requirePositiveInteger(value: number, field: string) {
  requireFinitePositive(value, field);
  if (!Number.isInteger(value)) throw new Error(`${field} must be an integer`);
}

export function validateWeaponDefinition(
  definition: HitscanWeaponDefinition,
): Readonly<HitscanWeaponDefinition> {
  if (!definition.id.trim()) throw new Error('weapon id is required');
  if (!definition.displayName.trim()) {
    throw new Error('weapon displayName is required');
  }
  requireFinitePositive(definition.damage, 'damage');
  requireFinitePositive(
    definition.fireIntervalMilliseconds,
    'fireIntervalMilliseconds',
  );
  requirePositiveInteger(definition.magazineSize, 'magazineSize');
  requirePositiveInteger(definition.reserveSize, 'reserveSize');
  requireFinitePositive(definition.rangeMetres, 'rangeMetres');
  requireFinitePositive(definition.spreadRadians, 'spreadRadians');
  if (definition.spreadRadians >= Math.PI) {
    throw new Error('spreadRadians must be less than PI');
  }
  requireFinitePositive(
    definition.knockbackMetresPerSecond,
    'knockbackMetresPerSecond',
  );

  const reload = definition.reload;
  requireFinitePositive(
    reload.durationMilliseconds,
    'reload.durationMilliseconds',
  );
  requireFinitePositive(
    reload.attemptWindowStartMilliseconds,
    'reload.attemptWindowStartMilliseconds',
  );
  requireFinitePositive(
    reload.attemptWindowEndMilliseconds,
    'reload.attemptWindowEndMilliseconds',
  );
  requireFinitePositive(
    reload.perfectWindowStartMilliseconds,
    'reload.perfectWindowStartMilliseconds',
  );
  requireFinitePositive(
    reload.perfectWindowEndMilliseconds,
    'reload.perfectWindowEndMilliseconds',
  );
  requireFinitePositive(
    reload.fumblePenaltyMilliseconds,
    'reload.fumblePenaltyMilliseconds',
  );
  if (
    reload.attemptWindowStartMilliseconds >=
      reload.attemptWindowEndMilliseconds ||
    reload.attemptWindowEndMilliseconds > reload.durationMilliseconds
  ) {
    throw new Error(
      'reload attempt window must be ordered within reload duration',
    );
  }
  if (
    reload.perfectWindowStartMilliseconds >=
      reload.perfectWindowEndMilliseconds ||
    reload.perfectWindowStartMilliseconds <
      reload.attemptWindowStartMilliseconds ||
    reload.perfectWindowEndMilliseconds > reload.attemptWindowEndMilliseconds
  ) {
    throw new Error(
      'reload perfect window must be ordered inside attempt window',
    );
  }

  return Object.freeze({
    ...definition,
    reload: Object.freeze({ ...definition.reload }),
  });
}

export interface DamageEvent {
  id: string;
  sourceId: string;
  targetId: string;
  cause: DamageCause;
  amount: number;
  occurredAtTick: number;
  order: number;
}

export interface Damageable {
  id: string;
  health: number;
  maximumHealth: number;
}

export interface AppliedDamage {
  event: DamageEvent;
  healthBefore: number;
  healthAfter: number;
}

export function resolveDamageEvents(
  targets: ReadonlyMap<string, Damageable>,
  events: readonly DamageEvent[],
): AppliedDamage[] {
  const seen = new Set<string>();
  const ordered = [...events].sort(
    (left, right) =>
      left.occurredAtTick - right.occurredAtTick ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );

  return ordered.map((event) => {
    if (!event.id.trim()) throw new Error('damage event id is required');
    if (seen.has(event.id))
      throw new Error(`duplicate damage event: ${event.id}`);
    seen.add(event.id);
    requireFinitePositive(event.amount, 'damage amount');
    if (
      !Number.isSafeInteger(event.occurredAtTick) ||
      event.occurredAtTick < 0
    ) {
      throw new Error(
        'damage occurredAtTick must be a non-negative safe integer',
      );
    }
    if (!Number.isSafeInteger(event.order) || event.order < 0) {
      throw new Error('damage order must be a non-negative safe integer');
    }
    const target = targets.get(event.targetId);
    if (!target) throw new Error(`unknown damage target: ${event.targetId}`);
    if (
      !Number.isFinite(target.health) ||
      !Number.isFinite(target.maximumHealth) ||
      target.maximumHealth <= 0 ||
      target.health < 0 ||
      target.health > target.maximumHealth
    ) {
      throw new Error(`invalid health state for target: ${target.id}`);
    }
    const healthBefore = target.health;
    target.health = Math.max(0, healthBefore - event.amount);
    return { event, healthBefore, healthAfter: target.health };
  });
}
