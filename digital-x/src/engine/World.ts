/**
 * The ground the whole page sits on.
 *
 * A single drifting field of signal particles, fixed behind the document, so
 * that scrolling from one section to the next never leaves the world — the
 * objects change, the space does not.
 *
 * It is deliberately off during the film. There the frame reel is the world,
 * and a particle field over it would be two worlds arguing. The field fades in
 * once the film has ended and the page starts speaking.
 */

import * as THREE from 'three';
import type { Layer } from './Renderer';
import type { Quality } from './quality';

const CYAN = new THREE.Color('#6fe3f2');
const IVORY = new THREE.Color('#f3eee5');

export interface WorldLayer extends Layer {
  /** 0 hides the field entirely; 1 is full presence. */
  setPresence(value: number): void;
  /** Pointer in normalised device coordinates, for the parallax. */
  setPointer(x: number, y: number): void;
}

export function createWorld(
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: { wake: () => void },
): WorldLayer {
  const count = quality.fieldParticles;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Biased toward the back of the volume so the field reads as depth rather
    // than as a curtain in front of the copy.
    const depth = Math.pow(Math.random(), 0.6);
    positions[i * 3] = (Math.random() * 2 - 1) * 26;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 18;
    positions[i * 3 + 2] = -depth * 42;
    phases[i] = Math.random() * Math.PI * 2;
    (Math.random() < 0.12 ? CYAN : IVORY).toArray(colors, i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  let presence = 0;
  let target = 0;
  const pointer = new THREE.Vector2();
  const smoothed = new THREE.Vector2();

  const layer: WorldLayer = {
    object3d: group,
    active: false,
    setPresence(value) {
      target = Math.max(0, Math.min(1, value));
      if (target > 0) options.wake();
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    update(time, delta) {
      presence += (target - presence) * 0.05;
      // Once it has genuinely faded out, stop asking for frames.
      layer.active = presence > 0.01;
      if (!layer.active) return;

      material.opacity = presence * 0.5;

      // The field drifts continuously and leans with the pointer. Both are
      // slow enough to read as atmosphere rather than as a reaction.
      smoothed.lerp(pointer, 0.03);
      group.position.set(smoothed.x * 1.4, smoothed.y * 0.9, 0);
      group.rotation.z = Math.sin(time * 0.03) * 0.03;
      points.position.y = Math.sin(time * 0.08) * 0.4;
      points.position.x = Math.cos(time * 0.05) * 0.3;
      // Keep the field parked in front of the camera so it never runs out.
      group.position.z = camera.position.z - 14;
      void delta;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };

  return layer;
}
