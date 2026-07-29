export function requireFiniteNumber(name: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

export function requireNumberInRange(
  name: string,
  value: unknown,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new TypeError('Numeric bounds must be finite.');
  }
  if (minimum > maximum) {
    throw new RangeError('Numeric minimum cannot exceed maximum.');
  }
  const number = requireFiniteNumber(name, value);
  if (number < minimum || number > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

export function requireIntegerInRange(
  name: string,
  value: unknown,
  minimum: number,
  maximum: number,
): number {
  const number = requireNumberInRange(name, value, minimum, maximum);
  if (!Number.isInteger(number)) {
    throw new TypeError(`${name} must be an integer.`);
  }
  return number;
}
