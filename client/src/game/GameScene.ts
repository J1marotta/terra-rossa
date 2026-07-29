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
  Scene,
  WebGLRenderer,
} from 'three';

import type { PlayerView } from '../multiplayer/types';
import { createMapVisuals, TERRA_ROSSA_MAP } from '../../../shared/map';
import { calculateOrthographicBounds } from './projection';
import { PlayerPresentationRegistry } from './PlayerPresentation';

const CAMERA_HEIGHT = 18;

export class GameScene {
  readonly #container: HTMLElement;
  readonly #scene = new Scene();
  readonly #camera = new OrthographicCamera();
  readonly #renderer: WebGLRenderer;
  readonly #players = new PlayerPresentationRegistry<Group>();
  readonly #reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  readonly #resizeObserver: ResizeObserver;
  #animationFrame: number | undefined;
  #startTime = performance.now();
  #disposed = false;

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
        ? entry.buffer.latest()
        : entry.buffer.sample(time);
      if (position !== null) {
        entry.object.position.x = position.x;
        entry.object.position.z = position.z;
        if (entry.player.isLocal) {
          this.#camera.position.set(position.x + 12, 16, position.z + 12);
          this.#camera.lookAt(position.x, 0, position.z);
        }
      }
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
