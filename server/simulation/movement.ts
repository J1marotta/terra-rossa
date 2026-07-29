import type { PlayerStateInstance } from '../../shared/state';
import { FIXED_STEP_MILLISECONDS, FIXED_STEP_SECONDS } from '../../shared/time';
import {
  TERRA_ROSSA_MAP,
  type AuthoredMap,
  type CollisionObstacle,
} from '../../shared/map';

export const PLAYER_SPEED_METRES_PER_SECOND = 6;
export const PLAYER_COLLISION_RADIUS = 0.55;

export interface MovingPlayer {
  x: number;
  z: number;
  moveX: number;
  moveZ: number;
  speed: number;
  collisionRadius: number;
  lastProcessedSequence: number;
}

export function initializeMovementState(
  player: PlayerStateInstance,
  x: number,
  z: number,
) {
  player.x = x;
  player.z = z;
  player.moveX = 0;
  player.moveZ = 0;
  player.speed = PLAYER_SPEED_METRES_PER_SECOND;
  player.collisionRadius = PLAYER_COLLISION_RADIUS;
  player.lastProcessedSequence = -1;
}

export function applyMovementInput(
  player: MovingPlayer,
  x: number,
  z: number,
  sequence: number,
) {
  player.moveX = x;
  player.moveZ = z;
  player.lastProcessedSequence = sequence;
}

function circleOverlapsObstacle(
  x: number,
  z: number,
  radius: number,
  obstacle: CollisionObstacle,
) {
  const closestX = Math.max(
    obstacle.center.x - obstacle.halfWidth,
    Math.min(x, obstacle.center.x + obstacle.halfWidth),
  );
  const closestZ = Math.max(
    obstacle.center.z - obstacle.halfDepth,
    Math.min(z, obstacle.center.z + obstacle.halfDepth),
  );
  const deltaX = x - closestX;
  const deltaZ = z - closestZ;
  return deltaX * deltaX + deltaZ * deltaZ < radius * radius;
}

function collides(map: AuthoredMap, x: number, z: number, radius: number) {
  return map.obstacles.some((obstacle) =>
    circleOverlapsObstacle(x, z, radius, obstacle),
  );
}

export function integratePlayerMovement(
  player: MovingPlayer,
  seconds = FIXED_STEP_SECONDS,
  map: AuthoredMap = TERRA_ROSSA_MAP,
) {
  const magnitude = Math.hypot(player.moveX, player.moveZ);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  const deltaX = player.moveX * scale * player.speed * seconds;
  const deltaZ = player.moveZ * scale * player.speed * seconds;
  const minimumX = map.bounds.minX + player.collisionRadius;
  const maximumX = map.bounds.maxX - player.collisionRadius;
  const minimumZ = map.bounds.minZ + player.collisionRadius;
  const maximumZ = map.bounds.maxZ - player.collisionRadius;

  const nextX = Math.max(minimumX, Math.min(maximumX, player.x + deltaX));
  if (!collides(map, nextX, player.z, player.collisionRadius)) {
    player.x = nextX;
  }

  const nextZ = Math.max(minimumZ, Math.min(maximumZ, player.z + deltaZ));
  if (!collides(map, player.x, nextZ, player.collisionRadius)) {
    player.z = nextZ;
  }
}

export class FixedStepAccumulator {
  #accumulatedMilliseconds = 0;

  advance(elapsedMilliseconds: number, step: () => void) {
    if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds < 0) {
      throw new RangeError(
        'elapsedMilliseconds must be finite and non-negative.',
      );
    }
    this.#accumulatedMilliseconds += elapsedMilliseconds;
    let steps = 0;
    while (this.#accumulatedMilliseconds + 1e-9 >= FIXED_STEP_MILLISECONDS) {
      this.#accumulatedMilliseconds -= FIXED_STEP_MILLISECONDS;
      step();
      steps += 1;
    }
    return steps;
  }
}
