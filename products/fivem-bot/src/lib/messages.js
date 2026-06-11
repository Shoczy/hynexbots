'use strict';

const { renderBlocks } = require('./renderBlocks');

/** Member/guild variable map for substitution in welcome/leave messages. */
function memberVars(member) {
  const g = member.guild;
  return {
    user: `<@${member.id}>`,
    username: member.user?.username || 'member',
    memberName: member.displayName || member.user?.username || 'member',
    server: g?.name || 'the server',
    memberCount: String(g?.memberCount ?? ''),
  };
}

/**
 * Build a sendable Components V2 payload from a welcome/leave message block (the
 * body is designed in the dashboard block builder), with variables resolved.
 * Returns null when the block is disabled or has no content.
 */
function buildMessagePayload(block, member) {
  if (!block || !block.enabled) return null;
  if (block.v2 && Array.isArray(block.v2.blocks) && block.v2.blocks.length) {
    return renderBlocks({ ...block.v2, enabled: true }, memberVars(member));
  }
  return null;
}

module.exports = { buildMessagePayload, memberVars };
