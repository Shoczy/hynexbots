'use client';

import { motion } from 'framer-motion';
import { Stagger, staggerItem } from './ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { Icons } from './Icons';
import { features } from '@/lib/data';

export function Features() {
  return (
    <section id="why" className="relative py-24 md:py-32">
      <div className="container-content">
        <SectionHeading
          eyebrow="Why Hynex"
          title={<>Everything you need to <span className="text-gradient-accent">launch & run</span> a bot.</>}
          description="From first idea to 24/7 uptime, we handle the whole lifecycle so you can focus on your community."
        />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = Icons[f.icon as keyof typeof Icons];
            return (
              <motion.div
                key={f.title}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/40 p-6 transition-colors duration-300 hover:border-ink-600"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-ink-600 bg-ink-800 text-accent-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-medium text-mist">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-muted">{f.body}</p>
                </div>
              </motion.div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
