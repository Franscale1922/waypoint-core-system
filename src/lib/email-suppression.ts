/**
 * email-suppression.ts: does this ADDRESS want to hear from us?
 *
 * THE BUG THIS REPLACES
 * ---------------------
 * Every list model carries its own `unsubscribed` flag, and every nurture
 * sequence checked only the flag on the single row that started it. So an
 * unsubscribe was scoped to one record, not to a person: after opting out of
 * record A, the very next form submission wrote record B with a fresh
 * `unsubscribed = false`, and B's sequence ran happily. Opting out did not
 * stick, which is both the thing recipients think that link does and the thing
 * CAN-SPAM requires it to do.
 *
 * THE RULE
 * --------
 * An opt-out recorded on ANY list suppresses marketing to that address on EVERY
 * list. One person, one preference. This is deliberately broader than "this
 * sequence". A recipient clicking unsubscribe is telling the sender to stop,
 * and honouring that narrowly is how a compliant-looking system keeps mailing
 * people who asked it not to.
 *
 * WHAT IT DOES NOT SUPPRESS
 * -------------------------
 * The delivery email for a magnet the visitor just filled in a form to request.
 * That is a direct response to an action taken seconds earlier, not marketing
 * they are receiving unbidden, and withholding it would look like a broken
 * form. What a suppressed address does NOT get is a nurture sequence: resuming
 * a drip they opted out of takes a deliberate re-subscribe, not a download.
 */
import prisma from "@/lib/prisma";

/**
 * Every model that records a marketing opt-out. Keep in lockstep with the
 * `unsubscribed` fields in prisma/schema.prisma. A list missing from here is a
 * list whose opt-outs are invisible to every other list.
 */
export const SUPPRESSION_LISTS = [
  "checklistDownload",
  "escapeKitDownload",
  "pitchDecoderDownload",
  "aiFddReaderDownload",
  "scorecardSubmission",
  "archetypeSubmission",
] as const;

export type SuppressionList = (typeof SUPPRESSION_LISTS)[number];

/**
 * The canonical form of an address: what gets written to new rows, and the key
 * used for exact-match idempotency lookups.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * True when this address has opted out anywhere.
 *
 * Matches case-insensitively rather than on the normalized value, because rows
 * written before addresses were normalized on write can hold any casing, and a
 * missed legacy opt-out is exactly the failure this module exists to prevent.
 *
 * THROWS if the lookup fails. Callers must fail CLOSED: an unanswerable
 * "may we email this person?" is a no, not a yes.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const key = normalizeEmail(email);
  if (!key) return false;

  const domain = key.split("@")[1] ?? "";

  // SuppressionList is the pre-existing canonical record: the Resend webhook
  // writes bounces and complaints into it, and cold outreach already gates on
  // it. Skipping it here would have made this a SECOND, disconnected source of
  // truth, so an address that hard-bounced could still be dripped to and
  // reactivated on the newsletter. It carries domain-level entries too.
  const canonical = prisma.suppressionList.findFirst({
    where: { OR: [{ email: key }, ...(domain ? [{ domain }] : [])] },
    select: { id: true },
  });

  const hits = await Promise.all([
    canonical,
    ...SUPPRESSION_LISTS.map((list) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any)[list].findFirst({
        where: { email: { equals: key, mode: "insensitive" }, unsubscribed: true },
        select: { id: true },
      })
    ),
  ]);
  return hits.some(Boolean);
}

/**
 * Why we are not mailing this address, with the fail-closed decision already
 * made: any error resolves to "do not send" so a database blip can never be the
 * reason a nurture sequence starts for someone who opted out.
 *
 * WHY THIS IS THREE VALUES AND NOT A BOOLEAN
 * ------------------------------------------
 * The boolean version collapsed "this person opted out" and "we could not tell"
 * into the same answer, and every caller then logged the outcome as
 * "unsubscribed". A transient Neon error therefore recorded a voluntary opt-out
 * against someone who never asked for one, and because the Inngest step returns
 * `{ skipped: true }` (a COMPLETED step, never retried) the message was dropped
 * for good with no trace of why. Not sending is still the right call. Calling it
 * an opt-out is what made it undiagnosable.
 */
export type SuppressionVerdict = "clear" | "suppressed" | "lookup-failed";

export async function suppressionVerdict(email: string): Promise<SuppressionVerdict> {
  try {
    return (await isEmailSuppressed(email)) ? "suppressed" : "clear";
  } catch (err) {
    console.error("[email-suppression] lookup failed; treating as suppressed:", err);
    return "lookup-failed";
  }
}

/**
 * isEmailSuppressed, with the fail-closed decision already made: any error is
 * reported as "suppressed" so a database blip can never be the reason a nurture
 * sequence starts for someone who opted out.
 *
 * Kept for callers that only need the yes/no. Anything that RECORDS the outcome
 * should use suppressionVerdict instead, so the two reasons stay distinguishable
 * in the log.
 */
export async function isEmailSuppressedFailClosed(email: string): Promise<boolean> {
  return (await suppressionVerdict(email)) !== "clear";
}

/**
 * Records the opt-out on every list this address appears on, so a later
 * submission to a different magnet cannot resurrect it.
 *
 * Returns how many rows were updated across all lists. Zero is a legitimate
 * outcome (already unsubscribed everywhere, or an address we have no record
 * of) and must not be reported to the clicker as a failure.
 */
export async function suppressEmailEverywhere(email: string): Promise<number> {
  const key = normalizeEmail(email);
  if (!key) return 0;

  // Written to the canonical record too, so the opt-out also reaches cold
  // outreach. Someone asking to stop hearing from Waypoint means all of it, not
  // just the list whose footer they happened to click.
  const canonical = prisma.suppressionList.upsert({
    where: { email: key },
    create: { email: key, reason: "unsubscribed" },
    update: {},
  });

  const results = await Promise.all(
    SUPPRESSION_LISTS.map((list) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any)[list].updateMany({
        where: { email: { equals: key, mode: "insensitive" }, unsubscribed: false },
        data: { unsubscribed: true, unsubscribedAt: new Date() },
      })
    )
  );
  await canonical;
  return results.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
}

/**
 * The exact `reason` suppressEmailEverywhere writes. Load bearing: it is how
 * unsuppressEmail tells a self-service opt-out apart from a bounce, a complaint
 * or a reply classified as "not a fit", none of which a re-subscribe may clear.
 */
export const SELF_SERVICE_OPT_OUT_REASON = "unsubscribed";

export interface UnsuppressOutcome {
  /** False when nothing was changed. `blockedBy` then says what refused. */
  ok: boolean;
  /** Rows returned to mailable across the six lists. */
  listRowsRestored: number;
  /** True when the canonical opt-out row was actually removed. */
  canonicalCleared: boolean;
  /** Set only when ok is false. Names what refused, for the operator. */
  blockedBy: string | null;
  /**
   * A cold outreach Lead still latched to SUPPRESSED. Reported, never cleared.
   * See below for why.
   */
  latchedLead: { id: string; suppressionReason: string | null } | null;
}

/**
 * Reverses a SELF-SERVICE opt-out, so a wrong one stops needing a hand-written
 * database edit to undo.
 *
 * WHY THIS EXISTS
 * ---------------
 * The unsubscribe token is HMAC(secret, recordId) with no expiry and no nonce,
 * so anyone who ever saw the URL can replay it, and a POST now suppresses the
 * address on all six lists AND the canonical record that gates cold outreach.
 * Tightening the token is the wrong lever: under RFC 8058 the recipient's mail
 * provider sends that POST, sometimes long after delivery, so an expiry short
 * enough to matter breaks real one-click unsubscribes, and a failed opt-out is a
 * worse failure than a replayed one. Making the mistake REVERSIBLE is the fix
 * that carries no such tradeoff.
 *
 * WHY IT IS SURGICAL
 * ------------------
 * SuppressionList is shared. The Resend webhook writes bounces and complaints
 * into it, and the reply classifier writes "not_a_fit". Clearing it wholesale
 * would resurrect addresses that are dead or hostile, turning a support favour
 * into a deliverability incident. So anything that is not the exact reason
 * suppressEmailEverywhere writes refuses, and says so.
 *
 * WHY THE REASON IS IN THE WHERE CLAUSE
 * -------------------------------------
 * The delete filters on `reason` rather than deleting the row that was just
 * read. Between the read and the write a bounce webhook can upgrade the same row
 * from "unsubscribed" to "bounce"; a delete by id would drop it anyway and
 * re-open a hard-bounced address. Filtering makes that race unrepresentable.
 *
 * WHY THE WRITES ARE ORDERED
 * --------------------------
 * There is no transaction here, matching suppressEmailEverywhere and the rest of
 * this codebase. The order is therefore load bearing: the six list flags clear
 * FIRST and the canonical row LAST. If the second half fails, the canonical row
 * survives, isEmailSuppressed still answers "suppressed", and cold outreach stays
 * gated. Doing it the other way round would leave a window where the canonical
 * record was gone but the lists still said opted-out, which is the one
 * combination that could put mail in front of someone who asked for none.
 */
export async function unsuppressEmail(email: string): Promise<UnsuppressOutcome> {
  const key = normalizeEmail(email);
  const unchanged = { ok: false, listRowsRestored: 0, canonicalCleared: false, latchedLead: null };
  if (!key) return { ...unchanged, blockedBy: "no address given" };

  const domain = key.split("@")[1] ?? "";

  const [domainEntry, addressEntry, latchedLead] = await Promise.all([
    domain
      ? prisma.suppressionList.findFirst({ where: { domain }, select: { id: true } })
      : Promise.resolve(null),
    prisma.suppressionList.findFirst({ where: { email: key }, select: { id: true, reason: true } }),
    // Reported so the operator is not told "done" while cold outreach still
    // refuses this address. `as any`: suppressionReason is on the schema but the
    // generated client is only refreshed on deploy, which is why the rest of the
    // codebase casts here too.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.lead.findFirst as any)({
      where: { email: { equals: key, mode: "insensitive" }, status: "SUPPRESSED" },
      select: { id: true, suppressionReason: true },
      orderBy: { updatedAt: "desc" },
    }) as Promise<{ id: string; suppressionReason: string | null } | null>,
  ]);

  // A domain rule outranks the address. Clearing the address row would report
  // success over an address the domain entry still gates.
  if (domainEntry) {
    return { ...unchanged, blockedBy: `a domain-level suppression on ${domain}`, latchedLead };
  }
  if (addressEntry && addressEntry.reason !== SELF_SERVICE_OPT_OUT_REASON) {
    return { ...unchanged, blockedBy: addressEntry.reason ?? "an unrecorded reason", latchedLead };
  }

  const results = await Promise.all(
    SUPPRESSION_LISTS.map((list) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any)[list].updateMany({
        where: { email: { equals: key, mode: "insensitive" }, unsubscribed: true },
        data: { unsubscribed: false, unsubscribedAt: null },
      })
    )
  );
  const listRowsRestored = results.reduce((sum: number, r: { count: number }) => sum + r.count, 0);

  const removed = await prisma.suppressionList.deleteMany({
    where: { email: key, reason: SELF_SERVICE_OPT_OUT_REASON },
  });

  return {
    ok: true,
    listRowsRestored,
    canonicalCleared: removed.count > 0,
    blockedBy: null,
    latchedLead,
  };
}
