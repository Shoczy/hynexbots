'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Atmospheric page background: a faint moving grid, two slow accent glows,
 * and a vignette. Fixed behind all content. Deliberately restrained for the
 * sleek-minimal-dark aesthetic.
 */
export function Backdrop() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />

      {/* Accent glows */}
      <motion.div
        className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 65%)' }}
        animate={reduce ? undefined : { opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[40%] -right-32 h-[420px] w-[520px] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(139,140,246,0.14), transparent 70%)' }}
        animate={reduce ? undefined : { opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  );
}
