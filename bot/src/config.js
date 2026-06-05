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

  tickets: {
    categoryId: process.env.TICKET_CATEGORY_ID || null,
    staffRoleId: process.env.STAFF_ROLE_ID || null,
    transcriptChannelId: process.env.TRANSCRIPT_CHANNEL_ID || null,
  },

  fleet: {
    port: parseInt(process.env.FLEET_PORT || '8787', 10),
    secret: process.env.FLEET_SECRET || 'change-me',
    offlineAfterMin: parseInt(process.env.FLEET_OFFLINE_AFTER_MIN || '2', 10),
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
      emoji: '🛡️',
      price: '$49',
      description: 'Auto-mod, anti-raid & logging',
    },
    {
      id: 'tickets',
      label: 'Tickets',
      emoji: '🎟️',
      price: '$39',
      description: 'Tickets, transcripts & claims',
    },
    {
      id: 'economy',
      label: 'Economy',
      emoji: '🪙',
      price: '$59',
      description: 'Currency, shop & leaderboards',
    },
    {
      id: 'music',
      label: 'Music',
      emoji: '🎧',
      price: '$45',
      description: 'HQ audio, queue & filters',
    },
  ],

  /** Payment methods offered in the purchase modal dropdown. */
  payments: [
    { value: 'paysafecard', label: 'Paysafecard', emoji: '💳' },
    { value: 'paypal', label: 'PayPal', emoji: '🅿️' },
    { value: 'crypto', label: 'Crypto (BTC / ETH / USDT)', emoji: '🪙' },
  ],
};

module.exports = config;
