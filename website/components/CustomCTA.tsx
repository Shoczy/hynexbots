'use client';

import { Reveal } from './ui/Reveal';
import { Icons } from './Icons';
import { brand } from '@/lib/data';

export function CustomCTA() {
  return (
    <section id="custom" className="relative py-24 md:py-32">
      <div className="container-content">
        <Reveal>
          <div className="glow-accent relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/70 px-8 py-16 text-center md:px-16 md:py-20">
            <div className="absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-0 h-72 w-[60%] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]" />
              <div
                className="absolute inset-0 opacity-[0.4]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                  maskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, #000, transparent 75%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, #000, transparent 75%)',
                }}
              />
            </div>

            <span className="eyebrow">Custom commissions</span>
            <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-semibold tracking-tightest text-mist md:text-5xl">
              Have something specific in mind?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-mist-muted">
              Tell us what you need — features, integrations, a wild idea — and we’ll turn it into a
              polished bot built exactly for your community. Open a ticket for a free quote.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={brand.discordInvite} target="_blank" rel="noreferrer" className="btn-primary">
                <Icons.discord className="h-4 w-4" />
                Start a commission
              </a>
              <a href={`mailto:${brand.email}`} className="btn-ghost">
                Email us
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
