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
 * BE PRECISE ABOUT WHAT THAT CHECK BUYS, because it is easy to overrate.
 * It can prove a webhook WRONG (beehiiv still reports the address active) but it
 * can never prove one right: a deleted subscription and an address that never
 * existed are indistinguishable from outside, both returning an empty list. So
 * a leaked secret CAN still suppress any address that is not currently an active
 * subscriber. What the check actually protects is the active subscriber list
 * itself, which is the highest-value thing an attacker with the URL would go
 * after, and it costs one request to protect it. It is a mitigation, not a
 * substitute for treating the URL as a credential.
 *
 * The rule is therefore: suppress unless beehiiv positively contradicts the
 * claim, and refuse to write at all when the claim could not be checked. Both
 * fail toward not sending mail, which is the direction this codebase already
 * fails in everywhere else.
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
 *
 * subscription.deleted IS here, and that is a deliberate over-reach worth naming.
 * A deletion is not necessarily a consent withdrawal: an operator tidying the
 * list or removing a duplicate fires the same event, and that will permanently
 * suppress the address on every Waypoint channel. It is included anyway because
 * the two errors are not symmetric. Missing a real opt-out means mailing someone
 * who told us to stop, which is the CAN-SPAM failure. Over-suppressing means not
 * mailing someone we could have, which costs a lead. If beehiiv is ever confirmed
 * to fire newsletter_list_subscription.unsubscribed on every genuine unsubscribe,
 * drop this one and the over-reach goes with it.
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

    // No credentials means the claim cannot be checked at all. An earlier draft
    // wrote anyway, reasoning that a missing key is permanent so retrying is
    // futile. That was a bypass: it made "unset the env var" a way to turn the
    // verification off, and it is the one branch an attacker holding the URL
    // would most like to reach. Production always has these set (they are what
    // subscribeToBeehiiv runs on), so reaching this line at all is a
    // misconfiguration that should be loud rather than silently permissive.
    if (!apiKey || !publicationId) {
      console.error(
        "[beehiiv-webhook] BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID unset; refusing to write unverified"
      );
      return NextResponse.json(
        { success: false, reason: "Verification unavailable; not writing unverified" },
        { status: 503 }
      );
    }

    const confirmation = await confirmOptOutWithBeehiiv(email, apiKey, publicationId);

    if (confirmation === "still-active") {
      // beehiiv contradicts the payload. Either the payload is forged, or the
      // person genuinely resubscribed after opting out. Both mean "do not
      // suppress": the second is a newer consent decision than this event.
      // Acknowledged rather than errored, since a retry reaches the same answer.
      console.warn(
        `[beehiiv-webhook] refusing ${eventType}: beehiiv still reports this address active`
      );
      return NextResponse.json({ success: true, action: "ignored:still-active" });
    }

    if (confirmation === "cannot-verify") {
      // Retryable on purpose. Writing on an unchecked claim would let a leaked
      // URL secret suppress an active subscriber irreversibly, and swallowing
      // the event would drop a real opt-out. A 5xx does neither.
      return NextResponse.json(
        { success: false, reason: "Could not verify with beehiiv; retry expected" },
        { status: 503 }
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
