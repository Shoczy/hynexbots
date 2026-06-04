'use strict';

/**
 * Audio sourcing via play-dl (YouTube search + stream). Isolated here so the
 * source can be swapped without touching the player. Note: YouTube extraction
 * is inherently maintenance-prone — if playback stops working after a YouTube
 * change, bumping `play-dl` is usually the fix.
 */
const play = require('play-dl');

function fmtDuration(sec) {
  if (!sec) return 'live';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function toTrack(v, requestedBy) {
  return {
    title: v.title || 'Unknown',
    url: v.url,
    durationSec: v.durationInSec || 0,
    duration: fmtDuration(v.durationInSec || 0),
    thumbnail: v.thumbnails?.[0]?.url || null,
    requestedBy: requestedBy || null,
  };
}

/** Resolve a query (URL or search text) into a single track, or null. */
async function resolve(query, requestedBy) {
  const q = String(query || '').trim();
  if (!q) return null;
  if (play.yt_validate(q) === 'video') {
    const info = await play.video_basic_info(q);
    return toTrack(info.video_details, requestedBy);
  }
  const results = await play.search(q, { limit: 1, source: { youtube: 'video' } });
  if (!results.length) return null;
  return toTrack(results[0], requestedBy);
}

/** Open a playable stream for a track URL → { stream, type }. */
async function open(url) {
  return play.stream(url, { quality: 2 });
}

module.exports = { resolve, open, fmtDuration };
