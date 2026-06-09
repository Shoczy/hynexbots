'use strict';

/**
 * Turn an emoji string into the shape Discord wants for select-menu / button
 * components. Custom emojis must be sent as `{ id, name, animated }`, NOT as the
 * raw `<:name:id>` mention (which triggers 50035 "Invalid Form Body").
 *
 *   '<:card:123>'   → { id: '123', name: 'card', animated: false }
 *   '<a:spin:123>'  → { id: '123', name: 'spin', animated: true }
 *   '🛡️'           → { name: '🛡️' }   (unicode passes through by name)
 *   '' / undefined  → undefined        (option simply has no emoji)
 */
function parseEmoji(e) {
  if (!e || typeof e !== 'string') return undefined;
  const s = e.trim();
  if (!s) return undefined;
  const m = /^<(a)?:(\w{2,32}):(\d{17,20})>$/.exec(s);
  if (m) return { id: m[3], name: m[2], animated: Boolean(m[1]) };
  return { name: s };
}

module.exports = { parseEmoji };
