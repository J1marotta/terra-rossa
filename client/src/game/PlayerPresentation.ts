import type { PlayerView } from '../multiplayer/types';

export const REMOTE_INTERPOLATION_DELAY_MS = 100;
const MAX_SNAPSHOTS = 6;

interface PositionSnapshot {
  readonly receivedAt: number;
  readonly x: number;
  readonly z: number;
}

export class PositionSnapshotBuffer {
  readonly #snapshots: PositionSnapshot[] = [];

  push(x: number, z: number, receivedAt: number) {
    if (![x, z, receivedAt].every(Number.isFinite)) {
      throw new TypeError('Position snapshots must contain finite numbers.');
    }
    const previous = this.#snapshots.at(-1);
    const timestamp = Math.max(receivedAt, previous?.receivedAt ?? receivedAt);
    if (
      previous?.x === x &&
      previous.z === z &&
      previous.receivedAt === timestamp
    ) {
      return;
    }
    this.#snapshots.push(Object.freeze({ receivedAt: timestamp, x, z }));
    if (this.#snapshots.length > MAX_SNAPSHOTS) this.#snapshots.shift();
  }

  latest() {
    const snapshot = this.#snapshots.at(-1);
    return snapshot === undefined ? null : { x: snapshot.x, z: snapshot.z };
  }

  sample(renderTime: number, delay = REMOTE_INTERPOLATION_DELAY_MS) {
    if (!Number.isFinite(renderTime) || !Number.isFinite(delay) || delay < 0) {
      throw new RangeError(
        'Interpolation time and delay must be finite and valid.',
      );
    }
    if (this.#snapshots.length === 0) return null;
    const target = renderTime - delay;
    const first = this.#snapshots[0];
    const last = this.#snapshots.at(-1);
    if (first === undefined || last === undefined) return null;
    if (target <= first.receivedAt) return { x: first.x, z: first.z };
    if (target >= last.receivedAt) return { x: last.x, z: last.z };

    for (let index = 1; index < this.#snapshots.length; index += 1) {
      const right = this.#snapshots[index];
      const left = this.#snapshots[index - 1];
      if (
        left === undefined ||
        right === undefined ||
        target > right.receivedAt
      ) {
        continue;
      }
      const duration = right.receivedAt - left.receivedAt;
      const ratio = duration === 0 ? 1 : (target - left.receivedAt) / duration;
      return {
        x: left.x + (right.x - left.x) * ratio,
        z: left.z + (right.z - left.z) * ratio,
      };
    }
    return { x: last.x, z: last.z };
  }
}

interface PositionView {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

interface PresentationEntry<T, V extends PositionView> {
  readonly object: T;
  readonly buffer: PositionSnapshotBuffer;
  player: V;
}

export class PlayerPresentationRegistry<
  T,
  V extends PositionView = PlayerView,
> {
  readonly #entries = new Map<string, PresentationEntry<T, V>>();

  get size() {
    return this.#entries.size;
  }

  get(id: string) {
    return this.#entries.get(id);
  }

  reconcile(
    players: readonly V[],
    receivedAt: number,
    create: (player: V) => T,
    dispose: (object: T) => void,
  ) {
    const active = new Set(players.map((player) => player.id));
    this.#entries.forEach((entry, id) => {
      if (active.has(id)) return;
      dispose(entry.object);
      this.#entries.delete(id);
    });
    players.forEach((player) => {
      let entry = this.#entries.get(player.id);
      if (entry === undefined) {
        entry = {
          object: create(player),
          buffer: new PositionSnapshotBuffer(),
          player,
        };
        this.#entries.set(player.id, entry);
      }
      entry.player = player;
      entry.buffer.push(player.x, player.z, receivedAt);
    });
  }

  forEach(
    callback: (entry: Readonly<PresentationEntry<T, V>>, id: string) => void,
  ) {
    this.#entries.forEach(callback);
  }

  disposeAll(dispose: (object: T) => void) {
    this.#entries.forEach((entry) => dispose(entry.object));
    this.#entries.clear();
  }
}
