import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_SPEED_METRES_PER_SECOND,
  applyMovementInput,
  integratePlayerMovement,
  type MovingPlayer,
} from '../../../shared/movement';

export const SOFT_CORRECTION_METRES = 0.15;
export const HARD_SNAP_METRES = 2;
const CORRECTION_RATE = 12;
const MAX_PENDING_INPUTS = 120;

interface PendingInput {
  readonly sequence: number;
  readonly x: number;
  readonly z: number;
}

export type ReconciliationKind = 'initialized' | 'none' | 'soft' | 'hard';

export class LocalPrediction {
  readonly #simulation: MovingPlayer = {
    x: 0,
    z: 0,
    moveX: 0,
    moveZ: 0,
    speed: PLAYER_SPEED_METRES_PER_SECOND,
    collisionRadius: PLAYER_COLLISION_RADIUS,
    lastProcessedSequence: -1,
  };
  readonly #pending: PendingInput[] = [];
  #displayX = 0;
  #displayZ = 0;
  #initialized = false;

  get pendingCount() {
    return this.#pending.length;
  }

  reset() {
    this.#pending.length = 0;
    this.#initialized = false;
  }

  predict(sequence: number, x: number, z: number) {
    if (!this.#initialized) return;
    const beforeX = this.#simulation.x;
    const beforeZ = this.#simulation.z;
    applyMovementInput(this.#simulation, x, z, sequence);
    integratePlayerMovement(this.#simulation);
    this.#displayX += this.#simulation.x - beforeX;
    this.#displayZ += this.#simulation.z - beforeZ;
    this.#pending.push(Object.freeze({ sequence, x, z }));
    if (this.#pending.length > MAX_PENDING_INPUTS) this.#pending.shift();
  }

  reconcile(
    authoritativeX: number,
    authoritativeZ: number,
    acknowledgedSequence: number,
  ): ReconciliationKind {
    if (!this.#initialized) {
      this.#simulation.x = authoritativeX;
      this.#simulation.z = authoritativeZ;
      this.#displayX = authoritativeX;
      this.#displayZ = authoritativeZ;
      this.#initialized = true;
      return 'initialized';
    }

    while (
      this.#pending[0] !== undefined &&
      this.#pending[0].sequence <= acknowledgedSequence
    ) {
      this.#pending.shift();
    }
    this.#simulation.x = authoritativeX;
    this.#simulation.z = authoritativeZ;
    this.#simulation.moveX = 0;
    this.#simulation.moveZ = 0;
    this.#pending.forEach((input) => {
      applyMovementInput(this.#simulation, input.x, input.z, input.sequence);
      integratePlayerMovement(this.#simulation);
    });

    const error = Math.hypot(
      this.#displayX - this.#simulation.x,
      this.#displayZ - this.#simulation.z,
    );
    if (error > HARD_SNAP_METRES) {
      this.#displayX = this.#simulation.x;
      this.#displayZ = this.#simulation.z;
      return 'hard';
    }
    if (error > SOFT_CORRECTION_METRES) return 'soft';
    this.#displayX = this.#simulation.x;
    this.#displayZ = this.#simulation.z;
    return 'none';
  }

  sample(elapsedSeconds: number) {
    if (!this.#initialized) return null;
    const blend = 1 - Math.exp(-CORRECTION_RATE * Math.max(0, elapsedSeconds));
    this.#displayX += (this.#simulation.x - this.#displayX) * blend;
    this.#displayZ += (this.#simulation.z - this.#displayZ) * blend;
    return { x: this.#displayX, z: this.#displayZ };
  }
}
