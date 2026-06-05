'use strict';

/**
 * Tiny dependency-free fixed-window rate limiter for the config API. Keeps a
 * per-key counter in memory and resets it every `windowMs`. Good enough to blunt
 * abuse / runaway clients on a single-process host; swap for a Redis-backed
 * limiter if the API is ever scaled horizontally.
 */
function rateLimit({ windowMs = 60_000, max = 120, key } = {}) {
  const hits = new Map(); // key -> { count, resetAt }
  const keyFn = key || ((req) => req.ip || req.socket?.remoteAddress || 'unknown');

  // Periodically drop expired buckets so the map can't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs);
  if (sweep.unref) sweep.unref();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const k = keyFn(req);
    let bucket = hits.get(k);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(k, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ ok: false, error: 'rate_limited', retryAfter });
    }
    next();
  };
}

module.exports = { rateLimit };
