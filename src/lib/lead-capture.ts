/**
 * lead-capture.ts: the guard every public lead-magnet endpoint runs before it
 * writes a row or sends a message.
 *
 * WHAT WENT WRONG WITHOUT IT
 * --------------------------
 * These endpoints are unauthenticated, take an arbitrary address in the body,
 * and email it. Repeating one valid POST created a fresh row, re-synced the CRM,
 * re-subscribed the address to Beehiiv, started another nurture sequence, and
 * delivered another real message, every single time, with nothing counting
 * anything. Pointed at someone else's address that is an inbox-bombing tool
 * wearing a lead form.
 *
 * THREE LAYERS, EACH COVERING THE OTHERS' BLIND SPOT
 * --------------------------------------------------
 *   Per-IP limit      bounds a spray across MANY addresses, which idempotency
 *                     cannot see (every address looks like a first-time lead).
 *   Per-address limit bounds one victim being hit across DIFFERENT magnets,
 *                     which per-magnet idempotency cannot see either.
 *   Idempotency       makes the ordinary repeat (a double-click, an impatient
 *                     resubmit, a retry after a network blip) a no-op.
 *
 * WHY DELIVERY, NOT ARRIVAL, IS THE IDEMPOTENCY KEY
 * -------------------------------------------------
 * Dedup keys on `nurtureStep >= 1`, which routes set only after the subscriber
 * email actually succeeded, not on the row existing. Those differ in exactly
 * the case that matters: when a send fails the visitor is told to try again, and
 * a key based on row creation would suppress that retry and guarantee they never
 * receive the thing they asked for twice over.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email-suppression";
import { clientIpFrom, consumeRateLimit, pruneRateLimitBuckets } from "@/lib/rate-limit";
import { afterResponse } from "@/lib/after-response";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Submissions per hour from one client address, across every magnet.
 * Sized so a household or small office behind one NAT address is never the
 * thing it catches, while a script is.
 */
const IP_LIMIT = 8;

/**
 * Deliveries per hour to one address, across every magnet. Someone genuinely
 * collecting two or three guides in a sitting stays under it; six in an hour is
 * not a person browsing.
 */
const EMAIL_LIMIT = 3;

/** A repeat request for the same magnet inside this window is a no-op. */
const IDEMPOTENCY_WINDOW_MS = 24 * HOUR_MS;

/** Deliberately permissive: rejecting real addresses costs leads. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CaptureGuardOptions {
  req: Request;
  /** Log prefix and rate-limit dimension, e.g. "capture-email". */
  route: string;
  /** The address exactly as it arrived in the request body. */
  email: unknown;
  /**
   * Identifies "we already delivered this to this address". `where` scopes the
   * lookup to one magnet where a model serves several, e.g. { checklistType }.
   *
   * OMIT IT when a repeat submission legitimately produces different content.
   * The quiz routes are the case: retaking the scorecard yields a new score, and
   * a new score is a new email, so deduplicating on "already delivered" would
   * swallow a result the visitor is actively waiting to see. Those routes are
   * bounded by the rate limits above instead, which is the layer that was
   * missing; they already refuse to start a second nurture sequence themselves.
   */
  idempotency?: { model: string; where?: Record<string, unknown> };
}

export type CaptureDecision =
  | { proceed: true; email: string }
  | { proceed: false; response: NextResponse };

/**
 * Runs the guard. On `proceed: true` the caller continues with the NORMALIZED
 * address, which is what must be written to the row so later exact-match lookups
 * and dedup queries agree with each other.
 */
export async function guardCapture(opts: CaptureGuardOptions): Promise<CaptureDecision> {
  const { req, route, idempotency } = opts;

  if (typeof opts.email !== "string" || !EMAIL_SHAPE.test(opts.email.trim())) {
    return {
      proceed: false,
      response: NextResponse.json({ error: "A valid email is required." }, { status: 400 }),
    };
  }
  const email = normalizeEmail(opts.email);

  // ── Abuse limits ─────────────────────────────────────────────────────────
  // FAIL CLOSED. The tempting alternative, letting requests through when the
  // limiter is unreachable, is wrong here specifically: the limiter shares a
  // database with the row write, so the same outage that blinds it also means no
  // record, no unsubscribe token and no nurture. Failing open in that window
  // does not preserve a lead, it only emails strangers messages we have no
  // record of and they cannot opt out of.
  const ip = clientIpFrom(req.headers);
  try {
    if (ip) {
      const perIp = await consumeRateLimit({ scope: "ip", key: ip, limit: IP_LIMIT, windowMs: HOUR_MS });
      schedulePrune(perIp.count);
      if (!perIp.allowed) return { proceed: false, response: tooMany(route, "ip", perIp.retryAfterSeconds) };
    }

    const perEmail = await consumeRateLimit({ scope: "email", key: email, limit: EMAIL_LIMIT, windowMs: HOUR_MS });
    schedulePrune(perEmail.count);
    if (!perEmail.allowed) return { proceed: false, response: tooMany(route, "email", perEmail.retryAfterSeconds) };
  } catch (err) {
    console.error(`[${route}] rate limiter unavailable; refusing the request:`, err);
    return {
      proceed: false,
      response: NextResponse.json(
        { error: "We couldn't process that just now. Please try again in a few minutes." },
        { status: 503, headers: { "Retry-After": "300" } }
      ),
    };
  }

  // ── Idempotency ──────────────────────────────────────────────────────────
  // A duplicate is reported as success, because from the visitor's side it IS
  // success: the email they are being told to look for is already in their
  // inbox. Returning an error would push them to submit again.
  if (!idempotency) return { proceed: true, email };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delivered = await (prisma as any)[idempotency.model].findFirst({
      where: {
        ...(idempotency.where ?? {}),
        email: { equals: email, mode: "insensitive" },
        nurtureStep: { gte: 1 },
        createdAt: { gt: new Date(Date.now() - IDEMPOTENCY_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (delivered) {
      console.log(`[${route}] duplicate submission inside the idempotency window; no side effects`);
      return {
        proceed: false,
        response: NextResponse.json({ success: true, deduplicated: true }),
      };
    }
  } catch (err) {
    // Unlike the limiter, this one fails OPEN. Its job is suppressing a repeat
    // delivery, so the worst case is one extra copy of an email the visitor
    // asked for, which beats denying a first-time lead their download.
    console.error(`[${route}] idempotency check failed; continuing:`, err);
  }

  return { proceed: true, email };
}

/**
 * Sweeps spent rate-limit rows, but only when this request opened a brand new
 * window for its key. That ties the sweep's frequency to distinct keys rather
 * than to traffic, so a flood does not also become a flood of DELETEs.
 */
function schedulePrune(count: number): void {
  if (count !== 1) return;
  afterResponse("[rate-limit] prune", () => pruneRateLimitBuckets());
}

function tooMany(route: string, scope: string, retryAfterSeconds: number): NextResponse {
  console.warn(`[${route}] rate limit hit on ${scope}`);
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/**
 * Reports whether a Resend call failed, and logs it.
 *
 * The Resend SDK resolves with `{ data, error }` instead of rejecting, so an
 * unchecked `await resend.emails.send(...)` treats a rejected recipient, an
 * exhausted quota or a 5xx as success. Every send in this app goes through here
 * so that a failure is impossible to not notice.
 */
export function resendFailed(label: string, result: { error?: unknown } | null | undefined): boolean {
  const error = result?.error;
  if (!error) return false;
  console.error(`${label} Resend error:`, JSON.stringify(error));
  return true;
}

/**
 * Marks the delivery email as sent, which is what arms idempotency for this
 * address. Call it ONLY after a send that actually succeeded. Marking early is
 * how a failed delivery becomes a permanently suppressed retry.
 */
export async function markDelivered(model: string, id: string, label: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any)[model].update({ where: { id }, data: { nurtureStep: 1 } });
  } catch (err) {
    // Non-fatal: the email is already delivered, and under-recording it only
    // risks one duplicate on a resubmit. Failing the response here would be
    // worse, telling the visitor nothing arrived when it did.
    console.error(`${label} could not mark delivery:`, err);
  }
}

/**
 * The 500 returned when the SUBSCRIBER's own email fails.
 *
 * Kelsey's internal notification failing stays best-effort: it is logged and
 * the visitor is not punished for it. The subscriber's copy is the entire point
 * of the request, and reporting success when it did not send is what left people
 * staring at "check your inbox" over an inbox that was never going to have it.
 */
export function deliveryFailed(): NextResponse {
  return NextResponse.json(
    { error: "We couldn't send that email. Please try again, or email kelsey@waypointfranchise.com." },
    { status: 500 }
  );
}
