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
  /**
   * Set by the layer itself during `update`, from a cheap check of where its
   * DOM anchor is. The renderer reads it afterwards to decide whether anything
   * is worth drawing.
   */
  active: boolean;
  /**
   * Called every frame the loop is running, whether or not the layer is
   * active — a layer that is only updated while active can never notice it
   * has become visible. Layers do their own rect check first and return early
   * when off screen, so an inactive layer costs one measurement.
   */
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
  /** Frames in a row with nothing on screen, before the loop parks itself. */
  private idleFrames = 0;

  /**
   * Probes for WebGL on a throwaway canvas before Three is allowed near one.
   *
   * Constructing a WebGLRenderer against a browser that cannot give it a
   * context does not merely throw — it logs errors on the way out, so every
   * visitor without WebGL gets a console full of complaints about a feature
   * the page is perfectly happy to do without. Asking first keeps that quiet.
   */
  private static supported(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl =
        probe.getContext('webgl2') ??
        probe.getContext('webgl') ??
        probe.getContext('experimental-webgl');
      if (!gl) return false;
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch {
      return false;
    }
  }

  /** Null when WebGL is unavailable — every caller treats that as "skip". */
  static create(canvas: HTMLCanvasElement, quality: Quality): Renderer | null {
    if (quality.disabled || !Renderer.supported()) return null;
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

  /** Starts the loop, or resets its idle countdown. Cheap to call often. */
  wake(): void {
    this.idleFrames = 0;
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
      // Every layer is updated. Each one measures its own anchor and returns
      // immediately when off screen, so this is a rect read for the ones that
      // have nothing to do — and it is the only way an off-screen layer ever
      // discovers it has scrolled into view.
      layer.update(time, delta);
      layer.object3d.visible = layer.active;
      if (layer.active) anyActive = true;
    }

    if (anyActive) {
      this.idleFrames = 0;
      this.renderer.render(this.scene, this.camera);
    } else if (++this.idleFrames > 45) {
      // Nothing has been on screen for the better part of a second. Park the
      // loop; scrolling, resizing or a pointer will start it again.
      this.stop();
      return;
    }

    this.raf = requestAnimationFrame(this.tick);
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
