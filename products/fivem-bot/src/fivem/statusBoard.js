'use strict';

const { fivem, cfg } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const { statusEmbed } = require('../lib/render');

/**
 * Live "server status" board: a single embed in the configured channel, edited
 * in place on a timer so the player count stays current without spamming. The
 * message id is remembered in memory; on (re)start we adopt the last status
 * message the bot posted in that channel, otherwise we post a fresh one.
 */
let client = null;
let timer = null;
const lastMessage = new Map(); // channelId -> messageId

async function tick() {
  const s = fivem().status;
  if (!s.enabled || !s.channelId) return;
  const channel = await client.channels.fetch(s.channelId).catch(() => null);
  if (!channel || !channel.isTextBased?.()) return;

  const snapshot = await queryServer(fivem().server.host);
  const embed = statusEmbed(snapshot, fivem().server.name);

  let msgId = lastMessage.get(s.channelId);
  if (!msgId) {
    // Adopt the most recent status message we posted, to avoid duplicates on restart.
    const recent = await channel.messages.fetch({ limit: 25 }).catch(() => null);
    const mine = recent?.find((m) => m.author.id === client.user.id && m.embeds[0]?.title?.includes('erver'));
    if (mine) msgId = mine.id;
  }

  if (msgId) {
    const edited = await channel.messages.edit(msgId, { embeds: [embed] }).catch(() => null);
    if (edited) {
      lastMessage.set(s.channelId, edited.id);
      return;
    }
  }
  const sent = await channel.send({ embeds: [embed] }).catch(() => null);
  if (sent) lastMessage.set(s.channelId, sent.id);
}

/** (Re)start the refresh loop using the current configured interval. */
function reschedule() {
  if (timer) clearInterval(timer);
  const sec = Math.min(600, Math.max(30, cfg('fivem.status.refreshSec', 60)));
  timer = setInterval(() => tick().catch(() => {}), sec * 1000);
  if (timer.unref) timer.unref();
}

function start(c) {
  client = c;
  tick().catch(() => {});
  reschedule();
}

module.exports = { start, reschedule, tick };
