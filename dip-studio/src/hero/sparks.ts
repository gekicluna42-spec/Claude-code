/**
 * Cold spark fountains — the visual language of DIP Studio's prskalice.
 *
 * Symmetrical columns, ballistic arcs, warm falloff. Nothing here depicts
 * behaviour beyond a fountain rising and falling.
 */

import * as THREE from 'three';
import { sparkFragment, sparkVertex } from './shaders';

/** Column positions in clip space — mirrored, matching the master frame. */
const COLUMNS = [-0.78, -0.46, -0.22, 0.22, 0.46, 0.78];

export interface Sparks {
  object: THREE.Points;
  setIntensity(v: number): void;
  /** Columns sit wider as the camera pulls back. */
  setSpread(v: number): void;
  update(time: number): void;
  dispose(): void;
}

export function createSparks(perColumn: number, resolution: THREE.Vector2): Sparks {
  const count = COLUMNS.length * perColumn;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const columns = new Float32Array(count);
  const speeds = new Float32Array(count);

  let i = 0;
  for (const column of COLUMNS) {
    for (let n = 0; n < perColumn; n++) {
      seeds[i] = Math.random();
      columns[i] = column;
      speeds[i] = 0.7 + Math.random() * 0.7;
      i++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aColumn', new THREE.BufferAttribute(columns, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: sparkVertex,
    fragmentShader: sparkFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uResolution: { value: resolution },
      uSpread: { value: 1 },
      uLift: { value: 1 },
    },
  });

  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = 2;

  return {
    object,
    setIntensity(v) { material.uniforms.uIntensity.value = v; },
    setSpread(v) { material.uniforms.uSpread.value = v; },
    update(time) { material.uniforms.uTime.value = time; },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
