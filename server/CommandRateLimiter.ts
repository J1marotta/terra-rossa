const WINDOW_MILLISECONDS = 1_000;

const LIMITS: Readonly<Record<string, number>> = {
  aim: 30,
  move: 30,
  action: 20,
  all: 60,
};

export class CommandRateLimiter {
  #windowStartedAt = 0;
  #counts: Record<string, number> = {};

  allow(nowMilliseconds: number, type: unknown) {
    if (!Number.isFinite(nowMilliseconds)) return false;
    if (nowMilliseconds - this.#windowStartedAt >= WINDOW_MILLISECONDS) {
      this.#windowStartedAt = nowMilliseconds;
      this.#counts = {};
    }
    const category =
      type === 'aim' ? 'aim' : type === 'move' ? 'move' : 'action';
    this.#counts.all = (this.#counts.all ?? 0) + 1;
    this.#counts[category] = (this.#counts[category] ?? 0) + 1;
    return (
      this.#counts.all <= LIMITS.all! &&
      this.#counts[category] <= LIMITS[category]!
    );
  }
}
