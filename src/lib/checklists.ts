/**
 * checklists.ts
 *
 * The set of valid checklist slugs, shared by the capture route so an unknown
 * value can be rejected rather than silently swapped for the universal
 * checklist and then persisted under its own name.
 *
 * This is the minimal fix, not a full consolidation. The same 6 slugs are
 * still separately hand-maintained in CHECKLIST_LABELS and CHECKLIST_FILES
 * (src/app/api/capture-email/route.ts), NURTURE_EMAIL_2 / NURTURE_EMAIL_3
 * (src/lib/nurture-emails.ts), and CHECKLISTS (checklists/page.tsx). Those
 * were left alone: each carries its own content (a filename, an email body,
 * page copy) that this list has no way to represent, so folding them in here
 * would just move the duplication rather than remove it.
 */

export const CHECKLIST_SLUGS = [
  "universal",
  "food-and-beverage",
  "home-services",
  "fitness-wellness",
  "senior-care",
  "b2b",
] as const;

export type ChecklistSlug = (typeof CHECKLIST_SLUGS)[number];

const VALID = new Set<string>(CHECKLIST_SLUGS);

/**
 * Resolves a client-supplied slug to a known checklist slug, defaulting to
 * "universal" for anything unrecognized (including empty/missing).
 *
 * Call this ONCE per request and use the result everywhere: for the file that
 * gets sent, the label in both emails, AND the value written to
 * ChecklistDownload.checklistType. Previously the resolution only happened at
 * the point the file was loaded, so an unknown slug like "pet-services" (a
 * typo, or a future industry added to a component but never wired into the
 * checklist map) delivered the universal file while persisting the literal
 * bogus string to the database, and the caller still saw success.
 */
export function resolveChecklistSlug(slug: unknown): ChecklistSlug {
  return typeof slug === "string" && VALID.has(slug) ? (slug as ChecklistSlug) : "universal";
}
