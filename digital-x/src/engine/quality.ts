/**
 * What this device can afford.
 *
 * The page already scrubs a frame reel; the WebGL world is the second call on
 * the same budget. Rather than scatter `isMobile ? a : b` through six objects,
 * every count and cap lives here, derived once from the tier the rest of the
 * site already uses.
 */

import { deviceTier, prefersReducedMotion } from '../lib/dom';

export interface Quality {
  tier: 'high' | 'low';
  /** Hard off. Nothing initialises a GL context. */
  disabled: boolean;
  maxDpr: number;
  /** Particles in the persistent field behind the whole page. */
  fieldParticles: number;
  /** Particles in the interactive X. */
  xParticles: number;
  /** Particles in the footer. */
  footerParticles: number;
  /** Nodes in the Authority Field constellation. */
  authorityNodes: number;
  /** Whether pointer parallax is wired at all. */
  pointer: boolean;
}

export function resolveQuality(): Quality {
  const tier = deviceTier();
  // Reduced motion switches the world off entirely rather than slowing it
  // down. A calmer particle field is still a particle field.
  const disabled = prefersReducedMotion();
  const low = tier === 'low';
  return {
    tier,
    disabled,
    maxDpr: low ? 1.25 : 1.75,
    fieldParticles: low ? 900 : 2600,
    xParticles: low ? 1400 : 4200,
    footerParticles: low ? 800 : 2400,
    authorityNodes: low ? 34 : 64,
    // Pointer parallax is a mouse affordance; a touch device has no hover to
    // respond to, and reading touch as a cursor makes the world twitch.
    pointer: !low && matchMedia('(hover: hover) and (pointer: fine)').matches,
  };
}
