/**
 * The Authority Field.
 *
 * A constellation of nodes that finds its own structure: nodes begin scattered
 * and, as the section is scrolled through, edges appear between the nearest
 * pairs until the field reads as one connected system. It is the SEO / GEO /
 * AEO story told as geometry — authority is not a score, it is how well
 * connected you are.
 *
 * Edges are one LineSegments object with a pre-computed neighbour list, so
 * nothing searches for pairs at runtime.
 */

import * as THREE from 'three';
import { Anchor } from '../anchor';
import type { Layer } from '../Renderer';
import type { Quality } from '../quality';

const CYAN = new THREE.Color('#6fe3f2');

export interface ProgressLayer extends Layer {
  /** 0 = scattered and unconnected, 1 = fully wired. */
  setProgress(value: number): void;
}

export function createAuthorityField(
  element: HTMLElement,
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: { wake: () => void },
): ProgressLayer {
  const count = quality.authorityNodes;
  const group = new THREE.Group();

  // Nodes on a flattened sphere: an even spread that still has depth, without
  // the clumping a uniform random cube gives.
  const nodes: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    nodes.push(
      new THREE.Vector3(Math.cos(theta) * radius * 1.5, y * 0.85, Math.sin(theta) * radius * 0.8),
    );
  }

  const nodeGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodeMaterial = new THREE.PointsMaterial({
    size: 0.055,
    color: CYAN,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Points(nodeGeometry, nodeMaterial));

  // Every pair closer than a threshold, sorted so the shortest edges — the
  // ones that read as structure rather than noise — appear first.
  const pairs: { a: number; b: number; d: number }[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const d = nodes[i]!.distanceTo(nodes[j]!);
      if (d < 0.72) pairs.push({ a: i, b: j, d });
    }
  }
  pairs.sort((p, q) => p.d - q.d);

  const positions = new Float32Array(pairs.length * 6);
  for (const [k, pair] of pairs.entries()) {
    const a = nodes[pair.a]!;
    const b = nodes[pair.b]!;
    positions.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
  }
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  edgeGeometry.setDrawRange(0, 0);
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

  const anchor = new Anchor(element, camera, 12);
  let progress = 0;
  let target = 0;

  const layer: ProgressLayer = {
    object3d: group,
    active: false,
    setProgress(value) {
      target = Math.max(0, Math.min(1, value));
      options.wake();
    },
    update(time) {
      const { scale, visible } = anchor.apply(group);
      layer.active = visible;
      if (!visible) return;

      const rect = element.getBoundingClientRect();
      group.scale.setScalar(Math.min(rect.width, rect.height * 1.6) * scale * 0.36);

      progress += (target - progress) * 0.07;
      // Drawing a prefix of the sorted edge list is the whole animation: the
      // field wires itself shortest-first as the visitor moves through it.
      edgeGeometry.setDrawRange(0, Math.floor(pairs.length * progress) * 2);
      edgeMaterial.opacity = 0.1 + progress * 0.24;
      nodeMaterial.opacity = 0.45 + progress * 0.45;

      group.rotation.y = time * 0.045;
      group.rotation.x = Math.sin(time * 0.07) * 0.08;
    },
    dispose() {
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    },
  };

  return layer;
}
