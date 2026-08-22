/**
 * The interactive X.
 *
 * The film ends on the completed X; this is that same mark, alive and
 * reachable. Points hold the X while the section is at rest and disperse under
 * the pointer, reassembling the moment it leaves — the structure insisting on
 * itself, which is the argument the whole page is making.
 *
 * Both states live on the GPU; the layer only writes a morph value and a
 * pointer position per frame.
 */

import * as THREE from 'three';
import { Anchor } from '../anchor';
import { ParticleCloud, cloudShape, xShape } from '../ParticleCloud';
import type { Layer } from '../Renderer';
import type { Quality } from '../quality';

const CYAN = new THREE.Color('#6fe3f2');
const IVORY = new THREE.Color('#f3eee5');

export interface MorphLayer extends Layer {
  /** Lets scroll drive the dispersal independently of the pointer. */
  setMorph(value: number): void;
}

export function createParticleX(
  element: HTMLElement,
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: { count?: number; sizeFactor?: number; pointSize?: number; wake: () => void },
): MorphLayer {
  const count = options.count ?? quality.xParticles;
  const cloud = new ParticleCloud({
    from: xShape(count),
    to: cloudShape(count, new THREE.Vector3(1.9, 1.5, 0.9)),
    size: options.pointSize ?? 2.4,
    colorA: CYAN,
    colorB: IVORY,
    drift: 0.012,
  });

  const group = new THREE.Group();
  group.add(cloud.points);
  const anchor = new Anchor(element, camera, 12);

  const pointer = new THREE.Vector3(999, 999, 999);
  let strength = 0;
  let targetStrength = 0;
  let pointerMorph = 0;
  let scrollMorph = 0;

  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const normal = new THREE.Vector3(0, 0, 1);
  const hit = new THREE.Vector3();

  const layer: MorphLayer = {
    object3d: group,
    active: false,
    setMorph(value: number) {
      scrollMorph = value;
      options.wake();
    },
    update(time) {
      const { scale, visible } = anchor.apply(group);
      layer.active = visible;
      if (!visible) return;

      // Sized from the element it belongs to, so the CSS stays the single
      // source of truth for layout.
      const rect = element.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height) * scale * (options.sizeFactor ?? 0.42);
      group.scale.setScalar(size);

      cloud.time = time;
      // Ease rather than snap: the cloud should feel like it has mass.
      const target = Math.max(pointerMorph, scrollMorph);
      cloud.morph += (target - cloud.morph) * 0.06;
      strength += (targetStrength - strength) * 0.1;
      cloud.pointer(pointer, strength);

      // A slow idle turn, so the structure reads as dimensional at rest.
      group.rotation.z = Math.sin(time * 0.12) * 0.05;
      group.rotation.y = Math.sin(time * 0.09) * 0.12;
    },
    dispose() {
      cloud.dispose();
    },
  };

  if (quality.pointer) {
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      plane.setFromNormalAndCoplanarPoint(normal, group.position);
      if (ray.ray.intersectPlane(plane, hit)) {
        group.worldToLocal(pointer.copy(hit));
      }
      targetStrength = 0.5;
      pointerMorph = 0.24;
      options.wake();
    };
    const leave = () => {
      targetStrength = 0;
      pointerMorph = 0;
      options.wake();
    };
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', leave, { passive: true });
  }

  return layer;
}
