'use strict';

/** Parse a duration like "10m", "1h30", "2d", "45s" into ms. Returns 0 if blank/invalid. */
function parseDuration(input) {
  if (!input) return 0;
  const str = String(input).trim().toLowerCase();
  if (/^\d+$/.test(str)) return Number(str) * 60_000; // bare number = minutes
  let ms = 0;
  const re = /(\d+)\s*(d|h|m|s)/g;
  let m;
  while ((m = re.exec(str))) {
    const n = Number(m[1]);
    ms += n * { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 }[m[2]];
  }
  return ms;
}

module.exports = { parseDuration };
