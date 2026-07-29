import { requireIntegerInRange } from './numeric';

export const SIMULATION_HZ = 30;
export const FIXED_STEP_SECONDS = 1 / SIMULATION_HZ;
export const FIXED_STEP_MILLISECONDS = 1_000 / SIMULATION_HZ;
export const MAX_SAFE_TICK = 0xffff_ffff;

export function requireSimulationTick(value: unknown): number {
  return requireIntegerInRange('tick', value, 0, MAX_SAFE_TICK);
}

export function ticksToSeconds(ticks: number): number {
  return requireSimulationTick(ticks) * FIXED_STEP_SECONDS;
}

export function millisecondsToTicks(milliseconds: number): number {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError('milliseconds must be a finite non-negative number.');
  }
  return Math.ceil(milliseconds / FIXED_STEP_MILLISECONDS);
}
