import { requireIntegerInRange } from './numeric';

const UINT32_MAX = 0xffff_ffff;
const UINT32_RANGE = 0x1_0000_0000;

export class SeededRandom {
  #state: number;

  constructor(seed: number) {
    this.#state = requireIntegerInRange('seed', seed, 0, UINT32_MAX) >>> 0;
  }

  nextFloat(): number {
    this.#state = (this.#state + 0x6d2b_79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  }

  nextInteger(minimum: number, maximumExclusive: number): number {
    const minimumInteger = requireIntegerInRange(
      'minimum',
      minimum,
      -0x8000_0000,
      0x7fff_ffff,
    );
    const maximumInteger = requireIntegerInRange(
      'maximumExclusive',
      maximumExclusive,
      -0x7fff_ffff,
      0x8000_0000,
    );
    if (maximumInteger <= minimumInteger) {
      throw new RangeError('maximumExclusive must exceed minimum.');
    }
    return (
      minimumInteger +
      Math.floor(this.nextFloat() * (maximumInteger - minimumInteger))
    );
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0)
      throw new RangeError('Cannot pick from an empty list.');
    return values[this.nextInteger(0, values.length)] as T;
  }
}
