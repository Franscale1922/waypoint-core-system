#!/usr/bin/env node
/**
 * audit-kelsey-mis-gender-queue.mjs
 *
 * Scans all leads currently in the cold-email queue for contaminated
 * draftEmail content generated under the pre-2026-05-20 VOICE_RULES prompt
 * (the March 2026 He → She flip that was reverted in commit 60eec77).
 *
 * Architecture context:
 *   - personalizerProcess generates draftEmail and persists it to DB at
 *     enrich time (src/inngest/functions.ts:783)
 *   - senderProcess reads draftEmail from DB at send time and dispatches
 *     via Instantly without regenerating
 *   - Therefore: any SEQUENCED lead whose draftEmail was generated before
 *     2026-05-20 may render Kelsey with she/her pronouns
 *
 * Usage (Prisma schema reads POSTGRES_PRISMA_URL):
 *
 *   Easiest — pull prod env from Vercel:
 *     vercel link                         # one-time, links cwd to project
 *     vercel env pull .env.production.local --environment=production
 *     set -a; source .env.production.local; set +a
 *     node scripts/audit-kelsey-mis-gender-queue.mjs
 *
 *   Or inline (single-quote the URL to protect special chars):
 *     POSTGRES_PRISMA_URL='postgres://...' node scripts/audit-kelsey-mis-gender-queue.mjs
 *
 * For convenience this script also accepts DATABASE_URL and copies it
 * into POSTGRES_PRISMA_URL before initializing Prisma.
 *
 * Output:
 *   - Count of SEQUENCED leads
 *   - Count of leads whose draftEmail mentions she/her/herself/woman/female
 *     in proximity to "Kelsey" or in a context where it could refer to Kelsey
 *   - Per-hit lead ID + email + first ~120 chars of offending line
 *
 * No writes. Read-only audit.
 *
 * Companion remediation (separate script when ready):
 *   - For each flagged lead, either (a) regenerate draftEmail by re-firing
 *     workflow/lead.personalize.start, or (b) reset status to ENRICHED and
 *     let the pipeline re-run.
 */

// Compat shim: schema expects POSTGRES_PRISMA_URL, but DATABASE_URL is the
// more common convention. Honor either.
if (!process.env.POSTGRES_PRISMA_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
}

if (!process.env.POSTGRES_PRISMA_URL) {
  console.error('ERROR: POSTGRES_PRISMA_URL (or DATABASE_URL) not set.');
  console.error('');
  console.error('Pull production env from Vercel:');
  console.error('  vercel link');
  console.error('  vercel env pull .env.production.local --environment=production');
  console.error('  set -a; source .env.production.local; set +a');
  console.error('  node scripts/audit-kelsey-mis-gender-queue.mjs');
  process.exit(1);
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Banned descriptors (matches AGENTS.md SocialQAVerifier rule and
// custom-instructions Hard Rule)
const BANNED = /\b(she|her|hers|herself|woman|lady|female)\b/i;

// Tighter check: female descriptor within proximity of "Kelsey" OR
// a first-person Kelsey context (sign-off, etc) with a co-occurring
// female pronoun anywhere in the body.
function flagDraft(draftEmail) {
  if (!draftEmail) return null;
  const lines = draftEmail.split('\n');
  const hits = [];

  // Pattern A: same-line co-occurrence
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/[Kk]elsey/.test(line) && BANNED.test(line)) {
      hits.push({
        type: 'same-line',
        line: i + 1,
        snippet: line.slice(0, 140),
      });
    }
  }

  // Pattern B: body signed by Kelsey (final ~5 lines contain "Kelsey")
  // + any female descriptor anywhere in the body
  const tail = lines.slice(-5).join(' ');
  if (/[Kk]elsey/.test(tail)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (BANNED.test(line) && !/[Kk]elsey/.test(line)) {
        hits.push({
          type: 'kelsey-signed-body',
          line: i + 1,
          snippet: line.slice(0, 140),
        });
      }
    }
  }

  return hits.length ? hits : null;
}

async function main() {
  const sequenced = await prisma.lead.findMany({
    where: { status: 'SEQUENCED' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      draftEmail: true,
      updatedAt: true,
    },
  });

  console.log(`\nAudit: Kelsey mis-gendering in SEQUENCED queue`);
  console.log(`Run: ${new Date().toISOString()}`);
  console.log(`Source: src/inngest/functions.ts personalizerProcess → DB.lead.draftEmail`);
  console.log(`Banned descriptors: ${BANNED.source}`);
  console.log(`Total SEQUENCED leads: ${sequenced.length}\n`);

  const flagged = [];
  for (const lead of sequenced) {
    const hits = flagDraft(lead.draftEmail);
    if (hits) flagged.push({ lead, hits });
  }

  console.log(`Flagged: ${flagged.length} of ${sequenced.length} (${
    sequenced.length ? ((flagged.length / sequenced.length) * 100).toFixed(1) : '0.0'
  }%)\n`);

  if (flagged.length === 0) {
    console.log('✅ No contaminated draftEmail content found in SEQUENCED queue.');
    console.log('   Either the queue is fresh (post-2026-05-20) or all pre-fix');
    console.log('   leads have already SENT.');
    return;
  }

  console.log('--- Flagged leads ---\n');
  for (const { lead, hits } of flagged) {
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || '(no name)';
    console.log(`Lead ${lead.id}  ${lead.email}  ${name}  (${lead.company ?? 'no company'})`);
    console.log(`  Last updated: ${lead.updatedAt.toISOString()}`);
    for (const h of hits) {
      console.log(`  [${h.type}] line ${h.line}: ${h.snippet}`);
    }
    console.log('');
  }

  console.log('\nNext step recommendations:');
  console.log('  (a) Reset flagged leads to ENRICHED status to force re-personalization:');
  console.log("      prisma.lead.updateMany({ where: { id: { in: [...] } }, data: { status: 'ENRICHED', draftEmail: null } })");
  console.log('  (b) Or fire workflow/lead.personalize.start manually per lead via Inngest dashboard');
  console.log('  (c) Or wipe draftEmail and let the next warmupScheduler tick re-queue them');
  console.log('');
  console.log('Either way, the new VOICE_RULES prompt (he/him) is now live so');
  console.log('regenerated drafts will be correct.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
