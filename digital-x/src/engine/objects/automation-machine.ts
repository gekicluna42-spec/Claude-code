/**
 * The Automation Machine.
 *
 * The verified five-step chain — upit → kvalifikacija → CRM → termin →
 * follow-up — drawn as a machine that is actually running: signals enter at
 * one end and travel through, and the step the visitor is on lights as they
 * arrive. Nothing is claimed here that the DOM chain above it does not already
 * say; this is the same five steps, moving.
 */

import * as THREE from 'three';
import { Anchor } from '../anchor';
import type { Layer } from '../Renderer';
import type { Quality } from '../quality';

const CYAN = new THREE.Color('#6fe3f2');
const IVORY = new THREE.Color('#f3eee5');

export interface StepLayer extends Layer {
  /** Which step is lit, 0-based; -1 for none. */
  setStep(index: number): void;
}

export function createAutomationMachine(
  element: HTMLElement,
  steps: number,
  camera: THREE.PerspectiveCamera,
  quality: Quality,
  options: { wake: () => void },
): StepLayer {
  const group = new THREE.Group();
  const span = 2.4;
  const stationAt = (i: number) => -span / 2 + (span * i) / Math.max(1, steps - 1);

  // The rail every signal runs along.
  const rail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-span / 2, 0, 0),
      new THREE.Vector3(span / 2, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.2 }),
  );
  group.add(rail);

  // One station per verified step.
  const stationGeometry = new THREE.OctahedronGeometry(0.075, 0);
  const stations: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let i = 0; i < steps; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(stationGeometry, material);
    mesh.position.set(stationAt(i), 0, 0);
    group.add(mesh);
    stations.push(mesh);
  }

  // The signals themselves: points that run the rail on a loop, each offset so
  // the machine always has something in flight.
  const flightCount = quality.tier === 'low' ? 18 : 44;
  const flightPositions = new Float32Array(flightCount * 3);
  const offsets = Array.from({ length: flightCount }, (_, i) => i / flightCount);
  const flightGeometry = new THREE.BufferGeometry();
  flightGeometry.setAttribute('position', new THREE.BufferAttribute(flightPositions, 3));
  const flightMaterial = new THREE.PointsMaterial({
    size: 0.05,
    color: IVORY,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Points(flightGeometry, flightMaterial));

  const anchor = new Anchor(element, camera, 12);
  let lit = -1;
  const energy = new Float32Array(steps);

  const layer: StepLayer = {
    object3d: group,
    active: false,
    setStep(index) {
      lit = index;
      options.wake();
    },
    update(time) {
      const { scale, visible } = anchor.apply(group);
      layer.active = visible;
      if (!visible) return;

      const rect = element.getBoundingClientRect();
      group.scale.setScalar(rect.width * scale * 0.36);

      for (let i = 0; i < steps; i++) {
        const want = i <= lit ? 1 : 0;
        energy[i]! += (want - energy[i]!) * 0.08;
        const station = stations[i]!;
        station.material.opacity = 0.2 + energy[i]! * 0.75;
        const pulse = 1 + energy[i]! * (0.25 + Math.sin(time * 2.2 + i) * 0.08);
        station.scale.setScalar(pulse);
        station.rotation.y = time * 0.5 + i;
      }

      for (let i = 0; i < flightCount; i++) {
        // Signals only run as far as the machine has been lit, so the flow
        // follows the visitor through the chain rather than ignoring them.
        const reach = lit < 0 ? 0.25 : (lit + 1) / steps;
        const t = ((time * 0.16 + offsets[i]!) % 1) * reach;
        flightPositions[i * 3] = -span / 2 + span * t;
        flightPositions[i * 3 + 1] = Math.sin(t * Math.PI * 6 + i) * 0.03;
        flightPositions[i * 3 + 2] = Math.cos(t * Math.PI * 4 + i) * 0.03;
      }
      flightGeometry.attributes.position!.needsUpdate = true;
    },
    dispose() {
      stationGeometry.dispose();
      for (const s of stations) s.material.dispose();
      flightGeometry.dispose();
      flightMaterial.dispose();
      rail.geometry.dispose();
      (rail.material as THREE.Material).dispose();
    },
  };

  return layer;
}
