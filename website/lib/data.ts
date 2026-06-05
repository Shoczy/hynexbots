export const brand = {
  name: 'Hynex Bots',
  tagline: 'Premium Discord bots, shipped fast.',
  // Set this to your Discord invite so every CTA points to your ticket panel.
  discordInvite: 'https://discord.gg/your-invite',
  email: 'hello@hynexbots.com',
  // Public fleet-status endpoint exposed by the bot (bot/src/fleet/server.js).
  // Override per-environment with NEXT_PUBLIC_FLEET_STATUS_URL.
  fleetStatusUrl:
    process.env.NEXT_PUBLIC_FLEET_STATUS_URL || 'http://localhost:8787/public/status',
};

export type Bot = {
  id: string;
  name: string;
  category: string;
  price: string;
  blurb: string;
  features: string[];
  accent: string; // tailwind gradient stops
  popular?: boolean;
};

export const bots: Bot[] = [
  {
    id: 'moderation',
    name: 'Sentinel',
    category: 'Moderation',
    price: '$49',
    blurb: 'Keep your server clean on autopilot with intelligent auto-mod and raid defense.',
    features: ['Auto-mod & word filters', 'Warns, mutes, tempbans', 'Raid & spam protection', 'Full audit logging', 'Hosting included'],
    accent: 'from-indigo-500/30 to-blue-500/10',
    popular: true,
  },
  {
    id: 'tickets',
    name: 'Concierge',
    category: 'Support',
    price: '$39',
    blurb: 'A polished ticket system your staff will actually enjoy using.',
    features: ['Multi-panel tickets', 'Transcripts & logs', 'Claim & staff stats', 'Custom branding', 'Hosting included'],
    accent: 'from-violet-500/30 to-fuchsia-500/10',
  },
  {
    id: 'economy',
    name: 'Vault',
    category: 'Economy',
    price: '$59',
    blurb: 'Drive engagement with a deep economy, shop, and leaderboards.',
    features: ['Currency & shop', 'Gambling & games', 'Daily rewards', 'Global leaderboards', 'Hosting included'],
    accent: 'from-emerald-500/25 to-teal-500/10',
  },
  {
    id: 'music',
    name: 'Resonance',
    category: 'Music',
    price: '$45',
    blurb: 'Crystal-clear audio with queues, filters, and playlist support.',
    features: ['HD audio streaming', 'Queue & filters', 'Playlist support', '24/7 mode', 'Hosting included'],
    accent: 'from-sky-500/25 to-cyan-500/10',
  },
];

export const features = [
  {
    title: 'Built to your spec',
    body: 'Every bot is tailored to your server — your branding, your commands, your workflows. No bloat.',
    icon: 'spec',
  },
  {
    title: 'Shipped fast',
    body: 'Ready-made bots delivered same-day. Custom builds quoted with a clear timeline you can count on.',
    icon: 'rocket',
  },
  {
    title: 'Hosted & monitored',
    body: 'Every bot includes 24/7 hosting on our VPS fleet — live status monitoring and instant restarts, at no extra cost.',
    icon: 'pulse',
  },
  {
    title: 'Lifetime support',
    body: 'Discord changes, your bot keeps working. We handle updates, fixes, and tweaks long after delivery.',
    icon: 'shield',
  },
];

export const steps = [
  { n: '01', title: 'Open a ticket', body: 'Pick a ready-made bot or describe your custom build in our Discord.' },
  { n: '02', title: 'Get a quote', body: 'We confirm scope, price, and timeline — no surprises, no hidden fees.' },
  { n: '03', title: 'We build it', body: 'You watch progress in your ticket and request tweaks along the way.' },
  { n: '04', title: 'Ship & support', body: 'Your bot goes live. We host, monitor, and support it for as long as you need.' },
];

export const stats = [
  { value: 400, suffix: '+', label: 'Bots delivered' },
  { value: 4.9, suffix: '★', label: 'Avg. rating' },
  { value: 24, suffix: 'h', label: 'Avg. delivery' },
  { value: 180, suffix: '+', label: 'Happy servers' },
];

export const faqs = [
  {
    q: 'How do I actually buy a bot?',
    a: 'Everything runs through Discord tickets. Join our server, open a ticket from the storefront panel, and our team handles delivery, setup, and payment with you directly.',
  },
  {
    q: 'Can you build something fully custom?',
    a: 'Absolutely — custom commissions are our specialty. Open a ticket with your brief (features, budget, deadline) and we’ll reply with a tailored quote and timeline.',
  },
  {
    q: 'Do you host the bots for me?',
    a: 'Yes — hosting is included with every bot. We run it 24/7 across our VPS fleet with live monitoring, automatic restarts, and uptime reporting, all in the purchase price. No monthly fees.',
  },
  {
    q: 'What if something breaks later?',
    a: 'Every delivery includes ongoing support. If Discord changes something or you need a tweak, just reopen a ticket and we’ll sort it out.',
  },
  {
    q: 'How do payments work?',
    a: 'Payments are arranged manually inside your ticket, so you can use the method that works best for you. We confirm everything before any work begins.',
  },
];
