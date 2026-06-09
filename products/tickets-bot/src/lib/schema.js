'use strict';

/**
 * Local fallback schema — mirrors the tickets-relevant slice of the main
 * service's defaultSettings() (bot/src/config-service/db.js). Used before the
 * first config fetch and as a backstop for missing fields.
 */
function messageBlock() {
  return {
    enabled: false,
    channelId: '',
    text: '',
    embed: { enabled: false, title: '', description: '', color: '#6366f1', image: '', footer: '' },
  };
}

function defaultSettings() {
  return {
    basics: { prefix: '!', embedColor: '#6366f1', nickname: '', language: 'en', logChannelId: '' },
    modules: { tickets: true, applications: false, faq: false, welcome: false },
    commands: {}, // { [name]: { enabled, roles[] } }
    messages: { welcome: messageBlock(), leave: messageBlock(), autoresponses: [], autoRoleIds: [] },
    applications: { reviewChannelId: '', approveRoleId: '', forms: [] },
    faq: { autoAnswer: true, entries: [] },
    tickets: {
      staffRoleIds: [],
      categoryId: '',
      transcripts: { enabled: false, channelId: '' },
      claiming: false,
      maxOpenPerUser: 1,
      openMessage: 'Thanks for reaching out — a staff member will be with you shortly.',
      panel: {
        title: 'Need help?',
        description: 'Click the button below to open a support ticket.',
        buttonLabel: 'Open a ticket',
      },
      categories: [], // [{ id, label, emoji }]
    },
  };
}

module.exports = { defaultSettings };
