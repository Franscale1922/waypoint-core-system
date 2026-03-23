#!/usr/bin/env node
/**
 * Adds checklistSlug frontmatter to articles that need the Before You Go widget.
 * Run once from the repo root: node scripts/add-checklist-slugs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.join(__dirname, "..", "content", "articles");

// Map: article slug -> checklistSlug to assign
const ASSIGNMENTS = {
  // Industry Spotlights — industry-specific checklists
  "food-and-beverage-franchise-what-it-actually-demands": "food-and-beverage",
  "home-services-franchises-most-overlooked-category": "home-services",
  "restoration-franchises-the-disaster-proof-business": "home-services",
  "junk-removal-franchise-economics-explained": "home-services",
  "should-you-buy-a-car-wash-franchise": "home-services",
  "fitness-franchise-comparison-what-the-numbers-say": "fitness-wellness",
  "health-wellness-franchises-fad-vs-durable-business": "fitness-wellness",
  "senior-care-franchise-is-it-right-for-you": "senior-care",
  "b2b-franchise-opportunities-lower-risk-steadier-cash": "b2b",
  "pet-care-franchise-built-on-unconditional-demand": "universal",

  // Getting Started / General — universal checklist
  "are-you-ready-to-own-a-franchise": "universal",
  "w2-to-franchise-owner-when-youre-actually-ready": "universal",
  "the-true-cost-of-buying-a-franchise": "universal",
  "how-franchise-funding-actually-works": "universal",
  "the-semi-absentee-franchise-real-talk": "universal",
  "fdd-decoded-what-actually-matters": "universal",
  "you-dont-need-to-love-your-franchise": "universal",
  "do-you-need-a-franchise-consultant": "universal",
  "asset-light-vs-capital-heavy-choosing-your-franchise-type": "universal",
  "recession-proof-franchise-categories": "universal",
  "buying-an-existing-franchise-what-you-need-to-know": "universal",
  "red-flags-franchise-types-to-avoid": "universal",
  "big-name-vs-emerging-which-franchise-to-buy": "universal",
  "sba-loan-vs-robs-franchise-funding-comparison": "universal",

  // No widget needed for these — omitted intentionally:
  // what-to-expect-at-discovery-day
  // how-to-sell-a-franchise-exit-strategy
  // your-first-90-days-as-a-franchise-owner
  // one-unit-or-multi-unit-what-first-timers-get-wrong
  // understanding-franchise-royalties-what-youre-paying-for
  // what-is-your-time-worth-the-roi-math-of-franchise-ownership
  // the-franchise-agreement-what-you-can-and-cant-negotiate
  // fast-growing-franchise-brand-good-sign-or-red-flag
  // how-to-tell-if-a-franchisor-actually-cares
  // how-to-pick-a-franchise-territory
};

let updated = 0;
let skipped = 0;

for (const [slug, checklistSlug] of Object.entries(ASSIGNMENTS)) {
  const filePath = path.join(articlesDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    console.log(`MISSING: ${slug}.md — skipping`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already has checklistSlug
  if (content.includes("checklistSlug:")) {
    console.log(`SKIP (already set): ${slug}`);
    skipped++;
    continue;
  }

  // Insert checklistSlug after the tier: line
  const tierMatch = content.match(/^(tier:\s*\d+)$/m);
  if (!tierMatch) {
    console.log(`WARNING: No tier field found in ${slug} — appending before closing ---`);
    // Fallback: insert before the closing --- of frontmatter
    content = content.replace(/^---$/m, `checklistSlug: "${checklistSlug}"\n---`);
  } else {
    content = content.replace(
      /^(tier:\s*\d+)$/m,
      `$1\nchecklistSlug: "${checklistSlug}"`
    );
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`OK: ${slug} → ${checklistSlug}`);
  updated++;
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
