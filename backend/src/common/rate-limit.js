const buckets = new Map();

export function rateLimit({ windowMs, max, key = (request) => request.ip }) {
  return (request, response, next) => {
    const now = Date.now();
    const id = key(request);
    const current = buckets.get(id);
    const bucket =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(id, bucket);
    response.setHeader('RateLimit-Limit', max);
    response.setHeader('RateLimit-Remaining', Math.max(0, max - bucket.count));
    if (bucket.count > max)
      return response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests; try again later',
          requestId: request.id,
        },
      });
    next();
  };
}
