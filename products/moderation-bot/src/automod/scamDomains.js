'use strict';

/**
 * Distinctive tokens found in common Discord/Steam phishing & scam domains
 * (fake-nitro, account-steal, gift scams). Matched as a substring of a URL's
 * host, so they're deliberately specific enough not to flag legitimate sites
 * (e.g. the real discord.com / steamcommunity.com). Customers can add their own
 * domains in the dashboard. This list is a starting point — scam domains rotate
 * constantly, so the custom list matters too.
 */
const SCAM_DOMAINS = [
  // Discord lookalikes / fake nitro
  'dlscord',
  'discordd',
  'discrod',
  'discorde.',
  'discord-gift',
  'discordgift',
  'discordnitro',
  'nitro-discord',
  'discord-nitro',
  'free-nitro',
  'freenitro',
  'discordairdrop',
  'discord-airdrop',
  'discordgifts',
  'gift-discord',
  'discordapp-gift',
  'dlscordnitro',
  'discrods',
  // Steam phishing lookalikes
  'steamcommunlty',
  'steancommunity',
  'steamcomunity',
  'steam-community',
  'steampowered-',
  'steamcommunity.ru',
];

module.exports = { SCAM_DOMAINS };
