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

  // Join welcome message (posted by the main bot when a member joins the shop).
  welcome: {
    // Channel to post in. Unset → falls back to the guild's system channel.
    channelId: process.env.WELCOME_CHANNEL_ID || null,
    // Channel the "Open a Ticket" button links to. Unset → uses paymentPanel.ticketChannelId.
    ticketChannelId: process.env.WELCOME_TICKET_CHANNEL_ID || null,
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
  // `emoji` = the custom Discord emoji (rendered in the bot's Discord panels).
  // `webEmoji` = a plain Unicode fallback used by the web dashboard (which can't
  // render <:name:id> custom emojis — it would show the raw text).
  catalog: [
    {
      id: 'moderation', // internal type id kept as 'moderation' (DB/launcher/invite keys)
      label: 'Security',
      emoji: '<:shield1:1514034751273566329>',
      webEmoji: '🛡️',
      price: '€10',
      description: 'Anti-nuke, anti-raid, auto-mod & verification — pure server protection',
    },
    {
      id: 'community',
      label: 'Community',
      emoji: '<:shield1:1514034751273566329>',
      webEmoji: '🎉',
      price: '€10',
      description: 'Leveling with voice XP, reaction roles, welcome, autoresponders & announcements',
    },
    {
      id: 'allinone',
      label: 'All-in-One',
      emoji: '<:shield1:1514034751273566329>',
      webEmoji: '👑',
      price: '€16',
      description: 'Everything in one bot — security + community: moderation, anti-nuke, verification, leveling, reaction roles & starboard',
    },
    {
      id: 'fivem',
      label: 'FiveM',
      emoji: '<:shield1:1514034751273566329>',
      webEmoji: '🎮',
      price: '€8',
      description: 'Live server status, role whitelist, in-game reports & restart alerts',
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
    // Each method: a heading + optional copyable `address` + optional `note`.
    methods: [
      { label: 'Paysafecard', note: 'Send your 16-digit Paysafecard code in your ticket.' },
      { label: 'PayPal', address: 'leongoertz999@icloud.com', note: 'Friends & Family only.' },
      { label: 'Crypto (BTC / ETH / USDT)', address: '— added soon —', note: 'Wallet addresses coming soon.' },
    ],
  },
};

module.exports = config;
