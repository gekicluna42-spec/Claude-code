/**
 * A cloud of points that morphs between two shapes.
 *
 * Both shapes live on the GPU as attributes and a single uniform blends
 * between them, so a morph of tens of thousands of points costs one uniform
 * write per frame rather than a CPU pass over every position. That is what
 * makes the interactive X and the footer affordable on a page that is already
 * scrubbing a frame reel.
 *
 * Points also drift on a per-point phase so the cloud never looks frozen, and
 * respond to a pointer position pushed in from the layer above.
 */

import * as THREE from 'three';

export interface CloudOptions {
  /** Flat xyz triples. Must be the same length as `to`. */
  from: Float32Array;
  to: Float32Array;
  size: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
  /** How far a point drifts on its idle wander, in world units. */
  drift?: number;
}

const vertexShader = /* glsl */ `
  uniform float uMorph;
  uniform float uTime;
  uniform float uSize;
  uniform float uDrift;
  uniform vec3 uPointer;
  uniform float uPointerStrength;
  uniform float uPixelRatio;

  attribute vec3 aTarget;
  attribute float aPhase;
  attribute float aScale;

  varying float vMix;

  void main() {
    vec3 base = mix(position, aTarget, uMorph);

    // Idle wander. Each point keeps its own phase so the cloud breathes
    // instead of pulsing in unison.
    base.x += sin(uTime * 0.5 + aPhase) * uDrift;
    base.y += cos(uTime * 0.42 + aPhase * 1.3) * uDrift;
    base.z += sin(uTime * 0.33 + aPhase * 0.7) * uDrift;

    // Pointer repulsion, falling off smoothly so there is no hard edge.
    vec3 away = base - uPointer;
    float d = length(away);
    float push = uPointerStrength * exp(-d * d * 0.12);
    base += normalize(away + 1e-4) * push;

    vMix = clamp(uMorph + aPhase * 0.06, 0.0, 1.0);

    vec4 mv = modelViewMatrix * vec4(base, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixelRatio * (12.0 / -mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vMix;

  void main() {
    // Round, soft-edged points. Discarding outside the disc keeps them from
    // reading as squares at small sizes.
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float alpha = smoothstep(0.25, 0.02, d);
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), alpha);
  }
`;

export class ParticleCloud {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;

  constructor(options: CloudOptions) {
    const count = options.from.length / 3;
    const phase = new Float32Array(count);
    const scale = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      phase[i] = Math.random() * Math.PI * 2;
      // A spread of sizes reads as depth even before perspective does.
      scale[i] = 0.55 + Math.random() * 0.75;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(options.from, 3));
    this.geometry.setAttribute('aTarget', new THREE.BufferAttribute(options.to, 3));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMorph: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: options.size },
        uDrift: { value: options.drift ?? 0.05 },
        uPointer: { value: new THREE.Vector3(999, 999, 999) },
        uPointerStrength: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColorA: { value: options.colorA },
        uColorB: { value: options.colorB },
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  set morph(value: number) {
    this.material.uniforms.uMorph!.value = value;
  }

  get morph(): number {
    return this.material.uniforms.uMorph!.value as number;
  }

  set time(value: number) {
    this.material.uniforms.uTime!.value = value;
  }

  /** Pointer in the cloud's own local space, plus how hard it pushes. */
  pointer(local: THREE.Vector3, strength: number): void {
    (this.material.uniforms.uPointer!.value as THREE.Vector3).copy(local);
    this.material.uniforms.uPointerStrength!.value = strength;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Points filling an X built from two crossing bars, in a 1x1 box. */
export function xShape(count: number, thickness = 0.16, depth = 0.22): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Pick an arm, then a position along it and an offset across it.
    const arm = Math.random() < 0.5 ? 1 : -1;
    const along = Math.random() * 2 - 1;
    const across = (Math.random() * 2 - 1) * thickness;
    // Taper the ends so the arms read as solid geometry, not as a bowtie.
    const taper = 1 - Math.abs(along) * 0.18;
    out[i * 3] = along + across * arm * taper;
    out[i * 3 + 1] = along * arm - across * taper;
    out[i * 3 + 2] = (Math.random() * 2 - 1) * depth;
  }
  return out;
}

/** Points scattered through a box, for the dispersed state of a morph. */
export function cloudShape(count: number, spread: THREE.Vector3): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = (Math.random() * 2 - 1) * spread.x;
    out[i * 3 + 1] = (Math.random() * 2 - 1) * spread.y;
    out[i * 3 + 2] = (Math.random() * 2 - 1) * spread.z;
  }
  return out;
}
