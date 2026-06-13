'use strict';

// Rank cards are rendered with @napi-rs/canvas, an OPTIONAL dependency. If it
// isn't installed (or fails to load), renderRankCard returns null and the
// command falls back to the embed card — so /rank always works.
let _canvas = null;
let _failed = false;
function canvas() {
  if (_canvas || _failed) return _canvas;
  try {
    _canvas = require('@napi-rs/canvas');
  } catch {
    _failed = true;
  }
  return _canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const fmt = (n) => Intl.NumberFormat('en', { notation: n >= 100000 ? 'compact' : 'standard' }).format(n);

/**
 * Render a rank card PNG buffer, or null when canvas isn't available.
 * @param {{username,avatarURL,level,rank,into,need,totalXp,accent}} d
 */
async function renderRankCard(d) {
  const c = canvas();
  if (!c) return null;
  try {
    const W = 900;
    const H = 260;
    const accent = /^#[0-9a-fA-F]{6}$/.test(d.accent || '') ? d.accent : '#6366f1';
    const cv = c.createCanvas(W, H);
    const ctx = cv.getContext('2d');

    // Background panel.
    ctx.fillStyle = '#0e1016';
    roundRect(ctx, 0, 0, W, H, 28);
    ctx.fill();
    ctx.fillStyle = '#161922';
    roundRect(ctx, 16, 16, W - 32, H - 32, 20);
    ctx.fill();

    // Avatar (circular) with an accent ring.
    const cx = 130;
    const cy = H / 2;
    const r = 84;
    try {
      const img = await c.loadImage(d.avatarURL);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } catch {
      ctx.fillStyle = '#2a2f3a';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();

    const left = 250;

    // Username.
    ctx.fillStyle = '#f4f6fb';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(String(d.username || 'Member').slice(0, 18), left, 96);

    // Level + rank.
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(`LEVEL ${d.level}`, left, 142);
    ctx.fillStyle = '#9aa4b8';
    ctx.fillText(`RANK #${d.rank}`, left + 200, 142);

    // Progress bar.
    const barX = left;
    const barY = 178;
    const barW = W - left - 56;
    const barH = 30;
    const pct = d.need ? Math.max(0, Math.min(1, d.into / d.need)) : 0;
    ctx.fillStyle = '#222734';
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = accent;
      roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, barH / 2);
      ctx.fill();
    }

    // XP text.
    ctx.fillStyle = '#9aa4b8';
    ctx.font = '22px sans-serif';
    ctx.fillText(`${fmt(d.into)} / ${fmt(d.need)} XP`, barX, barY + barH + 32);
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(d.totalXp)} total XP`, barX + barW, barY + barH + 32);
    ctx.textAlign = 'left';

    return cv.toBuffer('image/png');
  } catch {
    return null;
  }
}

module.exports = { renderRankCard };
