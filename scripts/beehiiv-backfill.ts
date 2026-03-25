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
          reactivate_existing: true,
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

  console.log(`Found ${queue.length} unique emails to subscribe:\n`);
  queue.forEach(({ email, source }) => console.log(`  ${source.padEnd(12)} ${email}`));
  console.log();

  if (!LIVE) {
    console.log("ℹ️  Dry run complete. Run with --live to actually subscribe.\n");
    await prisma.$disconnect();
    return;
  }

  let ok = 0; let errors = 0;
  for (const { email, firstName } of queue) {
    const result = await subscribeOne(email, firstName);
    if (result === "ok") ok++;
    else if (result === "error") errors++;
    await sleep(1100); // ~1 req/sec — safe for Beehiiv API
  }

  console.log(`\n✅  Done. Subscribed: ${ok} | Errors: ${errors}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
