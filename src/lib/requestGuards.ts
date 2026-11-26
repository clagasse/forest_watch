import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}

export function createMemoryRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
}) {
  const { maxRequests, windowMs } = options;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string): {
    allowed: boolean;
    retryAfterSec: number;
  } {
    const now = Date.now();
    if (buckets.size > 500) {
      for (const [k, v] of buckets.entries()) {
        if (v.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size > 2000) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
    }

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        retryAfterSec: Math.ceil(windowMs / 1000),
      };
    }

    if (existing.count >= maxRequests) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  };
}
