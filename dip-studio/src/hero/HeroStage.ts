/**
 * The stage: one full-screen quad running the hero shader, plus the spark
 * fountains. It owns no scroll logic — it is handed a progress value and
 * renders exactly the state that progress implies.
 */

import * as THREE from 'three';
import { fragmentShader, vertexShader } from './shaders';
import { createSparks, type Sparks } from './sparks';
import type { HeroSource } from './sources';
import { stateAt, type ActState } from './timeline';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  source: HeroSource;
  /** Lower tier = fewer particles and a tighter pixel-ratio cap. */
  quality: 'high' | 'low';
  /**
   * Overrides the act timeline. The hero leaves this unset; the effect
   * previews use it to hold one effect and animate it on their own clock.
   */
  stateProvider?: (progress: number, time: number) => ActState;
  /**
   * Whether dispose() also disposes the source. Previews reuse one cached
   * source across openings, so they pass false.
   */
  disposeSource?: boolean;
}

export class HeroStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private sparks: Sparks;
  private source: HeroSource;
  private resolution = new THREE.Vector2(1, 1);
  private pointer = new THREE.Vector2(0, 0);
  private pointerTarget = new THREE.Vector2(0, 0);
  private progress = 0;
  private clock = new THREE.Clock();
  private frame = 0;
  private running = false;
  private observer: ResizeObserver;
  /** Phone screens are dimmer and smaller; lift the grade to match desktop. */
  private exposureBoost: number;

  constructor(private options: StageOptions) {
    this.source = options.source;
    this.exposureBoost = options.quality === 'low' ? 1.28 : 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
    });
    this.renderer.setClearColor(0x060607, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTexture: { value: this.source.texture },
        uTexSize: { value: this.source.size },
        uResolution: { value: this.resolution },
        uTime: { value: 0 },
        uCrop: { value: new THREE.Vector3(0.5, 0.5, 1) },
        uYaw: { value: 0 },
        uExposure: { value: 1 },
        uContrast: { value: 1 },
        uSaturation: { value: 1 },
        uVignette: { value: 0.5 },
        uDof: { value: 0 },
        uFog: { value: 0 },
        uBeams: { value: 0 },
        uStars: { value: 0 },
        uBloom: { value: 0 },
        uGrain: { value: 0.035 },
        uPointer: { value: this.pointer },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);

    this.sparks = createSparks(options.quality === 'high' ? 260 : 90, this.resolution);
    this.scene.add(this.sparks.object);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(options.canvas.parentElement ?? options.canvas);
    this.resize();

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.pointerTarget.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      (event.clientY / window.innerHeight) * 2 - 1,
    );
  };

  private resize(): void {
    const parent = this.options.canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;
    const cap = this.options.quality === 'high' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    this.renderer.setSize(width, height, false);
    this.resolution.set(width * this.renderer.getPixelRatio(), height * this.renderer.getPixelRatio());
  }

  setProgress(progress: number): void {
    this.progress = progress;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.loop);
    this.render();
  };

  private render(): void {
    const time = this.clock.getElapsedTime();
    const s = this.options.stateProvider
      ? this.options.stateProvider(this.progress, time)
      : stateAt(this.progress);
    const u = this.material.uniforms;

    // Damp the pointer so the parallax never feels twitchy.
    this.pointer.lerp(this.pointerTarget, 0.045);

    u.uTime.value = time;
    (u.uCrop.value as THREE.Vector3).set(s.cropX, s.cropY, s.cropW);
    u.uYaw.value = s.yaw;
    u.uExposure.value = s.exposure * this.exposureBoost;
    u.uContrast.value = s.contrast;
    u.uSaturation.value = s.saturation;
    u.uVignette.value = s.vignette * (this.exposureBoost > 1 ? 0.82 : 1);
    u.uDof.value = s.dof;
    u.uFog.value = s.fog;
    u.uBeams.value = s.beams;
    u.uStars.value = s.stars;
    u.uBloom.value = s.bloom;

    this.sparks.setIntensity(s.sparks);
    this.sparks.setSpread(0.55 + s.cropW * 0.55);
    this.sparks.update(time);

    this.source.update(this.progress);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.stop();
    this.observer.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    this.sparks.dispose();
    this.material.dispose();
    if (this.options.disposeSource !== false) this.source.dispose();
    this.renderer.dispose();
  }
}
