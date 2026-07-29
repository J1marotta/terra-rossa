type SendReloadStart = () => number | null;
type SendReloadAttempt = (clientElapsedMilliseconds: number) => number | null;

export class ReloadInput {
  readonly #sendStart: SendReloadStart;
  readonly #sendAttempt: SendReloadAttempt;
  #startedAt: number | null = null;

  constructor(sendStart: SendReloadStart, sendAttempt: SendReloadAttempt) {
    this.#sendStart = sendStart;
    this.#sendAttempt = sendAttempt;
    window.addEventListener('keydown', this.#onKeyDown);
  }

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.code === 'KeyR') {
      if (this.#sendStart() !== null) this.#startedAt = performance.now();
      event.preventDefault();
    } else if (event.code === 'KeyX' && this.#startedAt !== null) {
      this.#sendAttempt(performance.now() - this.#startedAt);
      this.#startedAt = null;
      event.preventDefault();
    }
  };

  dispose() {
    window.removeEventListener('keydown', this.#onKeyDown);
    this.#startedAt = null;
  }
}
