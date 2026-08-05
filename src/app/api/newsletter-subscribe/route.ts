/**
 * Public newsletter signup.
 *
 * WHY IT TAKES THE SAME GUARD AS THE LEAD MAGNETS
 * -----------------------------------------------
 * Unauthenticated, unbounded, and it subscribes whatever address the body names
 * to a real list that sends real mail. That is the same shape as the capture
 * endpoints PR #44 fixed, so it takes the same limits: a script could otherwise
 * sign a stranger up in a loop.
 *
 * It is the milder case of that shape, which is why it was the one left over.
 * subscribeToBeehiiv carries the suppression check itself (src/lib/beehiiv.ts),
 * so this route cannot resurrect someone who opted out no matter how often it is
 * called. What it could still do is subscribe a person who never asked.
 *
 * NO IDEMPOTENCY KEY, deliberately. There is no row of ours to key on, and
 * beehiiv treats a repeat subscribe as a no-op, so the ordinary double-click is
 * already harmless. The rate limits are the layer that was missing.
 *
 * ITS OWN ADDRESS QUOTA, also deliberately. Drawing on the shared magnet
 * counter would have turned this route into a way to DENY somebody: three
 * newsletter POSTs aimed at an address would burn its hourly allowance, and the
 * guide that person then asked for would come back 429. The per-address bound
 * still exists, it just cannot be spent out of someone else's budget.
 */
import { NextResponse } from "next/server";
import { subscribeToBeehiiv } from "@/lib/beehiiv";
import { guardCapture } from "@/lib/lead-capture";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    // guardCapture validates the address shape and returns the 400 itself, so
    // the old hand-rolled check would only disagree with it.
    const guard = await guardCapture({
      req,
      route: "newsletter-subscribe",
      email,
      addressQuota: "newsletter",
    });
    if (!guard.proceed) return guard.response;

    // The NORMALIZED address, so a later suppression lookup on it matches what
    // the opt-out path writes.
    await subscribeToBeehiiv(guard.email, typeof name === "string" ? name.trim() || undefined : undefined);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[newsletter-subscribe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
