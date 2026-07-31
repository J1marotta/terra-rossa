import { MapSchema } from '@colyseus/schema';

import { CreatureRegistry } from '../server/creatures/CreatureRegistry';
import { ProjectileRegistry } from '../server/creatures/ProjectileRegistry';
import { SpitterSystem } from '../server/creatures/SpitterSystem';
import { SwarmerSystem } from '../server/creatures/SwarmerSystem';
import {
  STRESS_CREATURE_BUDGET,
  planCreaturePopulation,
} from '../shared/creaturePacing';
import {
  type CreatureProjectileStateInstance,
  type CreatureStateInstance,
} from '../shared/state';

const creatures = new MapSchema<CreatureStateInstance>();
const projectiles = new MapSchema<CreatureProjectileStateInstance>();
const registry = new CreatureRegistry(creatures);
const projectileRegistry = new ProjectileRegistry(projectiles);
const swarmers = new SwarmerSystem(registry);
const spitters = new SpitterSystem(registry, projectileRegistry);
const players = [
  { id: 'p1', x: -20, z: -14, alive: true, collisionRadius: 0.5 },
  { id: 'p2', x: 20, z: -14, alive: true, collisionRadius: 0.5 },
  { id: 'p3', x: 20, z: 14, alive: true, collisionRadius: 0.5 },
  { id: 'p4', x: -20, z: 14, alive: true, collisionRadius: 0.5 },
];

planCreaturePopulation([], 7305, STRESS_CREATURE_BUDGET).forEach((spawn) =>
  registry.spawn(spawn),
);

const samples: number[] = [];
for (let tick = 0; tick < 900; tick += 1) {
  const started = performance.now();
  swarmers.step(players, () => undefined);
  spitters.step(players, () => undefined);
  samples.push(performance.now() - started);
}
samples.sort((left, right) => left - right);
const percentile = (fraction: number) =>
  samples[
    Math.min(samples.length - 1, Math.floor(samples.length * fraction))
  ] ?? 0;
const result = {
  players: players.length,
  creatures: creatures.size,
  projectilePeak: projectiles.size,
  ticks: samples.length,
  p50Milliseconds: percentile(0.5),
  p95Milliseconds: percentile(0.95),
  p99Milliseconds: percentile(0.99),
  heapMegabytes: process.memoryUsage().heapUsed / (1024 * 1024),
};
if (result.p95Milliseconds >= 20) {
  throw new Error(
    `Server stress p95 exceeded 20 ms: ${JSON.stringify(result)}`,
  );
}
console.log(JSON.stringify({ ok: true, ...result }));
