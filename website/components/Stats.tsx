'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { stats } from '@/lib/data';

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const isFloat = !Number.isInteger(value);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <span ref={ref}>
      {isFloat ? display.toFixed(1) : Math.round(display)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="relative py-16">
      <div className="container-content">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-700 bg-ink-700 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-ink-900/60 px-6 py-10 text-center">
              <div className="font-display text-4xl font-semibold tracking-tightest text-mist md:text-5xl">
                <CountUp value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm text-mist-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
