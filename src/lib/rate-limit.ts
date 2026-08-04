/**
 * rate-limit.ts: fixed-window rate limiting for the public lead-magnet endpoints.
 *
 * WHY IT EXISTS
 * -------------
 * /api/capture-email and its siblings are unauthenticated POST endpoints whose
 * whole job is to send an email to whatever address the body carries. Before
 * this, a script could POST a stranger's address in a loop and every iteration
 * delivered another real message to them. The endpoint was a spam cannon
 * pointed at third parties, and nothing in the request path counted anything.
 *
 * WHY POSTGRES AND NOT A MODULE-LEVEL Map
 * ---------------------------------------
 * These routes are serverless functions. A process-local counter only sees the
 * requests that happen to land on that warm instance, so a burst spread across
 * instances passes every check. On this platform an in-memory limiter is not a
 * weaker control; it is close to no control at all. Postgres is the only store
 * these routes already share.
 *
 * WHAT THIS IS NOT
 * ----------------
 * IP limiting is a speed bump, not a boundary: `x-forwarded-for` is a hop-by-hop
 * header, NAT puts whole offices behind one address, and a determined attacker
 * rotates addresses. The durable control against emailing one victim repeatedly
 * is the per-address idempotency in lead-capture.ts. This layer exists to bound
 * the *spray* case (many different victims from one source), which idempotency
 * by construction cannot see.
 */
import prisma from "@/lib/prisma";

export type RateLimitScope = "ip" | "email";

export interface RateLimitRule {
  scope: RateLimitScope;
  /** The client IP, or the normalized email address. */
  key: string;
  /** Maximum permitted hits within one window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Hits recorded in the current window, including this one. */
  count: number;
  limit: number;
  /** Seconds until the current window rolls over. Suitable for `Retry-After`. */
  retryAfterSeconds: number;
}

/**
 * How long a spent bucket is kept before pruneRateLimitBuckets sweeps it.
 * Only needs to outlive the longest window in use, with room to spare.
 */
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Start of the fixed window `now` falls in. Windows are aligned to the epoch. */
function bucketStart(windowMs: number, now: number): Date {
  return new Date(Math.floor(now / windowMs) * windowMs);
}

/**
 * Records one hit against `rule` and reports whether it is within the limit.
 *
 * THROWS on infrastructure failure. It deliberately does not decide fail-open
 * vs fail-closed, because that decision belongs to the caller and differs by
 * route. See lead-capture.ts for the reasoning behind the choice made there.
 */
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const { scope, key, limit, windowMs } = rule;
  const now = Date.now();
  const bucket = bucketStart(windowMs, now);
  const where = { scope_key_bucket: { scope, key, bucket } };

  let count: number;
  try {
    const row = await prisma.rateLimitBucket.upsert({
      where,
      create: { scope, key, bucket, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    count = row.count;
  } catch (err) {
    // Two requests can both find no row and both try to INSERT; one loses on the
    // unique constraint. That is the constraint doing its job, not an outage, so
    // the loser retries as a pure increment. Any other error is a real failure
    // and propagates.
    if (!isUniqueViolation(err)) throw err;
    const row = await prisma.rateLimitBucket.update({
      where,
      data: { count: { increment: 1 } },
      select: { count: true },
    });
    count = row.count;
  }

  return {
    allowed: count <= limit,
    count,
    limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.getTime() + windowMs - now) / 1000)),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Deletes buckets whose window closed long enough ago to be useless.
 *
 * Callers schedule this off the response path (afterResponse) and only when they
 * just opened a fresh bucket, which keeps the sweep proportional to distinct
 * keys rather than to traffic. Never throws: a failed prune is a housekeeping
 * miss, not a request failure.
 */
export async function pruneRateLimitBuckets(now = Date.now()): Promise<number> {
  try {
    const { count } = await prisma.rateLimitBucket.deleteMany({
      where: { bucket: { lt: new Date(now - RETENTION_MS) } },
    });
    return count;
  } catch (err) {
    console.error("[rate-limit] prune failed:", err);
    return 0;
  }
}

/**
 * Best-effort client address for a request.
 *
 * Returns null when no proxy header is present, which the caller must treat as
 * "cannot identify this client" rather than as a shared bucket. Collapsing
 * every anonymous request into one key would let a single attacker exhaust the
 * window for everyone.
 *
 * `x-forwarded-for` is a list appended to by each hop, so the client-supplied
 * portion is the LEFT. Vercel appends the real peer address last, which is why
 * the rightmost entry is the trustworthy one here; `x-real-ip`, which the
 * platform sets itself, is preferred when present.
 */
export function clientIpFrom(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
  return hops.length > 0 ? hops[hops.length - 1]! : null;
}
