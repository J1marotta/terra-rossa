import {
  AmbientLight,
  BufferGeometry,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
  Scene,
  WebGLRenderer,
} from 'three';

import type {
  CreatureProjectileView,
  CreatureView,
  PickupView,
  PlayerView,
} from '../multiplayer/types';
import { createMapVisuals, TERRA_ROSSA_MAP } from '../../../shared/map';
import { calculateOrthographicBounds } from './projection';
import { LocalPrediction } from './LocalPrediction';
import { PlayerPresentationRegistry } from './PlayerPresentation';

const CAMERA_HEIGHT = 18;
export const MAX_TRANSIENT_EFFECTS = 32;

interface TransientEffect {
  readonly object: Line | Mesh;
  readonly expiresAt: number;
}

export class GameScene {
  readonly #container: HTMLElement;
  readonly #scene = new Scene();
  readonly #camera = new OrthographicCamera();
  readonly #renderer: WebGLRenderer;
  readonly #players = new PlayerPresentationRegistry<Group>();
  readonly #creatures = new PlayerPresentationRegistry<Group, CreatureView>();
  readonly #creatureProjectiles = new PlayerPresentationRegistry<
    Mesh,
    CreatureProjectileView
  >();
  readonly #pickups = new PlayerPresentationRegistry<Mesh, PickupView>();
  readonly #localPrediction = new LocalPrediction();
  readonly #lastDashEvent = new Map<string, number>();
  readonly #dashPulseUntil = new Map<string, number>();
  readonly #lastMeleeEvent = new Map<string, number>();
  readonly #meleePulseUntil = new Map<string, number>();
  readonly #lastShotEvent = new Map<string, number>();
  readonly #lastDryFireEvent = new Map<string, number>();
  readonly #lastReloadEvent = new Map<string, number>();
  readonly #lastHealth = new Map<string, number>();
  readonly #hitPulseUntil = new Map<string, number>();
  readonly #effects: TransientEffect[] = [];
  readonly #reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  readonly #reducedEffects =
    this.#reducedMotion.matches ||
    new URLSearchParams(window.location.search).get('effects') === 'low';
  readonly #resizeObserver: ResizeObserver;
  #animationFrame: number | undefined;
  #startTime = performance.now();
  #disposed = false;
  #localPlayerId: string | null = null;
  #previousRenderTime = performance.now();
  #cameraShakeUntil = 0;
  #hitStopUntil = 0;
  readonly #pointerRay = new Raycaster();

  constructor(container: HTMLElement) {
    this.#container = container;
    this.#renderer = new WebGLRenderer({ antialias: false, alpha: false });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    this.#renderer.outputColorSpace = 'srgb';
    this.#renderer.domElement.className = 'game-canvas';
    this.#renderer.domElement.setAttribute(
      'aria-label',
      'Terra Rossa game world',
    );
    this.#container.append(this.#renderer.domElement);

    this.#buildWorld();
    this.#resizeObserver = new ResizeObserver(() => this.resize());
    this.#resizeObserver.observe(container);
    this.resize();
    this.#animationFrame = requestAnimationFrame(this.#render);
  }

  #buildWorld() {
    this.#scene.background = new Color('#17141d');

    const mapWidth = TERRA_ROSSA_MAP.bounds.maxX - TERRA_ROSSA_MAP.bounds.minX;
    const mapDepth = TERRA_ROSSA_MAP.bounds.maxZ - TERRA_ROSSA_MAP.bounds.minZ;
    const ground = new Mesh(
      new PlaneGeometry(mapWidth, mapDepth),
      new MeshStandardMaterial({ color: '#322d36', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.#scene.add(ground);

    createMapVisuals(TERRA_ROSSA_MAP).forEach((primitive) => {
      const obstacle = new Mesh(
        new BoxGeometry(primitive.width, primitive.height, primitive.depth),
        new MeshStandardMaterial({ color: primitive.color, roughness: 0.9 }),
      );
      obstacle.position.set(
        primitive.center.x,
        primitive.elevation,
        primitive.center.z,
      );
      this.#scene.add(obstacle);
    });

    this.#scene.add(new AmbientLight('#c2b1d2', 1.6));
    const moonlight = new DirectionalLight('#f4d7ba', 2.8);
    moonlight.position.set(-8, 14, 6);
    this.#scene.add(moonlight);

    this.#camera.position.set(12, 16, 12);
    this.#camera.lookAt(0, 0, 0);
    this.#camera.near = 0.1;
    this.#camera.far = 100;
  }

  setPlayers(players: readonly PlayerView[], receivedAt: number) {
    if (this.#disposed) return;
    this.#players.reconcile(
      players,
      receivedAt,
      (player) => {
        const group = this.#createDog(player);
        this.#scene.add(group);
        return group;
      },
      (group) => this.#removeDog(group),
    );
    const activeIds = new Set(players.map((player) => player.id));
    this.#lastDashEvent.forEach((_event, id) => {
      if (!activeIds.has(id)) {
        this.#lastDashEvent.delete(id);
        this.#dashPulseUntil.delete(id);
        this.#lastMeleeEvent.delete(id);
        this.#meleePulseUntil.delete(id);
        this.#lastShotEvent.delete(id);
        this.#lastDryFireEvent.delete(id);
        this.#lastReloadEvent.delete(id);
        this.#lastHealth.delete(id);
        this.#hitPulseUntil.delete(id);
      }
    });
    players.forEach((player) => {
      const previousEvent = this.#lastDashEvent.get(player.id);
      if (previousEvent !== undefined && player.dashEvent > previousEvent) {
        this.#dashPulseUntil.set(player.id, receivedAt + 180);
      }
      this.#lastDashEvent.set(player.id, player.dashEvent);
      const previousMelee = this.#lastMeleeEvent.get(player.id);
      if (previousMelee !== undefined && player.meleeEvent > previousMelee) {
        this.#meleePulseUntil.set(player.id, receivedAt + 180);
        this.#cue(
          player.meleeTargetId === '' ? 'melee-miss' : 'melee-hit',
          player.id,
        );
      }
      this.#lastMeleeEvent.set(player.id, player.meleeEvent);
      const previousShot = this.#lastShotEvent.get(player.id);
      if (previousShot !== undefined && player.shotEvent > previousShot) {
        this.#showShot(player, receivedAt);
        this.#cue(
          player.isLocal
            ? player.shotTargetId === ''
              ? 'shooter-miss'
              : 'shooter-hit'
            : 'remote-shot',
          player.id,
        );
      }
      this.#lastShotEvent.set(player.id, player.shotEvent);
      const previousDry = this.#lastDryFireEvent.get(player.id);
      if (previousDry !== undefined && player.dryFireEvent > previousDry) {
        this.#cue(player.isLocal ? 'dry-fire' : 'remote-dry-fire', player.id);
      }
      this.#lastDryFireEvent.set(player.id, player.dryFireEvent);
      const previousReload = this.#lastReloadEvent.get(player.id);
      if (previousReload !== undefined && player.reloadEvent > previousReload) {
        this.#cue(`reload-${player.reloadOutcome}`, player.id);
      }
      this.#lastReloadEvent.set(player.id, player.reloadEvent);
      const previousHealth = this.#lastHealth.get(player.id);
      if (previousHealth !== undefined && player.health < previousHealth) {
        this.#hitPulseUntil.set(player.id, receivedAt + 160);
        this.#cue(player.alive ? 'victim-hit' : 'victim-death', player.id);
        if (player.isLocal) {
          this.#cameraShakeUntil = receivedAt + 140;
          this.#hitStopUntil = receivedAt + 28;
        }
      }
      this.#lastHealth.set(player.id, player.health);
    });
    const localPlayer = players.find((player) => player.isLocal);
    if (localPlayer === undefined) {
      this.#localPlayerId = null;
      this.#localPrediction.reset();
    } else {
      if (this.#localPlayerId !== localPlayer.id) {
        this.#localPrediction.reset();
        this.#localPlayerId = localPlayer.id;
      }
      this.#localPrediction.reconcile(
        localPlayer.x,
        localPlayer.z,
        localPlayer.lastProcessedSequence,
        {
          dashX: localPlayer.dashX,
          dashZ: localPlayer.dashZ,
          dashTicksRemaining: localPlayer.dashTicksRemaining,
          dashCooldownTicksRemaining: localPlayer.dashCooldownTicksRemaining,
          dashRecoveryTicksRemaining: localPlayer.dashRecoveryTicksRemaining,
          dashEvent: localPlayer.dashEvent,
        },
      );
    }
  }

  setCreatures(creatures: readonly CreatureView[], receivedAt: number) {
    if (this.#disposed) return;
    this.#creatures.reconcile(
      creatures,
      receivedAt,
      (creature) => {
        const group = this.#createCreature(creature);
        this.#scene.add(group);
        return group;
      },
      (group) => this.#removeDog(group),
    );
  }

  setCreatureProjectiles(
    projectiles: readonly CreatureProjectileView[],
    receivedAt: number,
  ) {
    if (this.#disposed) return;
    this.#creatureProjectiles.reconcile(
      projectiles,
      receivedAt,
      () => {
        const projectile = new Mesh(
          new SphereGeometry(0.22, 6, 5),
          new MeshBasicMaterial({ color: '#9be36d' }),
        );
        projectile.position.y = 0.42;
        this.#scene.add(projectile);
        return projectile;
      },
      (projectile) => {
        this.#scene.remove(projectile);
        projectile.geometry.dispose();
        const materials = Array.isArray(projectile.material)
          ? projectile.material
          : [projectile.material];
        materials.forEach((material) => material.dispose());
      },
    );
  }

  setPickups(pickups: readonly PickupView[], receivedAt: number) {
    if (this.#disposed) return;
    this.#pickups.reconcile(
      pickups,
      receivedAt,
      (pickup) => {
        const mesh = new Mesh(
          new BoxGeometry(0.55, 0.25, 0.55),
          new MeshBasicMaterial({
            color:
              pickup.kind === 'heal'
                ? '#db6c72'
                : pickup.kind === 'weapon'
                  ? '#8f78c6'
                  : '#e6c35d',
          }),
        );
        mesh.position.y = 0.2;
        this.#scene.add(mesh);
        return mesh;
      },
      (mesh) => {
        this.#scene.remove(mesh);
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((material) => material.dispose());
      },
    );
  }

  applyPredictedMovement(x: number, z: number, sequence: number) {
    this.#localPrediction.predict(sequence, x, z);
  }

  applyPredictedDash(sequence: number) {
    if (
      this.#localPlayerId !== null &&
      this.#localPrediction.predictDash(sequence)
    ) {
      this.#dashPulseUntil.set(this.#localPlayerId, performance.now() + 180);
    }
  }

  aimAngleFromClientPoint(clientX: number, clientY: number) {
    const local = this.#localPlayerId;
    if (local === null) return undefined;
    const entry = this.#players.get(local);
    if (entry === undefined) return undefined;
    const bounds = this.#renderer.domElement.getBoundingClientRect();
    this.#pointerRay.setFromCamera(
      new Vector2(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        -((clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      this.#camera,
    );
    const directionY = this.#pointerRay.ray.direction.y;
    if (Math.abs(directionY) < 1e-6) return undefined;
    const distance = -this.#pointerRay.ray.origin.y / directionY;
    const point = this.#pointerRay.ray.at(distance, new Vector3());
    return Math.atan2(
      point.z - entry.object.position.z,
      point.x - entry.object.position.x,
    );
  }

  #showShot(player: PlayerView, now: number) {
    const start = new Vector3(player.x, 1.25, player.z);
    const end = new Vector3(player.shotEndX, 1.05, player.shotEndZ);
    const tracer = new Line(
      new BufferGeometry().setFromPoints([start, end]),
      new LineBasicMaterial({
        color: player.shotTargetId === '' ? '#f3c77b' : '#fff0b5',
        transparent: true,
        opacity: this.#reducedEffects ? 0.7 : 1,
      }),
    );
    this.#addEffect(tracer, now + (this.#reducedEffects ? 90 : 130));
    if (this.#reducedEffects) return;
    const flash = new Mesh(
      new SphereGeometry(0.24, 5, 4),
      new MeshBasicMaterial({ color: '#fff0a8' }),
    );
    flash.position.copy(start);
    this.#addEffect(flash, now + 70);
    const impact = new Mesh(
      new SphereGeometry(player.shotTargetId === '' ? 0.12 : 0.2, 5, 4),
      new MeshBasicMaterial({
        color: player.shotTargetId === '' ? '#d9a65b' : '#fff5d1',
      }),
    );
    impact.position.copy(end);
    this.#addEffect(impact, now + 100);
    if (player.isLocal)
      this.#cameraShakeUntil = Math.max(this.#cameraShakeUntil, now + 65);
  }

  #addEffect(object: Line | Mesh, expiresAt: number) {
    while (this.#effects.length >= MAX_TRANSIENT_EFFECTS) {
      const oldest = this.#effects.shift();
      if (oldest !== undefined) this.#disposeEffect(oldest);
    }
    this.#scene.add(object);
    this.#effects.push({ object, expiresAt });
  }

  #disposeEffect(effect: TransientEffect) {
    this.#scene.remove(effect.object);
    effect.object.geometry.dispose();
    const materials = Array.isArray(effect.object.material)
      ? effect.object.material
      : [effect.object.material];
    materials.forEach((material) => material.dispose());
  }

  #cue(kind: string, playerId: string) {
    this.#renderer.domElement.dispatchEvent(
      new CustomEvent('terra-rossa-feedback', {
        detail: Object.freeze({ kind, playerId }),
      }),
    );
  }

  #createDog(player: PlayerView) {
    const group = new Group();
    group.name = player.id;
    const body = new Mesh(
      new BoxGeometry(1.25, 1.8, 0.8),
      new MeshStandardMaterial({
        color: player.isLocal ? '#cf754b' : '#756c9b',
        roughness: 0.8,
      }),
    );
    body.position.y = 1.1;
    const head = new Mesh(
      new BoxGeometry(1.05, 0.9, 0.9),
      new MeshStandardMaterial({
        color: player.isLocal ? '#e0a46d' : '#9a91bd',
        roughness: 0.8,
      }),
    );
    head.position.set(0, 2.25, -0.1);
    group.add(body, head);
    const pistol = new Mesh(
      new BoxGeometry(0.18, 0.18, 0.8),
      new MeshStandardMaterial({ color: '#b9a68d', roughness: 0.7 }),
    );
    pistol.name = 'pistol';
    pistol.position.set(0.72, 1.35, -0.25);
    const shotgun = new Mesh(
      new BoxGeometry(0.28, 0.22, 1.35),
      new MeshStandardMaterial({ color: '#7f6351', roughness: 0.8 }),
    );
    shotgun.name = 'shotgun';
    shotgun.position.set(0.75, 1.3, -0.45);
    group.add(pistol, shotgun);
    return group;
  }

  #createCreature(creature: CreatureView) {
    const group = new Group();
    group.name = creature.id;
    const body = new Mesh(
      new BoxGeometry(
        creature.kind === 'spitter' ? 1.1 : 0.9,
        creature.kind === 'spitter' ? 0.9 : 0.65,
        creature.kind === 'spitter' ? 0.85 : 1.1,
      ),
      new MeshStandardMaterial({
        color: creature.kind === 'spitter' ? '#385345' : '#34213f',
        roughness: 1,
      }),
    );
    body.position.y = 0.45;
    const eyes = new Mesh(
      new BoxGeometry(0.5, 0.12, 0.08),
      new MeshBasicMaterial({ color: '#e96875' }),
    );
    eyes.position.set(0, 0.58, -0.57);
    group.add(body, eyes);
    return group;
  }

  resize() {
    if (this.#disposed) return;
    const width = Math.max(1, this.#container.clientWidth);
    const height = Math.max(1, this.#container.clientHeight);
    const bounds = calculateOrthographicBounds(width, height, CAMERA_HEIGHT);
    Object.assign(this.#camera, bounds);
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(width, height, false);
  }

  #render = (time: number) => {
    if (this.#disposed) return;
    const elapsedSeconds =
      Math.min(0.25, Math.max(0, time - this.#previousRenderTime)) / 1_000;
    this.#previousRenderTime = time;
    if (!this.#reducedMotion.matches) {
      const offset = Math.sin((time - this.#startTime) / 450) * 0.08;
      this.#players.forEach((entry) => {
        entry.object.position.y = offset;
      });
    } else {
      this.#players.forEach((entry) => {
        entry.object.position.y = 0;
      });
    }
    for (let index = this.#effects.length - 1; index >= 0; index -= 1) {
      const effect = this.#effects[index];
      if (effect !== undefined && effect.expiresAt <= time) {
        this.#effects.splice(index, 1);
        this.#disposeEffect(effect);
      }
    }
    const presentationPaused =
      time < this.#hitStopUntil && !this.#reducedEffects;
    this.#players.forEach((entry) => {
      const position = entry.player.isLocal
        ? this.#localPrediction.sample(presentationPaused ? 0 : elapsedSeconds)
        : entry.buffer.sample(time);
      if (position !== null) {
        entry.object.position.x = position.x;
        entry.object.position.z = position.z;
        if (entry.player.isLocal) {
          this.#camera.position.set(position.x + 12, 16, position.z + 12);
          this.#camera.lookAt(position.x, 0, position.z);
        }
      }
      const dashing = (this.#dashPulseUntil.get(entry.player.id) ?? 0) > time;
      const melee = (this.#meleePulseUntil.get(entry.player.id) ?? 0) > time;
      const hit = (this.#hitPulseUntil.get(entry.player.id) ?? 0) > time;
      entry.object.scale.set(
        dashing ? 1.15 : melee ? 1.25 : hit ? 1.18 : 1,
        entry.player.alive ? (dashing ? 0.82 : melee ? 0.9 : 1) : 0.28,
        1,
      );
      entry.object.rotation.y =
        entry.player.alive && melee ? -entry.player.meleeAngleRadians : 0;
      entry.object.rotation.z = entry.player.alive ? 0 : Math.PI / 2;
      const shotgun = entry.object.getObjectByName('shotgun');
      const pistol = entry.object.getObjectByName('pistol');
      if (shotgun !== undefined)
        shotgun.visible = entry.player.weaponId === 'centre-shotgun';
      if (pistol !== undefined)
        pistol.visible = entry.player.weaponId !== 'centre-shotgun';
    });
    this.#creatures.forEach((entry) => {
      const position = entry.buffer.sample(time);
      if (position !== null) {
        entry.object.position.x = position.x;
        entry.object.position.z = position.z;
      }
      const warning = entry.player.attackWindupTicksRemaining > 0;
      const pulse = warning ? 1 + Math.sin(time * 0.035) * 0.18 : 1;
      entry.object.scale.set(pulse, entry.player.alive ? pulse : 0.2, pulse);
      entry.object.rotation.z = entry.player.alive ? 0 : Math.PI / 2;
    });
    this.#creatureProjectiles.forEach((entry) => {
      const position = entry.buffer.sample(time, 50);
      if (position !== null) {
        entry.object.position.x = position.x;
        entry.object.position.z = position.z;
      }
    });
    this.#pickups.forEach((entry) => {
      const position = entry.buffer.sample(time);
      if (position !== null) {
        entry.object.position.x = position.x;
        entry.object.position.z = position.z;
      }
      entry.object.rotation.y = time * 0.0015;
    });
    if (time < this.#cameraShakeUntil && !this.#reducedEffects) {
      const remaining = (this.#cameraShakeUntil - time) / 140;
      this.#camera.position.x += Math.sin(time * 0.18) * 0.16 * remaining;
      this.#camera.position.z += Math.cos(time * 0.21) * 0.16 * remaining;
    }
    this.#renderer.render(this.#scene, this.#camera);
    this.#animationFrame = requestAnimationFrame(this.#render);
  };

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#animationFrame !== undefined)
      cancelAnimationFrame(this.#animationFrame);
    this.#resizeObserver.disconnect();
    this.#players.disposeAll((group) => this.#removeDog(group));
    this.#creatures.disposeAll((group) => this.#removeDog(group));
    this.#creatureProjectiles.disposeAll((projectile) => {
      this.#scene.remove(projectile);
      projectile.geometry.dispose();
      const materials = Array.isArray(projectile.material)
        ? projectile.material
        : [projectile.material];
      materials.forEach((material) => material.dispose());
    });
    this.#pickups.disposeAll((pickup) => {
      this.#scene.remove(pickup);
      pickup.geometry.dispose();
      const materials = Array.isArray(pickup.material)
        ? pickup.material
        : [pickup.material];
      materials.forEach((material) => material.dispose());
    });
    this.#lastDashEvent.clear();
    this.#dashPulseUntil.clear();
    this.#lastMeleeEvent.clear();
    this.#meleePulseUntil.clear();
    this.#lastShotEvent.clear();
    this.#lastDryFireEvent.clear();
    this.#lastReloadEvent.clear();
    this.#lastHealth.clear();
    this.#hitPulseUntil.clear();
    while (this.#effects.length > 0) {
      const effect = this.#effects.pop();
      if (effect !== undefined) this.#disposeEffect(effect);
    }
    this.#scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
  }

  #removeDog(group: Group) {
    this.#scene.remove(group);
    this.#disposeGroup(group);
  }

  #disposeGroup(group: Group) {
    group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
}
