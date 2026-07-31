import { randomUUID } from 'node:crypto';

import { SPITTER, type CreatureTarget } from '../../shared/creatures';
import { hasDirectSightline, TERRA_ROSSA_MAP } from '../../shared/map';
import { applyPlayerDisplacement } from '../../shared/movement';
import type { CreatureStateInstance } from '../../shared/state';
import { FIXED_STEP_SECONDS, millisecondsToTicks } from '../../shared/time';
import type { CreatureRegistry } from './CreatureRegistry';
import type { CreatureAttack } from './SwarmerSystem';
import { ProjectileRegistry } from './ProjectileRegistry';

export class SpitterSystem {
  readonly #creatures: CreatureRegistry;
  readonly #projectiles: ProjectileRegistry;
  readonly #createId: () => string;

  constructor(
    creatures: CreatureRegistry,
    projectiles: ProjectileRegistry,
    createId: () => string = randomUUID,
  ) {
    this.#creatures = creatures;
    this.#projectiles = projectiles;
    this.#createId = createId;
  }

  step(targets: readonly CreatureTarget[], attack: CreatureAttack) {
    this.#creatures
      .values()
      .filter((creature) => creature.kind === SPITTER.kind && creature.alive)
      .forEach((creature) => this.#stepSpitter(creature, targets));
    this.#stepProjectiles(targets, attack);
  }

  #stepSpitter(
    creature: CreatureStateInstance,
    targets: readonly CreatureTarget[],
  ) {
    if (creature.attackCooldownTicksRemaining > 0)
      creature.attackCooldownTicksRemaining -= 1;
    if (creature.attackWindupTicksRemaining > 0) {
      creature.attackWindupTicksRemaining -= 1;
      if (creature.attackWindupTicksRemaining === 0) {
        const target = targets.find(
          (candidate) => candidate.id === creature.targetId && candidate.alive,
        );
        if (target !== undefined && this.#canShoot(creature, target)) {
          const deltaX = target.x - creature.x;
          const deltaZ = target.z - creature.z;
          const distance = Math.hypot(deltaX, deltaZ);
          const spawned = this.#projectiles.spawn({
            id: this.#createId(),
            ownerId: creature.id,
            x: creature.x,
            z: creature.z,
            velocityX:
              (deltaX / distance) * SPITTER.projectileSpeedMetresPerSecond,
            velocityZ:
              (deltaZ / distance) * SPITTER.projectileSpeedMetresPerSecond,
            collisionRadius: SPITTER.projectileRadius,
            damage: SPITTER.attackDamage,
            lifetimeTicks: millisecondsToTicks(
              SPITTER.projectileLifetimeMilliseconds,
            ),
          });
          if (spawned !== null) creature.attackEvent += 1;
        }
        creature.attackCooldownTicksRemaining = millisecondsToTicks(
          SPITTER.attackCooldownMilliseconds,
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
    const deltaX = target.x - creature.x;
    const deltaZ = target.z - creature.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (
      creature.attackCooldownTicksRemaining === 0 &&
      this.#canShoot(creature, target)
    ) {
      creature.attackWindupTicksRemaining = millisecondsToTicks(
        SPITTER.attackWindupMilliseconds,
      );
      creature.attackWarningEvent += 1;
      return;
    }
    if (distance === 0) return;
    const direction =
      distance < SPITTER.minimumRangeMetres
        ? -1
        : distance > SPITTER.preferredRangeMetres
          ? 1
          : 0;
    applyPlayerDisplacement(
      creature,
      (deltaX / distance) *
        creature.speedMetresPerSecond *
        FIXED_STEP_SECONDS *
        direction,
      (deltaZ / distance) *
        creature.speedMetresPerSecond *
        FIXED_STEP_SECONDS *
        direction,
    );
  }

  #stepProjectiles(targets: readonly CreatureTarget[], attack: CreatureAttack) {
    this.#projectiles.values().forEach((projectile) => {
      if (projectile.lifetimeTicksRemaining === 0) {
        this.#projectiles.despawn(projectile.id);
        return;
      }
      projectile.lifetimeTicksRemaining -= 1;
      const previousX = projectile.x;
      const previousZ = projectile.z;
      applyPlayerDisplacement(
        projectile,
        projectile.velocityX * FIXED_STEP_SECONDS,
        projectile.velocityZ * FIXED_STEP_SECONDS,
      );
      if (projectile.x === previousX && projectile.z === previousZ) {
        this.#projectiles.despawn(projectile.id);
        return;
      }
      const victim = targets.find(
        (target) =>
          target.alive &&
          Math.hypot(target.x - projectile.x, target.z - projectile.z) <=
            projectile.collisionRadius + 0.55,
      );
      if (victim === undefined) return;
      attack(projectile.ownerId, victim.id, projectile.damage);
      this.#projectiles.despawn(projectile.id);
    });
  }

  #canShoot(creature: CreatureStateInstance, target: CreatureTarget) {
    const distance = Math.hypot(target.x - creature.x, target.z - creature.z);
    return (
      distance >= SPITTER.minimumRangeMetres &&
      distance <= SPITTER.maximumRangeMetres &&
      hasDirectSightline(TERRA_ROSSA_MAP, creature, target)
    );
  }
}
