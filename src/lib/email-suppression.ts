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

  const hits = await Promise.all(
    SUPPRESSION_LISTS.map((list) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any)[list].findFirst({
        where: { email: { equals: key, mode: "insensitive" }, unsubscribed: true },
        select: { id: true },
      })
    )
  );
  return hits.some(Boolean);
}

/**
 * isEmailSuppressed, with the fail-closed decision already made: any error is
 * reported as "suppressed" so a database blip can never be the reason a nurture
 * sequence starts for someone who opted out.
 */
export async function isEmailSuppressedFailClosed(email: string): Promise<boolean> {
  try {
    return await isEmailSuppressed(email);
  } catch (err) {
    console.error("[email-suppression] lookup failed; treating as suppressed:", err);
    return true;
  }
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

  const results = await Promise.all(
    SUPPRESSION_LISTS.map((list) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any)[list].updateMany({
        where: { email: { equals: key, mode: "insensitive" }, unsubscribed: false },
        data: { unsubscribed: true, unsubscribedAt: new Date() },
      })
    )
  );
  return results.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
}
