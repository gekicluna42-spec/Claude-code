/**
 * Signal Objects — one 3D artifact per discipline, instead of a card.
 *
 * Each of the six verified disciplines gets a form that says something about
 * it: a lattice for web structure, a stack for applications, a radiating
 * search field, a converging funnel for advertising, a frame grid for content,
 * a closed loop for automation. All six are drawn from one instanced mesh, so
 * six objects cost one draw call.
 *
 * The artifact behind a discipline lights when its row is hovered or focused —
 * the DOM list stays the thing you read and operate.
 */

import * as THREE from 'three';
import { Anchor } from '../anchor';
import type { Layer } from '../Renderer';
import type { Quality } from '../quality';

const CYAN = new THREE.Color('#6fe3f2');
const TITANIUM = new THREE.Color('#3a3f49');

/** Cell offsets for each discipline's form, in a unit box. */
type Form = (i: number, n: number) => THREE.Vector3;

const FORMS: Record<string, Form> = {
  // Web & E-commerce — a structural lattice.
  web: (i, n) => {
    const side = Math.ceil(Math.cbrt(n));
    const x = i % side;
    const y = Math.floor(i / side) % side;
    const z = Math.floor(i / (side * side));
    return new THREE.Vector3(x / side - 0.5, y / side - 0.5, z / side - 0.5).multiplyScalar(1.7);
  },
  // Aplikacije — stacked planes, one process on top of another.
  aplikacije: (i, n) => {
    const layers = 5;
    const perLayer = Math.ceil(n / layers);
    const layer = Math.floor(i / perLayer);
    const k = i % perLayer;
    const side = Math.ceil(Math.sqrt(perLayer));
    return new THREE.Vector3(
      ((k % side) / side - 0.5) * 1.5,
      (layer / layers - 0.5) * 1.4,
      (Math.floor(k / side) / side - 0.5) * 1.5,
    );
  },
  // SEO / GEO / AEO — a field radiating from one point.
  seo: (i, n) => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    return new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r).multiplyScalar(0.85);
  },
  // Oglašavanje — many entries converging on one exit.
  oglasavanje: (i, n) => {
    const t = i / n;
    const angle = t * Math.PI * 12;
    const radius = (1 - t) * 0.9;
    return new THREE.Vector3(Math.cos(angle) * radius, t * 1.6 - 0.8, Math.sin(angle) * radius);
  },
  // Sadržaj & Produkcija — an ordered grid of frames.
  sadrzaj: (i, n) => {
    const side = Math.ceil(Math.sqrt(n));
    return new THREE.Vector3(
      ((i % side) / side - 0.5) * 1.8,
      (Math.floor(i / side) / side - 0.5) * 1.2,
      Math.sin(i * 0.7) * 0.12,
    );
  },
  // AI Automatizacija — a closed loop that keeps running.
  automatizacija: (i, n) => {
    const t = (i / n) * Math.PI * 2;
    const R = 0.85;
    const r = 0.26;
    const w = t * 3;
    return new THREE.Vector3(
      (R + r * Math.cos(w)) * Math.cos(t),
      r * Math.sin(w),
      (R + r * Math.cos(w)) * Math.sin(t),
    );
  },
};

export function createSignalObject(
  element: HTMLElement,
  formId: string,
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: { wake: () => void },
): Layer & { setActive(on: boolean): void } {
  const count = quality.tier === 'low' ? 90 : 190;
  const form = FORMS[formId] ?? FORMS.web!;

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: TITANIUM,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const colors = new Float32Array(count * 3);
  const seeds: number[] = [];
  const home: THREE.Vector3[] = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    home.push(form(i, count));
    seeds.push(Math.random() * Math.PI * 2);
    // A minority of cells carry the accent, so the cyan reads as signal
    // passing through the structure rather than as a coat of paint.
    const lit = Math.random() < 0.18;
    (lit ? CYAN : TITANIUM).toArray(colors, i * 3);
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

  const group = new THREE.Group();
  group.add(mesh);
  const anchor = new Anchor(element, camera, 12);

  let energy = 0;
  let target = 0;

  const layer = {
    object3d: group,
    active: false,
    setActive(on: boolean) {
      target = on ? 1 : 0;
      options.wake();
    },
    update(time: number) {
      const { scale, visible } = anchor.apply(group);
      layer.active = visible;
      if (!visible) return;

      const rect = element.getBoundingClientRect();
      group.scale.setScalar(Math.min(rect.width, rect.height) * scale * 0.3);
      energy += (target - energy) * 0.08;

      for (let i = 0; i < count; i++) {
        const base = home[i]!;
        const seed = seeds[i]!;
        // At rest the cells breathe in place; lit, they open outward.
        const bloom = 1 + energy * 0.28;
        const wobble = 0.02 + energy * 0.03;
        dummy.position.set(
          base.x * bloom + Math.sin(time * 0.6 + seed) * wobble,
          base.y * bloom + Math.cos(time * 0.5 + seed) * wobble,
          base.z * bloom + Math.sin(time * 0.4 + seed) * wobble,
        );
        dummy.rotation.set(seed + time * 0.08, seed * 1.3 + time * 0.06, 0);
        const s = (0.03 + (i % 5) * 0.006) * (1 + energy * 1.1);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      material.opacity = 0.32 + energy * 0.62;

      group.rotation.y = time * 0.08 + energy * 0.4;
      group.rotation.x = Math.sin(time * 0.11) * 0.1;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };

  return layer;
}

export const SIGNAL_FORMS = Object.keys(FORMS);
