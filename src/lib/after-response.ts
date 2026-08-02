/**
 * after-response.ts: the one way this app runs background work in a request.
 *
 * Why it exists: these routes are Node serverless functions on Vercel. A bare
 * unawaited promise has NO guarantee of completing once the response returns.
 * The invocation can be frozen or reclaimed, so the old "fire-and-forget" idiom
 * silently dropped work. `after()` schedules the callback once the response is
 * flushed AND keeps the invocation alive for it, which is what "does not block
 * the response" was always supposed to mean.
 *
 * Never throws, on either axis, because background work must never break a
 * response that has already been produced:
 *   1. `after()` itself throws SYNCHRONOUSLY when the platform supplies no
 *      waitUntil, so the scheduling call is guarded too. The work is then still
 *      started, unawaited, so this degrades to the old behaviour instead of
 *      dropping the work entirely. That fallback matters: for CRM and Beehiiv
 *      syncs the bare call at least used to reach the network.
 *   2. The work's own rejection is caught and logged. By the time it runs there
 *      is no client left to surface an error to.
 *
 * Request scope only. Outside one (inside an Inngest function, say) `after()`
 * throws and the fallback applies, so await the promise directly there instead.
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
  // Never rejects, so it is safe both as an after() callback and as a bare
  // unawaited call in the fallback below.
  const run = async () => {
    try {
      await work();
    } catch (err) {
      console.error(`${label} failed:`, err);
    }
  };

  try {
    after(run);
  } catch (scheduleErr) {
    console.error(`${label} could not be scheduled, running it unawaited:`, scheduleErr);
    void run();
  }
}
