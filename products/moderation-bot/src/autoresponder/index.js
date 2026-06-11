'use strict';

const { cfg } = require('../lib/state');
const { renderBlocks } = require('../lib/renderBlocks');
const { memberVars } = require('../lib/messages');

/** Does `content` match `trigger` under the given mode? */
function triggerHit(content, trigger, mode) {
  const c = String(content || '').toLowerCase();
  const t = String(trigger || '').toLowerCase();
  if (!t) return false;
  switch (mode) {
    case 'exact':
      return c === t;
    case 'startsWith':
      return c.startsWith(t);
    case 'endsWith':
      return c.endsWith(t);
    default:
      return c.includes(t); // 'contains'
  }
}

/**
 * Reply when a message matches a configured auto-responder. The reply body is
 * designed in the dashboard block builder. Returns true if it responded.
 */
async function handleAutoresponders(message) {
  const list = cfg('messages.autoresponses', []);
  if (!Array.isArray(list) || !list.length) return false;
  for (const ar of list) {
    if (!ar || ar.enabled === false) continue;
    if (!triggerHit(message.content, ar.trigger, ar.match)) continue;
    const payload = renderBlocks({ ...(ar.v2 || {}), enabled: true }, memberVars(message.member));
    if (!payload) continue; // nothing to send for this rule — keep scanning
    await message.channel.send(payload).catch(() => {});
    return true;
  }
  return false;
}

module.exports = { handleAutoresponders, triggerHit };
