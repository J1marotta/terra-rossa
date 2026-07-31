import type { MapSchema } from '@colyseus/schema';

import { CREATURE_PROJECTILE_CAP } from '../../shared/creatures';
import {
  CreatureProjectileState,
  type CreatureProjectileStateInstance,
} from '../../shared/state';

export interface ProjectileSpawn {
  readonly id: string;
  readonly ownerId: string;
  readonly x: number;
  readonly z: number;
  readonly velocityX: number;
  readonly velocityZ: number;
  readonly collisionRadius: number;
  readonly damage: number;
  readonly lifetimeTicks: number;
}

export class ProjectileRegistry {
  readonly #schema: MapSchema<CreatureProjectileStateInstance>;

  constructor(schema: MapSchema<CreatureProjectileStateInstance>) {
    this.#schema = schema;
  }

  get size() {
    return this.#schema.size;
  }

  spawn(specification: ProjectileSpawn) {
    if (
      this.#schema.size >= CREATURE_PROJECTILE_CAP ||
      this.#schema.has(specification.id)
    )
      return null;
    const projectile = new CreatureProjectileState();
    projectile.id = specification.id;
    projectile.ownerId = specification.ownerId;
    projectile.x = specification.x;
    projectile.z = specification.z;
    projectile.velocityX = specification.velocityX;
    projectile.velocityZ = specification.velocityZ;
    projectile.collisionRadius = specification.collisionRadius;
    projectile.damage = specification.damage;
    projectile.lifetimeTicksRemaining = specification.lifetimeTicks;
    this.#schema.set(projectile.id, projectile);
    return projectile;
  }

  values() {
    return [...this.#schema.values()];
  }

  despawn(id: string) {
    return this.#schema.delete(id);
  }

  clear() {
    this.#schema.clear();
  }
}
