/**
 * The stage: one full-screen quad running the hero shader, plus the spark
 * fountains. It owns no scroll logic — it is handed a progress value and
 * renders exactly the state that progress implies.
 */

import * as THREE from 'three';
import { fragmentShader, vertexShader } from './shaders';
import { createSparks, type Sparks } from './sparks';
import type { HeroSource } from './sources';
import { pace, stateAt, type ActState } from './timeline';

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
  /**
   * Seconds for the rendered progress to close ~63% of the gap to the scroll
   * target. Larger glides more; ~0.07 reads as a camera move rather than a
   * slider. Previews, which drive progress themselves, pass 0 to disable it.
   */
  smoothing?: number;
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
  /** Where the scroll says we are. */
  private target = 0;
  /** Where the render actually is — eased toward the target every frame. */
  private progress = 0;
  /** Smoothed |dProgress/dt|, drives the velocity response. */
  private speed = 0;
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
      // Blur taps dominate the fragment cost; phones get half of them.
      defines: { TAPS: options.quality === 'high' ? 8 : 4 },
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

  /** Scroll target. The render eases toward it. */
  setProgress(progress: number): void {
    this.target = progress;
  }

  /** What the render is showing right now, behind the scroll target. */
  get renderedProgress(): number {
    return this.progress;
  }

  /** Where the scroll currently points. */
  get targetProgress(): number {
    return this.target;
  }

  /** Jump both values — first paint and ScrollTrigger refreshes. */
  snapProgress(progress: number): void {
    this.target = progress;
    this.progress = progress;
    this.speed = 0;
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
    // getDelta() also advances elapsedTime, so read the delta first. The clamp
    // guards the backgrounded-tab case without starving the glide on a slow
    // device, where a frame can legitimately take ~100ms.
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.elapsedTime;

    const tau = this.options.smoothing ?? 0;
    if (tau > 0 && dt > 0) {
      const previous = this.progress;
      // Frame-rate independent: the same glide at 60 and at 120 Hz.
      this.progress += (this.target - this.progress) * (1 - Math.exp(-dt / tau));

      const instant = Math.abs(this.progress - previous) / dt;
      // Ease the speed itself, so the grade breathes instead of flickering.
      this.speed += (Math.min(instant / 0.7, 1) - this.speed) * (1 - Math.exp(-dt / 0.12));
    } else {
      this.progress = this.target;
    }

    const s = this.options.stateProvider
      ? this.options.stateProvider(this.progress, time)
      : stateAt(this.progress);
    const u = this.material.uniforms;

    // Movement picks up a little more light and texture; it settles back.
    const v = this.speed;

    // Damp the pointer so the parallax never feels twitchy.
    this.pointer.lerp(this.pointerTarget, 0.045);

    u.uTime.value = time;
    (u.uCrop.value as THREE.Vector3).set(s.cropX, s.cropY, s.cropW);
    u.uYaw.value = s.yaw;
    u.uExposure.value = s.exposure * this.exposureBoost;
    u.uContrast.value = s.contrast;
    u.uSaturation.value = s.saturation;
    u.uVignette.value = (s.vignette + v * 0.08) * (this.exposureBoost > 1 ? 0.82 : 1);
    u.uDof.value = s.dof + v * 0.05;
    u.uFog.value = s.fog;
    u.uBeams.value = s.beams;
    u.uStars.value = s.stars;
    u.uBloom.value = s.bloom + v * 0.16;
    u.uGrain.value = 0.035 + v * 0.018;

    this.sparks.setIntensity(s.sparks);
    this.sparks.setSpread(0.55 + s.cropW * 0.55);
    this.sparks.update(time);

    // The frame index is paced so the moment settles on each act's peak; the
    // acts and copy beats stay on the raw value (see hero/index.ts).
    // Blending follows speed: blurred through the move, crisp once settled.
    // Previews drive progress on their own clock and are always in motion, so
    // they always blend — without it a 12 fps ladder in slow motion steps.
    const blend = this.options.stateProvider ? 1 : Math.min(v * 4, 1);
    this.source.update(
      this.options.stateProvider ? this.progress : pace(this.progress),
      blend,
    );
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
