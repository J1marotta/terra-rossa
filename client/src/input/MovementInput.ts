import { FixedStepAccumulator } from '../../../shared/movement';

type SendMovement = (x: number, z: number) => number | null;
type PredictMovement = (x: number, z: number, sequence: number) => void;

const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

export function movementVectorFromKeys(pressed: ReadonlySet<string>) {
  let x = Number(pressed.has('KeyD')) - Number(pressed.has('KeyA'));
  let z = Number(pressed.has('KeyS')) - Number(pressed.has('KeyW'));
  const magnitude = Math.hypot(x, z);
  if (magnitude > 1) {
    x /= magnitude;
    z /= magnitude;
  }
  return { x, z };
}

export class MovementInput {
  readonly #pressed = new Set<string>();
  readonly #accumulator = new FixedStepAccumulator();
  readonly #sendMovement: SendMovement;
  readonly #predictMovement: PredictMovement;
  #frame: number | undefined;
  #previousTime = performance.now();
  #disposed = false;

  constructor(sendMovement: SendMovement, predictMovement: PredictMovement) {
    this.#sendMovement = sendMovement;
    this.#predictMovement = predictMovement;
    window.addEventListener('keydown', this.#onKeyDown);
    window.addEventListener('keyup', this.#onKeyUp);
    window.addEventListener('blur', this.#onBlur);
    this.#frame = requestAnimationFrame(this.#update);
  }

  #onKeyDown = (event: KeyboardEvent) => {
    if (!MOVEMENT_KEYS.has(event.code)) return;
    this.#pressed.add(event.code);
    event.preventDefault();
  };

  #onKeyUp = (event: KeyboardEvent) => {
    if (!MOVEMENT_KEYS.has(event.code)) return;
    this.#pressed.delete(event.code);
    event.preventDefault();
  };

  #onBlur = () => this.#pressed.clear();

  #update = (time: number) => {
    if (this.#disposed) return;
    const elapsed = Math.min(250, Math.max(0, time - this.#previousTime));
    this.#previousTime = time;
    this.#accumulator.advance(elapsed, () => {
      const { x, z } = movementVectorFromKeys(this.#pressed);
      const sequence = this.#sendMovement(x, z);
      if (sequence !== null) this.#predictMovement(x, z, sequence);
    });
    this.#frame = requestAnimationFrame(this.#update);
  };

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#frame !== undefined) cancelAnimationFrame(this.#frame);
    window.removeEventListener('keydown', this.#onKeyDown);
    window.removeEventListener('keyup', this.#onKeyUp);
    window.removeEventListener('blur', this.#onBlur);
    this.#pressed.clear();
  }
}
