'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { Stagger, staggerItem } from './ui/Reveal';
import { SectionHeading } from './SectionHeading';
import { Icons } from './Icons';
import { bots, brand, type Bot } from '@/lib/data';

export function Catalog() {
  return (
    <section id="bots" className="relative py-24 md:py-32">
      <div className="container-content">
        <SectionHeading
          eyebrow="Ready-made bots"
          title={<>Battle-tested bots, <span className="text-gradient-accent">ready to ship.</span></>}
          description="Proven builds running in hundreds of servers. Delivered same-day, fully set up, and customizable to your brand."
        />

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </Stagger>

        <p className="mt-10 text-center text-sm text-mist-muted">
          Need something different?{' '}
          <a href="#custom" className="font-medium text-accent-soft underline-offset-4 hover:underline">
            Commission a custom bot →
          </a>
        </p>
      </div>
    </section>
  );
}

function BotCard({ bot }: { bot: Bot }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }

  return (
    <motion.div variants={staggerItem}>
      <div
        ref={ref}
        onMouseMove={onMove}
        className="group relative h-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/50 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ink-600"
      >
        {/* pointer spotlight */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx) var(--my), rgba(99,102,241,0.10), transparent 45%)',
          }}
        />
        <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${bot.accent} opacity-50 blur-3xl`} />

        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-mist-faint">{bot.category}</span>
              <h3 className="mt-1.5 font-display text-2xl font-semibold text-mist">{bot.name}</h3>
            </div>
            {bot.popular && (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-glow">
                Popular
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-mist-muted">{bot.blurb}</p>

          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bot.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-mist-muted">
                <Icons.check className="h-4 w-4 shrink-0 text-accent-soft" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-center justify-between border-t border-ink-700 pt-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-mist-faint">from</span>
              <span className="font-display text-2xl font-semibold text-mist">{bot.price}</span>
            </div>
            <a
              href={brand.discordInvite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-4 py-2 text-sm font-semibold text-mist transition-all duration-300 hover:border-accent/50 hover:bg-accent/10 hover:text-accent-glow"
            >
              Get this bot <Icons.arrow className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
