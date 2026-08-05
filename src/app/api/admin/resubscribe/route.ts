/**
 * POST /api/admin/resubscribe
 *
 * Reverses a self-service opt-out for one address.
 *
 * Body (JSON): { email: string }
 * Auth: ENFORCED by `withAdmin`: an authenticated, allowlisted admin session.
 *
 * WHY THIS IS ADMIN-ONLY AND NOT A PUBLIC LINK
 * --------------------------------------------
 * A public re-subscribe URL is the mirror image of the problem it would solve.
 * The unsubscribe token never expires, so anyone who ever saw one can replay it;
 * handing out a matching re-subscribe token just adds a way to put mail back in
 * front of somebody who asked for none, which is the worse of the two failures.
 * An admin acting on a support request is the one path where a human has
 * actually confirmed the person wants back in.
 *
 * The refusals are the interesting part of the response, not the successes. See
 * unsuppressEmail: a bounce, a complaint or a domain rule all decline, and the
 * caller is told which, because reporting "done" over an address that is still
 * gated is how this feature would quietly become useless.
 */
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/with-admin";
import { unsuppressEmail } from "@/lib/email-suppression";

export const POST = withAdmin(async (req, session) => {
  try {
    const { email } = (await req.json()) as { email?: unknown };

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "An email address is required." }, { status: 400 });
    }

    const target = email.trim().toLowerCase();

    // Logged BEFORE the mutation as well as after, and both lines carry the
    // actor and the target. The write is six updates plus a delete with no
    // transaction around them, so a crash midway, or after the delete but
    // before the outcome line, would otherwise leave a consent record changed
    // with nothing at all saying who changed it. An intent line means every
    // reversal is attributable even when it did not finish.
    console.log(`[admin/resubscribe] ${session.user.email} -> ${target}: attempting`);

    const outcome = await unsuppressEmail(email);

    console.log(
      `[admin/resubscribe] ${session.user.email} -> ${target}: ` +
        (outcome.ok
          ? `restored ${outcome.listRowsRestored} row(s), canonical ${outcome.canonicalCleared ? "cleared" : "absent"}`
          : `REFUSED (${outcome.blockedBy})`)
    );

    return NextResponse.json(outcome);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin/resubscribe] FAILED:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
