/**
 * Placing world objects where DOM elements are.
 *
 * The world is one perspective scene behind the whole document, but every
 * object in it belongs to a section the visitor is reading. Rather than author
 * each one in arbitrary world coordinates and hope it lines up, each is
 * anchored to its DOM element: this maps that element's on-screen rectangle
 * into world space at the camera's working depth, so a change to the CSS moves
 * the 3D object with it.
 */

import * as THREE from 'three';

export interface Anchored {
  /** World units per CSS pixel at the anchor depth. */
  scale: number;
  /** Whether the element is on or near screen. */
  visible: boolean;
}

export class Anchor {
  constructor(
    readonly element: HTMLElement,
    private camera: THREE.PerspectiveCamera,
    /** Distance in front of the camera the object sits at. */
    readonly depth = 12,
  ) {}

  /** Height of the visible frustum, in world units, at this anchor's depth. */
  private frustumHeight(): number {
    return 2 * this.depth * Math.tan((this.camera.fov * Math.PI) / 360);
  }

  /**
   * Moves `object` so it covers the element's box. Returns false when the
   * element is far off screen, which is the layer's cue to stop updating.
   */
  apply(object: THREE.Object3D): Anchored {
    const rect = this.element.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;

    // A generous margin: objects should already be settled by the time they
    // scroll in, not begin animating on the first visible pixel.
    const visible = rect.bottom > -vh * 0.4 && rect.top < vh * 1.4;
    const perPixel = this.frustumHeight() / vh;

    const cx = rect.left + rect.width / 2 - vw / 2;
    const cy = rect.top + rect.height / 2 - vh / 2;

    object.position.set(cx * perPixel, -cy * perPixel, this.camera.position.z - this.depth);
    return { scale: perPixel, visible };
  }
}
