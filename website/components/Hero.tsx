'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Icons } from './Icons';
import { brand } from '@/lib/data';

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function Hero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
  };

  return (
    <section id="top" className="relative pt-36 pb-20 md:pt-44 md:pb-28">
      <div className="container-content">
        <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
          <motion.div variants={item} className="flex justify-center">
            <span className="eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Now taking custom commissions
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 font-display text-5xl font-semibold leading-[0.98] tracking-tightest text-mist sm:text-6xl md:text-7xl"
          >
            <span className="text-gradient">Discord bots,</span>
            <br />
            <span className="text-gradient-accent">engineered to ship.</span>
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-mist-muted">
            {brand.name} designs, builds, and hosts premium Discord bots — ready-made
            classics delivered same-day, or fully bespoke builds on a timeline you can trust.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={brand.discordInvite} target="_blank" rel="noreferrer" className="btn-primary w-full sm:w-auto">
              <Icons.discord className="h-4 w-4" />
              Open a ticket
            </a>
            <a href="#bots" className="btn-ghost w-full sm:w-auto">
              Browse the catalog
              <Icons.arrow className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.p variants={item} className="mt-5 text-xs uppercase tracking-[0.18em] text-mist-faint">
            Same-day delivery · 24/7 hosting · Lifetime support
          </motion.p>
        </motion.div>

        {/* Floating product mock — a live "/fleet" panel */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.6, ease }}
          className="mx-auto mt-16 max-w-3xl"
        >
          <FleetPanel />
        </motion.div>
      </div>
    </section>
  );
}

function FleetPanel() {
  const nodes = [
    { id: 'vps-eu-1', cpu: 31, ram: 48, bots: [['Sentinel', 'online'], ['Concierge', 'online'], ['Vault', 'online']] },
    { id: 'vps-us-1', cpu: 19, ram: 37, bots: [['Resonance', 'online'], ['Custom · Aether', 'online']] },
  ] as const;

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-1.5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
      <div className="rounded-xl bg-ink-900/80">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-ink-600" />
          <span className="h-3 w-3 rounded-full bg-ink-600" />
          <span className="h-3 w-3 rounded-full bg-ink-600" />
          <span className="ml-3 font-mono text-xs text-mist-faint">hynex-bot · /fleet</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 2/2 online · 99.9%
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {nodes.map((n) => (
            <div key={n.id} className="rounded-lg border border-ink-700 bg-ink-800/40 p-4 text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-sm text-mist">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> {n.id}
                </span>
                <span className="font-mono text-[11px] text-mist-faint">up 14d</span>
              </div>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ['CPU', n.cpu],
                    ['RAM', n.ram],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-8 font-mono text-[11px] text-mist-faint">{label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-accent-glow to-accent"
                        style={{ width: `${val}%` }}
                      />
                    </span>
                    <span className="w-8 text-right font-mono text-[11px] text-mist-muted">{val}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {n.bots.map(([name]) => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-md bg-ink-700/60 px-2 py-1 font-mono text-[11px] text-mist-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
