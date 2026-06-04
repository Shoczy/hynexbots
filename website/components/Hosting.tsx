'use client';

import { SectionHeading } from './SectionHeading';
import { Stagger, staggerItem, Reveal } from './ui/Reveal';
import { Icons } from './Icons';
import { motion } from 'framer-motion';
import { hostingPlans, hostingMatrix, brand, type HostingPlan } from '@/lib/data';

export function Hosting() {
  return (
    <section id="hosting" className="relative py-24 md:py-32">
      <div className="container-content">
        <SectionHeading
          eyebrow="Hosting"
          title={
            <>
              Run it yourself, or <span className="text-gradient-accent">let us host it.</span>
            </>
          }
          description="Every bot comes ready to self-host. Want it hands-off? Add managed hosting on our monitored VPS fleet — billed monthly, cancel anytime."
        />

        {/* Plan cards */}
        <Stagger className="mt-14 grid gap-5 md:grid-cols-3">
          {hostingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </Stagger>

        {/* Comparison table */}
        <Reveal className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/40">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-700">
                  <th className="px-5 py-4 text-left font-medium text-mist-muted md:px-7">
                    What&apos;s included
                  </th>
                  {hostingPlans.map((p) => (
                    <th
                      key={p.id}
                      className={`px-3 py-4 text-center font-display text-base font-semibold md:px-5 ${
                        p.featured ? 'text-accent-glow' : 'text-mist'
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hostingMatrix.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-ink-800 last:border-0 transition-colors hover:bg-ink-800/30"
                  >
                    <td className="px-5 py-3.5 text-mist-muted md:px-7">{row.label}</td>
                    {hostingPlans.map((p) => (
                      <td key={p.id} className="px-3 py-3.5 text-center md:px-5">
                        {row.plans.includes(p.id) ? (
                          <Icons.check
                            className={`mx-auto h-4 w-4 ${
                              p.featured ? 'text-accent-glow' : 'text-accent-soft'
                            }`}
                          />
                        ) : (
                          <span className="text-mist-faint">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <p className="mt-8 text-center text-sm text-mist-muted">
          Prices are per bot. Hosting is arranged inside your ticket — no card needed up front.
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: HostingPlan }) {
  return (
    <motion.div variants={staggerItem}>
      <div
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 ${
          plan.featured
            ? 'border-accent/40 bg-accent/[0.06] glow-accent'
            : 'border-ink-700 bg-ink-900/50 hover:border-ink-600'
        }`}
      >
        {plan.featured && (
          <span className="absolute right-5 top-5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-glow">
            Most popular
          </span>
        )}

        <h3 className="font-display text-lg font-semibold text-mist">{plan.name}</h3>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold tracking-tightest text-mist">
            {plan.price}
          </span>
          <span className="text-sm text-mist-faint">{plan.period}</span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-mist-muted">{plan.blurb}</p>

        <a
          href={brand.discordInvite}
          target="_blank"
          rel="noreferrer"
          className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            plan.featured
              ? 'bg-mist text-ink-950 hover:-translate-y-0.5 hover:shadow-[0_0_40px_-6px_rgba(165,163,255,0.55)]'
              : 'border border-ink-600 text-mist hover:border-accent/50 hover:bg-accent/10 hover:text-accent-glow'
          }`}
        >
          {plan.cta} <Icons.arrow className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
}
