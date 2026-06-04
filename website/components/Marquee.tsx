'use client';

const items = [
  'Moderation',
  'Ticketing',
  'Economy',
  'Music',
  'Leveling',
  'Giveaways',
  'Custom commissions',
  'Reaction roles',
  'Auto-mod',
  'Logging',
  'Verification',
  'Dashboards',
];

export function Marquee() {
  return (
    <section className="relative border-y border-ink-700/60 py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-950 to-transparent" />
      <div className="flex overflow-hidden">
        <div className="flex shrink-0 animate-marquee items-center gap-10 pr-10">
          {[...items, ...items].map((it, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-lg text-mist-faint">
              {it}
              <span className="h-1 w-1 rounded-full bg-accent/50" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
