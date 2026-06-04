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
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-7 hidden h-px hairline md:block" />
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
