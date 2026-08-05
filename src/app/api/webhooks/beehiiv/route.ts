import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyQuerySecret } from "@/app/lib/webhook-auth";
import { normalizeEmail } from "@/lib/email-suppression";

/**
 * beehiiv opt-out webhook: teaches OUR system about opt-outs recorded in THEIRS.
 *
 * THE BUG THIS CLOSES
 * -------------------
 * beehiiv keeps its own unsubscribe state and nothing carried it back. Every
 * consent decision in this app reads SuppressionList (see isEmailSuppressed and
 * the shouldSuppress helpers in src/inngest/functions.ts), so somebody who left
 * the newsletter in beehiiv stayed fully mailable by nurture sequences and by
 * cold outreach. Two stores, one person, no agreement.
 *
 * Writing the canonical row is enough on its own. Every nurture sequence gates
 * on isEmailSuppressedFailClosed, and senderProcess queries SuppressionList by
 * email or domain with no filter on `reason`, so both see this the moment it
 * lands. The six per-list `unsubscribed` flags are deliberately NOT touched:
 * they record where a person opted out, and a beehiiv opt-out did not happen on
 * any of them.
 *
 * WHY THE SECRET IS IN THE QUERY STRING
 * -------------------------------------
 * beehiiv's create-webhook API accepts a url, a list of event_types and a
 * description, and nothing else. There is no custom-header field, so the Bearer
 * token every other webhook here uses is not available. This is the same
 * constraint TidyCal has, and it gets the same answer that route already uses:
 * verifyQuerySecret. beehiiv also publishes no payload signature, so the secret
 * in the URL is the only primary control there is.
 *
 * WHY THE PAYLOAD IS NOT TRUSTED ON ITS OWN
 * -----------------------------------------
 * A suppression written here is IRREVERSIBLE by design. unsuppressEmail only
 * clears rows whose reason is exactly "unsubscribed", so the reason below can
 * never be undone by the admin resubscribe tool. That is the intended default
 * for a stated opt-out, and it is also why a forged POST would be expensive: it
 * would silence an address on every channel with no self-service way back. An
 * unsigned webhook plus a URL secret is not enough to carry that, so the claim
 * is checked against beehiiv's own API before anything is written.
 *
 * The check is deliberately one-sided. It can prove a webhook WRONG (beehiiv
 * still reports the address active) but it cannot prove one right, because a
 * deleted subscription and an address that never existed look identical from
 * outside. So the rule is: suppress unless beehiiv positively contradicts the
 * claim. That fails toward not sending mail, which is the direction this
 * codebase already fails in everywhere else.
 */

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

/**
 * The reason written for a beehiiv-side opt-out. Deliberately NOT the
 * SELF_SERVICE_OPT_OUT_REASON value ("unsubscribed") that unsuppressEmail will
 * clear: an opt-out we learned about second-hand cannot be reversed from our
 * side, because nothing in this system can verify the person asked to come back.
 */
export const BEEHIIV_OPT_OUT_REASON = "beehiiv-unsubscribe";

/**
 * The events that mean "this person no longer wants the newsletter".
 *
 * Both are subscribed to because beehiiv's own documentation does not settle
 * which one fires on an ordinary unsubscribe. Its help pages say unsubscribing
 * marks a subscriber `inactive` while deleting is a separate action, yet the
 * subscription.deleted reference does not state its trigger. Listening to both
 * makes the distinction stop mattering, and the upsert below is idempotent, so
 * receiving both for one person is harmless.
 *
 * subscription.paused is NOT here. A pause is a temporary state the subscriber
 * can lift themselves, and turning it into a permanent, irreversible suppression
 * would read a "not right now" as a "never".
 */
const OPT_OUT_EVENTS = new Set([
  "subscription.deleted",
  "newsletter_list_subscription.unsubscribed",
]);

type ConfirmResult = "opted-out" | "still-active" | "cannot-verify";

/**
 * Asks beehiiv whether this address really is off the list.
 *
 * "still-active" is the only answer that refuses the webhook. Absence is
 * reported as opted-out because a deleted subscription is genuinely gone, and
 * every other status beehiiv publishes (inactive, paused, pending, invalid,
 * validating, needs_attention) means the address is not currently receiving the
 * newsletter.
 */
async function confirmOptOutWithBeehiiv(
  email: string,
  apiKey: string,
  publicationId: string
): Promise<ConfirmResult> {
  try {
    const url =
      `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions` +
      `?email=${encodeURIComponent(email)}&limit=1`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // A hanging vendor must not hold the request open. A timeout lands in the
      // catch below and becomes a retryable 503, never a silent write.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(
        `[beehiiv-webhook] verification lookup failed: ${res.status} ${await res.text()}`
      );
      return "cannot-verify";
    }

    const payload = (await res.json()) as { data?: Array<{ status?: string }> };
    const match = payload.data?.[0];

    if (match?.status === "active") return "still-active";
    return "opted-out";
  } catch (err) {
    console.error("[beehiiv-webhook] verification lookup threw:", err);
    return "cannot-verify";
  }
}

export async function POST(req: Request) {
  const authError = verifyQuerySecret(req, process.env.BEEHIIV_WEBHOOK_SECRET);
  if (authError) return authError;

  try {
    const body = (await req.json()) as {
      event_type?: string;
      data?: { email?: string };
    };

    const eventType = body.event_type ?? "";

    // beehiiv sends every subscribed event type to the same URL. Anything that
    // is not an opt-out is acknowledged and dropped, so beehiiv does not retry
    // events this route has no opinion about.
    if (!OPT_OUT_EVENTS.has(eventType)) {
      return NextResponse.json({ success: true, action: `ignored:${eventType || "unknown"}` });
    }

    const email = normalizeEmail(body.data?.email ?? "");
    if (!email) {
      console.error("[beehiiv-webhook] opt-out event carried no address:", eventType);
      return NextResponse.json(
        { success: false, reason: "Missing data.email in beehiiv payload" },
        { status: 400 }
      );
    }

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (apiKey && publicationId) {
      const confirmation = await confirmOptOutWithBeehiiv(email, apiKey, publicationId);

      if (confirmation === "still-active") {
        // beehiiv contradicts the payload, so the payload is stale or forged.
        // Acknowledged rather than errored: a retry would reach the same answer.
        console.warn(
          `[beehiiv-webhook] refusing ${eventType}: beehiiv still reports this address active`
        );
        return NextResponse.json({ success: true, action: "ignored:still-active" });
      }

      if (confirmation === "cannot-verify") {
        // Retryable on purpose. Writing on an unverified claim would let a
        // leaked URL secret suppress arbitrary addresses irreversibly, and
        // swallowing the event would drop a real opt-out. A 5xx does neither.
        return NextResponse.json(
          { success: false, reason: "Could not verify with beehiiv; retry expected" },
          { status: 503 }
        );
      }
    } else {
      // Missing credentials are a PERMANENT condition, so a 503 here would retry
      // forever and eventually drop a real opt-out. Honouring it unverified is
      // the safer failure: the request already passed the shared secret, and not
      // recording a stated opt-out is the outcome with legal consequences.
      console.warn(
        "[beehiiv-webhook] BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID unset; suppressing unverified"
      );
    }

    // create-only. An existing row is left exactly as it is, because every other
    // reason outranks this one: overwriting "unsubscribed" would quietly convert
    // a reversible opt-out into a permanent one, and overwriting "bounce" or
    // "complaint" would downgrade a deliverability record into a preference.
    await prisma.suppressionList.upsert({
      where: { email },
      create: { email, reason: BEEHIIV_OPT_OUT_REASON },
      update: {},
    });

    console.log(`[beehiiv-webhook] suppressed ${email} (${eventType})`);
    return NextResponse.json({ success: true, action: "suppressed", event: eventType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[beehiiv-webhook] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
