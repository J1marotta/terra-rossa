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

import { calculateOrthographicBounds } from './projection';

const CAMERA_HEIGHT = 18;

export class GameScene {
  readonly #container: HTMLElement;
  readonly #scene = new Scene();
  readonly #camera = new OrthographicCamera();
  readonly #renderer: WebGLRenderer;
  readonly #dog = new Group();
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

    const ground = new Mesh(
      new PlaneGeometry(30, 22),
      new MeshStandardMaterial({ color: '#322d36', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.#scene.add(ground);

    const obstacle = new Mesh(
      new BoxGeometry(3.5, 2.5, 2.5),
      new MeshStandardMaterial({ color: '#5f3134', roughness: 0.9 }),
    );
    obstacle.position.set(3, 1.25, -1.5);
    this.#scene.add(obstacle);

    const body = new Mesh(
      new BoxGeometry(1.25, 1.8, 0.8),
      new MeshStandardMaterial({ color: '#cf754b', roughness: 0.8 }),
    );
    body.position.y = 1.1;
    const head = new Mesh(
      new BoxGeometry(1.05, 0.9, 0.9),
      new MeshStandardMaterial({ color: '#e0a46d', roughness: 0.8 }),
    );
    head.position.set(0, 2.25, -0.1);
    this.#dog.add(body, head);
    this.#dog.position.set(-2.5, 0, 1.5);
    this.#scene.add(this.#dog);

    this.#scene.add(new AmbientLight('#c2b1d2', 1.6));
    const moonlight = new DirectionalLight('#f4d7ba', 2.8);
    moonlight.position.set(-8, 14, 6);
    this.#scene.add(moonlight);

    this.#camera.position.set(12, 16, 12);
    this.#camera.lookAt(0, 0, 0);
    this.#camera.near = 0.1;
    this.#camera.far = 100;
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
      this.#dog.position.y = Math.sin((time - this.#startTime) / 450) * 0.08;
    } else {
      this.#dog.position.y = 0;
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
}
