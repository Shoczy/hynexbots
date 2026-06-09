require('dotenv').config();

/**
 * Central config + brand constants for Hynex Bots.
 * Anything customer-facing (colors, copy, catalog) lives here so it's
 * easy to rebrand without touching logic.
 */
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  // Public URL of the customer dashboard, used in onboarding DMs.
  dashboardUrl: (process.env.DASHBOARD_URL || 'http://localhost:3000').replace(/\/$/, ''),

  tickets: {
    categoryId: process.env.TICKET_CATEGORY_ID || null,
    staffRoleId: process.env.STAFF_ROLE_ID || null,
    transcriptChannelId: process.env.TRANSCRIPT_CHANNEL_ID || null,
  },

  fleet: {
    port: parseInt(process.env.FLEET_PORT || '8787', 10),
    secret: process.env.FLEET_SECRET || 'change-me',
    offlineAfterMin: parseInt(process.env.FLEET_OFFLINE_AFTER_MIN || '2', 10),
    // Channel where node/bot up·down alerts are posted (optional). Right-click a
    // staff channel → Copy ID. Unset = no channel alerts (owners are still DMed).
    alertChannelId: process.env.FLEET_ALERT_CHANNEL_ID || null,
  },

  api: {
    // Secret the Next.js dashboard uses for server-to-server calls.
    dashboardKey: process.env.DASHBOARD_API_KEY || 'change-me-dashboard-key',
    // Secret a customer's running bot uses to fetch its config. Defaults to the fleet secret.
    botKey: process.env.CONFIG_BOT_KEY || process.env.FLEET_SECRET || 'change-me',
  },

  brand: {
    name: 'Hynex Bots',
    tagline: 'Premium Discord bots, shipped fast.',
    // Sleek minimal dark accent (indigo/violet)
    color: 0x6366f1,
    success: 0x34d399,
    danger: 0xf87171,
    warning: 0xfbbf24,
    footer: 'Hynex Bots • Premium Discord Solutions',
  },

  /**
   * The ready-made catalog shown in the buy panel.
   * Prices are display-only; payment is handled manually inside the ticket.
   */
  catalog: [
    {
      id: 'moderation',
      label: 'Moderation',
      emoji: '<:shield1:1514034751273566329>',
      price: '$49',
      description: 'Auto-mod, verification, welcome & anti-raid',
    },
    {
      id: 'tickets',
      label: 'Tickets',
      emoji: '<:ticket1:1514034787428597872>',
      price: '$39',
      description: 'Tickets, applications, FAQ & welcome',
    },
    {
      id: 'economy',
      label: 'Economy',
      emoji: '<:coin1:1514034824099139697>',
      price: '$59',
      description: 'Economy, leveling, giveaways & welcome',
    },
    {
      id: 'music',
      label: 'Music',
      emoji: '<:music1:1514034861969641512>',
      price: '$45',
      description: 'HQ audio, playlists, voice leveling & 24/7',
    },
  ],

  /** Payment methods offered in the purchase modal dropdown. */
  payments: [
    { value: 'paysafecard', label: 'Paysafecard', emoji: '<:credit:1514036033719762975>' },
    { value: 'paypal', label: 'PayPal', emoji: '<:paypal:1514035998437412874>' },
    { value: 'crypto', label: 'Crypto (BTC / ETH / USDT)', emoji: '<:btc1:1514034898069880855>' },
  ],

  /**
   * Emojis for the order-status pipeline (shown on purchase tickets + /orders).
   * Drop in your own custom emojis here, e.g. '<:paid:1514...>'. Unicode also fine.
   */
  orderEmojis: {
    pending: '<:clocky:1514039695426846912>',
    paid: '<:coin1:1514034824099139697>',
    delivered: '<:check:1514039861802172598>',
    cancelled: '<:close:1514039827513999401>',
  },

  /** The /payment info panel: header image, payable methods, and the order link. */
  paymentPanel: {
    // The "Order Now" button links here (channel where customers open a ticket).
    ticketChannelId: '1483823084946329820',
    // Each method: a heading + a copyable address. `emoji` and `note` are optional.
    methods: [
      { label: 'PayPal', emoji: '<:paypal:1514035998437412874>', address: 'muratwasabi@gmail.com', note: 'Friends & Family only — no notes.' },
      { label: 'Litecoin (LTC)', emoji: '', address: 'ltc1qkpjmfmtw3ujq0nn8c5hmz3u2fnehjfv2ntlrse' },
      { label: 'Bitcoin (BTC)', emoji: '<:btc1:1514034898069880855>', address: 'bc1qw8xjgzxpx27sjg4qspqnhds0jfyy8dnpjxn7yv' },
    ],
  },
};

module.exports = config;
