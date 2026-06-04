'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { Reveal } from './ui/Reveal';
import { faqs } from '@/lib/data';

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 md:py-32">
      <div className="container-content">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />

        <div className="mx-auto mt-12 max-w-2xl divide-y divide-ink-700 border-y border-ink-700">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.04}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-lg font-medium text-mist">{item.q}</span>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink-600 text-mist-muted transition-transform duration-300 ${
                      isOpen ? 'rotate-45 border-accent/50 text-accent-glow' : ''
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.21, 0.47, 0.32, 0.98] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-10 text-sm leading-relaxed text-mist-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
