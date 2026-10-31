import type { Request, Response, NextFunction } from 'express';

interface UserUsage {
  minuteWindowStart: number;
  minuteCount: number;
  dayWindowStart: number;
  dayCount: number;
}

const usageMap = new Map<string, UserUsage>();

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    requestsPerMinute: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '30', 10),
    requestsPerDay: parseInt(process.env.API_RATE_LIMIT_PER_DAY || '100', 10),
  };
}

/**
 * Clean up old usage records every 10 minutes to prevent memory growth
 */
setInterval(() => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  for (const [userId, usage] of usageMap.entries()) {
    if (now - usage.dayWindowStart > dayMs && now - usage.minuteWindowStart > 60_000) {
      usageMap.delete(userId);
    }
  }
}, 10 * 60 * 1000).unref();

export function checkRateLimit(
  userId: string,
  customLimits?: Partial<RateLimitConfig>
): {
  allowed: boolean;
  limitMinute: number;
  remainingMinute: number;
  limitDay: number;
  remainingDay: number;
  retryAfterSeconds: number;
} {
  const config = getRateLimitConfig();
  const limitMinute = customLimits?.requestsPerMinute ?? config.requestsPerMinute;
  const limitDay = customLimits?.requestsPerDay ?? config.requestsPerDay;

  const now = Date.now();
  let usage = usageMap.get(userId);

  if (!usage) {
    usage = {
      minuteWindowStart: now,
      minuteCount: 0,
      dayWindowStart: now,
      dayCount: 0,
    };
    usageMap.set(userId, usage);
  }

  // Check 1-minute window
  if (now - usage.minuteWindowStart >= 60_000) {
    usage.minuteWindowStart = now;
    usage.minuteCount = 0;
  }

  // Check 1-day window
  if (now - usage.dayWindowStart >= 24 * 60 * 60 * 1000) {
    usage.dayWindowStart = now;
    usage.dayCount = 0;
  }

  // Check minute limit
  if (usage.minuteCount >= limitMinute) {
    const retryAfter = Math.ceil((60_000 - (now - usage.minuteWindowStart)) / 1000);
    return {
      allowed: false,
      limitMinute,
      remainingMinute: 0,
      limitDay,
      remainingDay: Math.max(0, limitDay - usage.dayCount),
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  // Check day limit
  if (usage.dayCount >= limitDay) {
    const retryAfter = Math.ceil((24 * 60 * 60 * 1000 - (now - usage.dayWindowStart)) / 1000);
    return {
      allowed: false,
      limitMinute,
      remainingMinute: Math.max(0, limitMinute - usage.minuteCount),
      limitDay,
      remainingDay: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  // Increment usage
  usage.minuteCount++;
  usage.dayCount++;

  return {
    allowed: true,
    limitMinute,
    remainingMinute: Math.max(0, limitMinute - usage.minuteCount),
    limitDay,
    remainingDay: Math.max(0, limitDay - usage.dayCount),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitsForUser(userId: string): void {
  usageMap.delete(userId);
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.userContext?.userId;
  if (!userId) {
    return next();
  }

  const result = checkRateLimit(userId);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit-Minute', result.limitMinute.toString());
  res.setHeader('X-RateLimit-Remaining-Minute', result.remainingMinute.toString());
  res.setHeader('X-RateLimit-Limit-Day', result.limitDay.toString());
  res.setHeader('X-RateLimit-Remaining-Day', result.remainingDay.toString());

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfterSeconds.toString());
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `API rate limit exceeded. You have reached the limit of ${result.limitMinute} requests/minute or ${result.limitDay} requests/day.`,
      retry_after_seconds: result.retryAfterSeconds,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  next();
}
