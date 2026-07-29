import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Vector2,
  Vector3,
  Scene,
  WebGLRenderer,
} from 'three';

import type { PlayerView } from '../multiplayer/types';
import { createMapVisuals, TERRA_ROSSA_MAP } from '../../../shared/map';
import { calculateOrthographicBounds } from './projection';
import { LocalPrediction } from './LocalPrediction';
import { PlayerPresentationRegistry } from './PlayerPresentation';

const CAMERA_HEIGHT = 18;

export class GameScene {
  readonly #container: HTMLElement;
  readonly #scene = new Scene();
  readonly #camera = new OrthographicCamera();
  readonly #renderer: WebGLRenderer;
  readonly #players = new PlayerPresentationRegistry<Group>();
  readonly #localPrediction = new LocalPrediction();
  readonly #lastDashEvent = new Map<string, number>();
  readonly #dashPulseUntil = new Map<string, number>();
  readonly #lastMeleeEvent = new Map<string, number>();
  readonly #meleePulseUntil = new Map<string, number>();
  readonly #reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  readonly #resizeObserver: ResizeObserver;
  #animationFrame: number | undefined;
  #startTime = performance.now();
  #disposed = false;
  #localPlayerId: string | null = null;
  #previousRenderTime = performance.now();
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
      }
      this.#lastMeleeEvent.set(player.id, player.meleeEvent);
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
    this.#players.forEach((entry) => {
      const position = entry.player.isLocal
        ? this.#localPrediction.sample(elapsedSeconds)
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
      entry.object.scale.set(
        dashing ? 1.15 : melee ? 1.25 : 1,
        dashing ? 0.82 : melee ? 0.9 : 1,
        1,
      );
      entry.object.rotation.y = melee ? -entry.player.meleeAngleRadians : 0;
    });
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
    this.#lastDashEvent.clear();
    this.#dashPulseUntil.clear();
    this.#lastMeleeEvent.clear();
    this.#meleePulseUntil.clear();
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
