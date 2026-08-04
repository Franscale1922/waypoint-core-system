/**
 * beehiiv.ts: Shared subscriber sync utility
 *
 * Adds a subscriber to the Waypoint beehiiv publication.
 * Never rejects: all errors are caught and logged, never re-thrown.
 * Silently skips if BEEHIIV_API_KEY is not set (local dev without the key).
 *
 * In a request handler, schedule it with afterResponse() from
 * @/lib/after-response rather than calling it bare. Never rejecting is not the
 * same as always completing: an unawaited call can be frozen when the response
 * returns. Inside an Inngest step, await it directly.
 */

import { isEmailSuppressedFailClosed } from "@/lib/email-suppression";

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

export async function subscribeToBeehiiv(
  email: string,
  name?: string | null
): Promise<void> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    // Local dev without credentials: skip silently
    return;
  }

  // The suppression check lives HERE, not at the call sites, because forgetting
  // it at one of the six would silently undo somebody's opt-out.
  //
  // `reactivate_existing: true` below is the reason it matters: without this
  // guard, a person who unsubscribed and later downloaded another guide was
  // resurrected on the newsletter by that download. They had been told they
  // would receive no more email, and then received the next issue.
  if (await isEmailSuppressedFailClosed(email)) {
    console.log("[beehiiv] address is suppressed; not subscribing");
    return;
  }

  const firstName = name ? name.split(" ")[0] : undefined;

  try {
    const res = await fetch(
      `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          ...(firstName ? { first_name: firstName } : {}),
          reactivate_existing: true,   // safe to call repeatedly: no duplicates
          send_welcome_email: false,   // Waypoint's own nurture handles welcome comms
          utm_source: "waypoint-crm",  // track origin in beehiiv analytics
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[beehiiv] Subscribe failed for ${email}: ${res.status} ${body}`);
      return;
    }

    console.log(`[beehiiv] Subscribed: ${email}`);
  } catch (err) {
    console.error(`[beehiiv] Unexpected error for ${email}:`, err);
  }
}
