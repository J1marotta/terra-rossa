export class LatencyHarness<T> {
  readonly #baseDelay: number;
  readonly #jitter: readonly number[];
  readonly #queue: Array<{ deliverAt: number; value: T }> = [];
  #time = 0;
  #sent = 0;

  constructor(baseDelay: number, jitter: readonly number[] = [0]) {
    if (!Number.isFinite(baseDelay) || baseDelay < 0 || jitter.length === 0) {
      throw new RangeError(
        'Latency harness requires a valid delay and jitter pattern.',
      );
    }
    this.#baseDelay = baseDelay;
    this.#jitter = jitter;
  }

  send(value: T) {
    const jitter = this.#jitter[this.#sent % this.#jitter.length] ?? 0;
    this.#sent += 1;
    this.#queue.push({
      deliverAt: this.#time + Math.max(0, this.#baseDelay + jitter),
      value,
    });
    this.#queue.sort((left, right) => left.deliverAt - right.deliverAt);
  }

  advance(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new RangeError(
        'Harness time must advance by a finite non-negative value.',
      );
    }
    this.#time += milliseconds;
    const delivered: T[] = [];
    while (
      this.#queue[0] !== undefined &&
      this.#queue[0].deliverAt <= this.#time
    ) {
      const message = this.#queue.shift();
      if (message !== undefined) delivered.push(message.value);
    }
    return delivered;
  }
}
