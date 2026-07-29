import type { MapSchema } from '@colyseus/schema';

import {
  CREATURE_POPULATION_CAP,
  type CreatureDamageResult,
  type CreatureSpawn,
  type CreatureTarget,
} from '../../shared/creatures';
import { CreatureState, type CreatureStateInstance } from '../../shared/state';
import { FIXED_STEP_SECONDS } from '../../shared/time';

export type CreatureTargetSelector = (
  creature: CreatureStateInstance,
  candidates: readonly CreatureTarget[],
) => CreatureTarget | null;

export class CreatureRegistry {
  readonly #schema: MapSchema<CreatureStateInstance>;
  readonly #runtime = new Map<string, { ageTicks: number }>();

  constructor(schema: MapSchema<CreatureStateInstance>) {
    this.#schema = schema;
  }

  get size() {
    return this.#runtime.size;
  }

  spawn(specification: CreatureSpawn) {
    if (
      this.#runtime.size >= CREATURE_POPULATION_CAP ||
      this.#runtime.has(specification.id)
    )
      return null;
    const creature = new CreatureState();
    creature.id = specification.id;
    creature.kind = specification.kind;
    creature.x = specification.x;
    creature.z = specification.z;
    creature.collisionRadius = specification.collisionRadius;
    creature.speedMetresPerSecond = specification.speedMetresPerSecond;
    creature.health = specification.maximumHealth;
    creature.maximumHealth = specification.maximumHealth;
    creature.targetId = '';
    creature.alive = true;
    creature.hitEvent = 0;
    creature.deathEvent = 0;
    creature.attackWindupTicksRemaining = 0;
    creature.attackCooldownTicksRemaining = 0;
    creature.attackWarningEvent = 0;
    creature.attackEvent = 0;
    this.#schema.set(creature.id, creature);
    this.#runtime.set(creature.id, { ageTicks: 0 });
    return creature;
  }

  despawn(id: string) {
    const removedRuntime = this.#runtime.delete(id);
    const removedSchema = this.#schema.delete(id);
    return removedRuntime || removedSchema;
  }

  clear() {
    this.#runtime.clear();
    this.#schema.clear();
  }

  values() {
    return [...this.#schema.values()];
  }

  damage(id: string, amount: number): CreatureDamageResult {
    const creature = this.#schema.get(id);
    if (creature === undefined || !creature.alive || amount <= 0)
      return {
        applied: false,
        killed: false,
        healthAfter: creature?.health ?? 0,
      };
    creature.health = Math.max(0, creature.health - amount);
    creature.hitEvent += 1;
    const killed = creature.health === 0;
    if (killed) {
      creature.alive = false;
      creature.targetId = '';
      creature.deathEvent += 1;
    }
    return { applied: true, killed, healthAfter: creature.health };
  }

  queryRadius(x: number, z: number, radius: number) {
    const squaredRadius = radius * radius;
    return [...this.#schema.values()].filter((creature) => {
      const deltaX = creature.x - x;
      const deltaZ = creature.z - z;
      return deltaX * deltaX + deltaZ * deltaZ <= squaredRadius;
    });
  }

  step(
    candidates: readonly CreatureTarget[],
    selectTarget: CreatureTargetSelector,
  ) {
    this.#runtime.forEach((runtime, id) => {
      runtime.ageTicks += 1;
      const creature = this.#schema.get(id);
      if (creature === undefined || !creature.alive) return;
      const target = selectTarget(creature, candidates);
      creature.targetId = target?.id ?? '';
      if (target === null) return;
      const deltaX = target.x - creature.x;
      const deltaZ = target.z - creature.z;
      const distance = Math.hypot(deltaX, deltaZ);
      if (distance === 0) return;
      const movement = Math.min(
        distance,
        creature.speedMetresPerSecond * FIXED_STEP_SECONDS,
      );
      creature.x += (deltaX / distance) * movement;
      creature.z += (deltaZ / distance) * movement;
    });
  }
}
