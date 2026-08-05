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
 *
 * IT REPORTS, BUT STILL DOES NOT THROW. Most callers are lead-magnet routes
 * where a newsletter sync failing must NOT fail the download the visitor is
 * waiting on, so they ignore the result and nothing changes for them. The
 * newsletter form is the exception: subscribing IS the whole request there, and
 * answering "success" over a beehiiv 500 loses a signup nobody ever finds out
 * about. That is the same silent-failure shape the Resend results had.
 */

import { isEmailSuppressedFailClosed } from "@/lib/email-suppression";

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

/**
 * "skipped" covers both no-credentials (local dev) and a suppressed address:
 * neither is an error, and neither should be reported to a visitor as one.
 */
export type BeehiivResult = "subscribed" | "skipped" | "failed";

export async function subscribeToBeehiiv(
  email: string,
  name?: string | null
): Promise<BeehiivResult> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    // Local dev without credentials: skip silently
    return "skipped";
  }

  // The suppression check lives HERE, not at the call sites, because forgetting
  // it at one of the six would silently undo somebody's opt-out.
  if (await isEmailSuppressedFailClosed(email)) {
    console.log("[beehiiv] address is suppressed; not subscribing");
    return "skipped";
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
          // FALSE, and that is a consent decision, not a tuning choice.
          //
          // The suppression check above only knows about OUR opt-out records.
          // beehiiv is a separate list with its own unsubscribe link in every
          // issue, and someone who leaves that way is invisible here. With
          // reactivate_existing set, any anonymous POST to
          // /api/newsletter-subscribe carrying their address put them straight
          // back on the list, and every lead-magnet download did the same. They
          // clicked unsubscribe and started receiving the newsletter again.
          //
          // Adding a genuinely new subscriber is unaffected. Someone who left
          // and wants back in re-joins through beehiiv, which is the only place
          // that opt-out was ever recorded.
          reactivate_existing: false,
          send_welcome_email: false,   // Waypoint's own nurture handles welcome comms
          utm_source: "waypoint-crm",  // track origin in beehiiv analytics
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[beehiiv] Subscribe failed for ${email}: ${res.status} ${body}`);
      // "failed" means A RETRY COULD WORK, because that is the only thing the
      // caller can act on: the newsletter route turns it into "please try
      // again". A 5xx or a network error qualifies. A 4xx does not, and the
      // distinction matters right now because reactivate_existing is false, so
      // an address that previously left the list is EXPECTED to be refused, and
      // showing that visitor an error would be both wrong and confusing. Every
      // 4xx is still logged above, which is the right channel for a bad key or
      // a malformed request: those need an operator, not a retrying visitor.
      return res.status >= 500 ? "failed" : "skipped";
    }

    console.log(`[beehiiv] Subscribed: ${email}`);
    return "subscribed";
  } catch (err) {
    console.error(`[beehiiv] Unexpected error for ${email}:`, err);
    return "failed";
  }
}
