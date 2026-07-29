import { SWARMER, type CreatureTarget } from '../../shared/creatures';
import { hasDirectSightline, TERRA_ROSSA_MAP } from '../../shared/map';
import { applyPlayerDisplacement } from '../../shared/movement';
import type { CreatureStateInstance } from '../../shared/state';
import { FIXED_STEP_SECONDS, millisecondsToTicks } from '../../shared/time';
import type { CreatureRegistry } from './CreatureRegistry';

export type CreatureAttack = (
  creatureId: string,
  targetId: string,
  damage: number,
) => void;

export class SwarmerSystem {
  readonly #registry: CreatureRegistry;
  readonly #avoidanceTicks = new Map<string, number>();

  constructor(registry: CreatureRegistry) {
    this.#registry = registry;
  }

  step(targets: readonly CreatureTarget[], attack: CreatureAttack) {
    const swarmers = this.#registry
      .values()
      .filter((creature) => creature.kind === SWARMER.kind && creature.alive);
    swarmers.forEach((creature) =>
      this.#stepOne(creature, swarmers, targets, attack),
    );
  }

  #stepOne(
    creature: CreatureStateInstance,
    swarmers: readonly CreatureStateInstance[],
    targets: readonly CreatureTarget[],
    attack: CreatureAttack,
  ) {
    if (creature.attackCooldownTicksRemaining > 0)
      creature.attackCooldownTicksRemaining -= 1;
    if (creature.attackWindupTicksRemaining > 0) {
      creature.attackWindupTicksRemaining -= 1;
      if (creature.attackWindupTicksRemaining === 0) {
        const target = targets.find(
          (candidate) => candidate.id === creature.targetId && candidate.alive,
        );
        if (target !== undefined && this.#canAttack(creature, target)) {
          creature.attackEvent += 1;
          attack(creature.id, target.id, SWARMER.attackDamage);
        }
        creature.attackCooldownTicksRemaining = millisecondsToTicks(
          SWARMER.attackCooldownMilliseconds,
        );
      }
      return;
    }

    const target = targets
      .filter((candidate) => candidate.alive)
      .sort(
        (left, right) =>
          Math.hypot(left.x - creature.x, left.z - creature.z) -
          Math.hypot(right.x - creature.x, right.z - creature.z),
      )[0];
    creature.targetId = target?.id ?? '';
    if (target === undefined) return;
    if (
      creature.attackCooldownTicksRemaining === 0 &&
      this.#canAttack(creature, target)
    ) {
      creature.attackWindupTicksRemaining = millisecondsToTicks(
        SWARMER.attackWindupMilliseconds,
      );
      creature.attackWarningEvent += 1;
      return;
    }

    const targetDeltaX = target.x - creature.x;
    const targetDeltaZ = target.z - creature.z;
    const targetDistance = Math.hypot(targetDeltaX, targetDeltaZ);
    const avoiding = this.#avoidanceTicks.get(creature.id) ?? 0;
    if (avoiding > 0 && targetDistance > 0) {
      this.#avoidanceTicks.set(creature.id, avoiding - 1);
      const distance = creature.speedMetresPerSecond * FIXED_STEP_SECONDS;
      const turn = this.#turnDirection(creature.id);
      applyPlayerDisplacement(
        creature,
        (-targetDeltaZ / targetDistance) * distance * turn,
        (targetDeltaX / targetDistance) * distance * turn,
      );
      return;
    }
    let directionX = targetDistance === 0 ? 0 : targetDeltaX / targetDistance;
    let directionZ = targetDistance === 0 ? 0 : targetDeltaZ / targetDistance;
    swarmers.forEach((other) => {
      if (other.id === creature.id) return;
      const deltaX = creature.x - other.x;
      const deltaZ = creature.z - other.z;
      const distance = Math.hypot(deltaX, deltaZ);
      const separation =
        creature.collisionRadius +
        other.collisionRadius +
        SWARMER.separationPaddingMetres;
      if (distance === 0) {
        directionX += creature.id < other.id ? -1 : 1;
      } else if (distance < separation) {
        const weight = (separation - distance) / separation;
        directionX += (deltaX / distance) * weight * 2;
        directionZ += (deltaZ / distance) * weight * 2;
      }
    });
    const magnitude = Math.hypot(directionX, directionZ);
    if (magnitude === 0) return;
    const distance = creature.speedMetresPerSecond * FIXED_STEP_SECONDS;
    const previousX = creature.x;
    const previousZ = creature.z;
    const stepX = (directionX / magnitude) * distance;
    const stepZ = (directionZ / magnitude) * distance;
    applyPlayerDisplacement(creature, stepX, stepZ);
    if (Math.abs(stepX) > 1e-6 && creature.x === previousX)
      this.#beginAvoidance(creature.id);
    if (Math.abs(stepZ) > 1e-6 && creature.z === previousZ)
      this.#beginAvoidance(creature.id);
  }

  #canAttack(creature: CreatureStateInstance, target: CreatureTarget) {
    return (
      Math.hypot(target.x - creature.x, target.z - creature.z) <=
        SWARMER.attackRangeMetres &&
      hasDirectSightline(TERRA_ROSSA_MAP, creature, target)
    );
  }

  #turnDirection(id: string) {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1)
      hash = (hash * 31 + id.charCodeAt(index)) | 0;
    return hash % 2 === 0 ? 1 : -1;
  }

  #beginAvoidance(id: string) {
    this.#avoidanceTicks.set(id, 45);
  }
}
