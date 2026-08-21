/**
 * One WebGL context for the entire page.
 *
 * A context per section is the obvious way to build this and the wrong one:
 * browsers cap the number of live contexts (and silently kill the oldest),
 * each one costs memory, and none of them can share a world. So there is one
 * canvas, fixed behind the document, and every object draws into it.
 *
 * It is also the cheap option. The renderer only runs when something visible
 * has asked it to, and stops entirely when the page is hidden or no registered
 * object is on screen — so the world costs nothing while the visitor is
 * reading the pricing table.
 */

import * as THREE from 'three';
import type { Quality } from './quality';

export interface Layer {
  /** Everything this layer draws. Added to the shared scene. */
  readonly object3d: THREE.Object3D;
  /** True while the layer's DOM anchor is on or near screen. */
  active: boolean;
  update(time: number, delta: number): void;
  dispose(): void;
}

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private layers = new Set<Layer>();
  private clock = new THREE.Clock();
  private running = false;
  private raf = 0;
  private observer: ResizeObserver | null = null;

  /** Null when WebGL is unavailable — every caller treats that as "skip". */
  static create(canvas: HTMLCanvasElement, quality: Quality): Renderer | null {
    if (quality.disabled) return null;
    try {
      const gl = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
        depth: true,
        stencil: false,
        failIfMajorPerformanceCaveat: false,
      });
      return new Renderer(gl, quality);
    } catch {
      // A refused context is not an error worth surfacing: the page is built
      // to be complete without it.
      return null;
    }
  }

  private constructor(
    renderer: THREE.WebGLRenderer,
    private quality: Quality,
  ) {
    this.renderer = renderer;
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxDpr));

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
    this.camera.position.set(0, 0, 12);
    this.scene.fog = new THREE.FogExp2(0x070708, 0.028);

    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(renderer.domElement);

    // Nothing renders while the tab is in the background.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.wake();
    });
  }

  add(layer: Layer): void {
    this.layers.add(layer);
    this.scene.add(layer.object3d);
    this.wake();
  }

  private resize(): void {
    const gl = this.renderer;
    if (!gl) return;
    const { clientWidth: w, clientHeight: h } = gl.domElement;
    if (!w || !h) return;
    gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Starts the loop if any layer is on screen. Cheap to call every frame. */
  wake(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.clock.getDelta();
    this.raf = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick = (): void => {
    if (!this.running || !this.renderer) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    let anyActive = false;
    for (const layer of this.layers) {
      layer.object3d.visible = layer.active;
      if (!layer.active) continue;
      anyActive = true;
      layer.update(time, delta);
    }

    if (anyActive) {
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    // Nothing on screen wants the GPU. Idle until something does.
    this.stop();
  };

  get dpr(): number {
    return this.quality.maxDpr;
  }

  dispose(): void {
    this.stop();
    this.observer?.disconnect();
    for (const layer of this.layers) layer.dispose();
    this.layers.clear();
    this.renderer?.dispose();
    this.renderer = null;
  }
}
