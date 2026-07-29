import { TERRA_ROSSA_MAP, type SpawnRegion } from './map';
import { SeededRandom } from './random';

function combinations<T>(values: readonly T[], count: number): T[][] {
  if (count === 0) return [[]];
  const result: T[][] = [];
  values.forEach((value, index) => {
    for (const rest of combinations(values.slice(index + 1), count - 1)) {
      result.push([value, ...rest]);
    }
  });
  return result;
}

export function spawnSeparationScore(spawns: readonly SpawnRegion[]) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < spawns.length; left += 1) {
    for (let right = left + 1; right < spawns.length; right += 1) {
      const first = spawns[left];
      const second = spawns[right];
      if (first === undefined || second === undefined) continue;
      minimum = Math.min(
        minimum,
        Math.hypot(
          first.center.x - second.center.x,
          first.center.z - second.center.z,
        ),
      );
    }
  }
  return minimum;
}

export function allocateSpawnRegions(playerCount: number, seed: number) {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) {
    throw new RangeError('Spawn allocation requires two to four players.');
  }
  const candidates = combinations(TERRA_ROSSA_MAP.spawns, playerCount);
  const scored = candidates.map((spawns) => ({
    spawns,
    score: spawnSeparationScore(spawns),
  }));
  const bestScore = Math.max(...scored.map(({ score }) => score));
  const best = scored.filter(({ score }) => Math.abs(score - bestScore) < 1e-9);
  const random = new SeededRandom(seed);
  const selected = [...random.pick(best).spawns];
  for (let index = selected.length - 1; index > 0; index -= 1) {
    const other = random.nextInteger(0, index + 1);
    const current = selected[index];
    const replacement = selected[other];
    if (current === undefined || replacement === undefined) {
      throw new Error('Spawn shuffle index was invalid.');
    }
    selected[index] = replacement;
    selected[other] = current;
  }
  return Object.freeze(selected);
}
