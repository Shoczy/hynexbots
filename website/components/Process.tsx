'use client';

import { motion } from 'framer-motion';
import { Stagger, staggerItem } from './ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { steps } from '@/lib/data';

export function Process() {
  return (
    <section id="process" className="relative py-24 md:py-32">
      <div className="container-content">
        <SectionHeading
          eyebrow="How it works"
          title={<>From ticket to <span className="text-gradient-accent">live bot</span>, in four steps.</>}
          description="A simple, transparent process. You always know what’s happening and what comes next."
        />

        <Stagger className="relative mt-16 grid gap-8 md:grid-cols-4">
          {/* connecting line — dashed wave threaded through the step markers */}
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-14 md:block" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 1200 40" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="processWave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                  <stop offset="14%" stopColor="#818cf8" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#a5a3ff" stopOpacity="0.6" />
                  <stop offset="86%" stopColor="#818cf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M28 20 C 131 6 233 6 336 20 C 439 34 541 34 644 20 C 747 6 850 6 953 20"
                stroke="url(#processWave)"
                strokeWidth="1.5"
                strokeDasharray="2 7"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          {steps.map((s) => (
            <motion.div key={s.n} variants={staggerItem} className="relative">
              <div className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl border border-ink-600 bg-ink-900 font-display text-lg font-semibold text-accent-soft">
                {s.n}
              </div>
              <h3 className="mt-5 font-display text-lg font-medium text-mist">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-muted">{s.body}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
