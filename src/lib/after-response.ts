/**
 * after-response.ts: the one way this app runs background work in a request.
 *
 * Why it exists: these routes are Node serverless functions on Vercel. A bare
 * unawaited promise has NO guarantee of completing once the response returns —
 * the invocation can be frozen or reclaimed — so the old "fire-and-forget"
 * idiom silently dropped work. `after()` schedules the callback once the
 * response is flushed AND keeps the invocation alive for it, which is what
 * "does not block the response" was always supposed to mean.
 *
 * Never throws, on either axis, because background work must never break a
 * response that has already been produced:
 *   - `after()` itself throws SYNCHRONOUSLY when the platform supplies no
 *     waitUntil, so the scheduling call is guarded too.
 *   - the work's own rejection is caught and logged; by the time it runs there
 *     is no client left to surface an error to.
 *
 * Request scope only. Calling this from an Inngest function or any other
 * non-request context logs a scheduling failure and drops the work — await the
 * promise directly there instead (see src/inngest/functions.ts).
 *
 * Bounded by the route's max duration, like any other work in the invocation.
 */
import { after } from "next/server";

/**
 * @param label Log prefix identifying the caller, e.g. "[capture-email] CRM sync".
 * @param work  The background task. Its result is discarded.
 *
 * @example
 *   afterResponse("[contact] CRM sync", () => notifyCrm({ name, email, source }));
 */
export function afterResponse(label: string, work: () => Promise<unknown>): void {
  try {
    after(async () => {
      try {
        await work();
      } catch (err) {
        console.error(`${label} failed:`, err);
      }
    });
  } catch (err) {
    console.error(`${label} could not be scheduled:`, err);
  }
}
