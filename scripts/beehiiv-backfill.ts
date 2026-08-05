#!/usr/bin/env npx ts-node --project tsconfig.json
/**
 * scripts/beehiiv-backfill.ts
 *
 * Bulk-subscribes all existing inbound leads to the Beehiiv newsletter.
 * Covers three sources: ScorecardSubmission, ChecklistDownload, EscapeKitDownload.
 *
 * Safety rules:
 *   - Skips unsubscribed records (respects opt-out state)
 *   - Skips kelsey@waypointfranchise.com test records
 *   - Rate-limits to 1 req/sec to stay inside Beehiiv API limits
 *   - Dry-run mode (default) prints what would be sent without calling the API
 *
 * Usage:
 *   npx ts-node scripts/beehiiv-backfill.ts          # dry run — shows what would subscribe
 *   npx ts-node scripts/beehiiv-backfill.ts --live   # actually calls Beehiiv API
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const SKIP_EMAIL = "kelsey@waypointfranchise.com";
const LIVE = process.argv.includes("--live");
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

if (LIVE && (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID)) {
  console.error("❌  BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID not set in .env");
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function subscribeOne(email: string, firstName?: string): Promise<"ok" | "skip" | "error"> {
  if (!LIVE) {
    console.log(`  [DRY RUN] Would subscribe: ${email}`);
    return "ok";
  }
  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          ...(firstName ? { first_name: firstName } : {}),
          // Never resurrect someone who left. The `unsubscribed: false` filters
          // below read OUR tables, which by definition cannot see an opt-out
          // recorded on beehiiv's side, so this flag was the one thing deciding
          // whether a beehiiv unsubscribe survived a re-run of this script. It
          // did not. New addresses still subscribe normally; only reactivation
          // of an existing inactive subscriber is refused.
          reactivate_existing: false,
          send_welcome_email: false,
          utm_source: "waypoint-crm-backfill",
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`  ❌  ${email}: ${res.status} ${body}`);
      return "error";
    }
    console.log(`  ✅  ${email}`);
    return "ok";
  } catch (e) {
    console.error(`  ❌  ${email}:`, e);
    return "error";
  }
}

async function main() {
  console.log(`\n🚀  Beehiiv backfill — mode: ${LIVE ? "LIVE" : "DRY RUN"}\n`);

  // Collect all unique emails with their first names
  const seen = new Set<string>();
  const queue: { email: string; firstName?: string; source: string }[] = [];

  // 1. Scorecard submissions
  const scorecard = await (prisma as any).scorecardSubmission.findMany({
    where: { unsubscribed: false },
    select: { email: true, name: true },
  });
  for (const row of scorecard) {
    const email = row.email?.toLowerCase().trim();
    if (!email || email === SKIP_EMAIL || seen.has(email)) continue;
    seen.add(email);
    queue.push({ email, firstName: row.name?.split(" ")[0] || undefined, source: "scorecard" });
  }

  // 2. Checklist downloads
  const checklists = await (prisma as any).checklistDownload.findMany({
    where: { unsubscribed: false },
    select: { email: true, name: true },
  });
  for (const row of checklists) {
    const email = row.email?.toLowerCase().trim();
    if (!email || email === SKIP_EMAIL || seen.has(email)) continue;
    seen.add(email);
    queue.push({ email, firstName: row.name?.split(" ")[0] || undefined, source: "checklist" });
  }

  // 3. Escape kit downloads
  const escapeKit = await (prisma as any).escapeKitDownload.findMany({
    where: { unsubscribed: false },
    select: { email: true, name: true },
  });
  for (const row of escapeKit) {
    const email = row.email?.toLowerCase().trim();
    if (!email || email === SKIP_EMAIL || seen.has(email)) continue;
    seen.add(email);
    queue.push({ email, firstName: row.name?.split(" ")[0] || undefined, source: "escape-kit" });
  }

  // The canonical opt-out record, which the three queries above cannot see. They
  // filter on each source table's own `unsubscribed` flag, and an opt-out that
  // reached us any other way (a beehiiv unsubscribe, a bounce, a complaint, a
  // domain rule) never touches those flags. So a person who left the newsletter
  // still arrives here looking eligible.
  //
  // reactivate_existing: false does NOT cover this. It refuses to revive an
  // existing INACTIVE subscriber, but a deleted beehiiv subscriber is gone
  // rather than inactive, so a plain subscribe would mint a brand new active
  // subscription for somebody who opted out.
  const suppressedRows = await (prisma as any).suppressionList.findMany({
    select: { email: true, domain: true },
  });
  const suppressedEmails = new Set<string>(
    suppressedRows.map((r: any) => r.email?.toLowerCase().trim()).filter(Boolean)
  );
  const suppressedDomains = new Set<string>(
    suppressedRows.map((r: any) => r.domain?.toLowerCase().trim()).filter(Boolean)
  );

  const eligible = queue.filter(({ email }) => {
    const domain = email.split("@")[1] ?? "";
    return !suppressedEmails.has(email) && !(domain && suppressedDomains.has(domain));
  });
  const skipped = queue.length - eligible.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} suppressed address(es): opt-out, bounce, complaint or domain rule.\n`);
  }

  console.log(`Found ${eligible.length} unique emails to subscribe:\n`);
  eligible.forEach(({ email, source }) => console.log(`  ${source.padEnd(12)} ${email}`));
  console.log();

  if (!LIVE) {
    console.log("ℹ️  Dry run complete. Run with --live to actually subscribe.\n");
    await prisma.$disconnect();
    return;
  }

  let ok = 0; let errors = 0; let raced = 0;
  for (const { email, firstName } of eligible) {
    // Re-read immediately before the call. The snapshot above can be minutes old
    // by the time a long queue reaches this address, and an opt-out webhook
    // landing mid-run would otherwise be overwritten by a subscribe this script
    // had already decided to make. One indexed lookup per address is nothing
    // next to the 1.1s pause below.
    const domain = email.split("@")[1] ?? "";
    const nowSuppressed = await (prisma as any).suppressionList.findFirst({
      where: { OR: [{ email }, ...(domain ? [{ domain }] : [])] },
      select: { id: true },
    });
    if (nowSuppressed) {
      console.log(`  ⏭   ${email}: suppressed during this run, skipping`);
      raced++;
      continue;
    }

    const result = await subscribeOne(email, firstName);
    if (result === "ok") ok++;
    else if (result === "error") errors++;
    await sleep(1100); // ~1 req/sec — safe for Beehiiv API
  }

  console.log(
    `\n✅  Done. Subscribed: ${ok} | Errors: ${errors}${raced > 0 ? ` | Skipped mid-run: ${raced}` : ""}\n`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
