'use strict';

const { cfg } = require('../lib/state');
const { info } = require('../lib/embeds');

function entries() {
  return cfg('faq.entries', []) || [];
}

/** First entry whose keywords match the given text, or null. */
function matchEntry(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return null;
  for (const e of entries()) {
    for (const k of e.keywords || []) {
      if (e.match === 'exact' ? t === k : t.includes(k)) return e;
    }
  }
  return null;
}

function answerEmbed(entry) {
  return info(`💡 ${entry.keywords[0] || 'FAQ'}`).setDescription(entry.answer);
}

/** Auto-answer a matching message when the FAQ module + auto-answer are on. */
async function handleMessage(message) {
  if (!cfg('modules.faq', false) || !cfg('faq.autoAnswer', true)) return;
  const content = message.content?.trim();
  if (!content || content.length > 300) return; // skip empty / very long messages
  const entry = matchEntry(content);
  if (!entry) return;
  await message.reply({ embeds: [answerEmbed(entry)] }).catch(() => {});
}

module.exports = { entries, matchEntry, answerEmbed, handleMessage };
