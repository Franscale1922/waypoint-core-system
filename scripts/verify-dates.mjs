#!/usr/bin/env node
/**
 * Ingestion guard for article frontmatter dates, over the `content/articles/` corpus on disk.
 *
 * The rules themselves live in src/lib/frontmatterDates.mjs, because this is not the only way an
 * article reaches production. See that file for WHY the checks read raw text rather than parsed
 * values — it is the single most important thing to understand before editing any of this, and
 * "simplifying" it to use gray-matter reintroduces the exact bug it exists to catch. This file is
 * the part that walks the directory and is the CLI.
 *
 * There IS a render-time validator, and it is not enough on its own. The resources page runs both
 * dates through `schemaDate`, which drops a bad value so invalid structured data never ships, then
 * emits a console.warn: a build-log line nobody necessarily reads. Two things still get past it. A
 * missing REQUIRED date only warns, so an article merged without one ships with no publication
 * metadata. And src/app/sitemap.ts reads `updatedAt ?? date` directly, never through schemaDate, so
 * a malformed value still reaches lastModified.
 *
 * More to the point, schemaDate cannot recover an unquoted date at all — by the time it runs, the
 * js-yaml rollover has already happened. This script is the ingestion gate that makes the mistake
 * impossible rather than survivable, and it fails instead of warning.
 *
 * THE OTHER WRITE PATH, AND WHERE IT IS GATED
 * -------------------------------------------
 * src/lib/githubArticleCommit.ts commits AI-refreshed articles by PATCHing the branch ref through
 * the GitHub API, against `main` by default. That path touches no local git, so .githooks/pre-push
 * never runs, and the CI workflow cannot be made blocking on this plan. This script therefore
 * cannot see those commits and never will.
 *
 * It is gated at its own boundary instead, by the same rules: `serializeArticle` stamps both dates
 * rather than trusting model output, and `commitRefreshedArticles` runs
 * `validateFrontmatterDates` over the exact serialized bytes before it creates a blob or advances
 * the ref. Change the rules here and that path changes with them, which is the reason they were
 * moved into a shared module rather than copied.
 *
 * Run: node scripts/verify-dates.mjs   (wired into the `test` npm script, .githooks/pre-push, and
 *      .github/workflows/verify-links.yml)
 * Unit tests: tests/unit/verify-dates.test.ts, tests/unit/write-path-dates.test.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateFrontmatterDates } from "../src/lib/frontmatterDates.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_ARTICLES_DIR = path.join(__dirname, "..", "content", "articles");

/** Validate every article in `dir`. Returns { fileCount, checkedDates, errors }. */
export function verifyArticleDates(dir = DEFAULT_ARTICLES_DIR) {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort();

  const errors = [];
  let checkedDates = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const result = validateFrontmatterDates(raw, { label: file });
    errors.push(...result.errors);
    checkedDates += result.checked;
  }

  // Zero coverage is the failure this repo has already been burned by once: a checker that quietly
  // stopped finding anything and printed a green pass for months (see scripts/verify-links.mjs). An
  // empty corpus, a mistyped CLI directory, or a move away from .md would otherwise all report
  // success here while validating nothing, so the absence of work is itself an error.
  //
  // Per-FILE coverage needs no separate assertion. `date` is required and that requirement is
  // enforced by the shared rules, so every file either raises an error or contributes a validated
  // date: a clean run cannot examine fewer dates than files. An explicit `checkedDates <
  // files.length` invariant was written here and removed once mutation testing showed it
  // unreachable, and therefore untestable. If `date` ever becomes optional, it stops being
  // unreachable and should come back with a test.
  if (files.length === 0) {
    errors.push(
      `${dir}: no .md articles found. A guard that checks nothing must not report success — ` +
        `if the content directory moved, point this script at the new one.`,
    );
  }

  return { fileCount: files.length, checkedDates, errors };
}

function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ARTICLES_DIR;
  const { fileCount, checkedDates, errors } = verifyArticleDates(dir);

  if (errors.length) {
    for (const err of errors) console.error(`❌ ${err}`);
    console.error(
      `\n❌ verify-dates FAILED: ${errors.length} problem(s) across ${fileCount} article(s).`,
    );
    process.exit(1);
  }

  console.log(
    `✅ verify-dates passed (${checkedDates} date(s) validated across ${fileCount} articles).`,
  );
}

// Run only when invoked directly, not when imported by the tests. `realpathSync` is
// load-bearing: Node resolves symlinks for the ESM main module but `path.resolve` does
// not, so comparing the raw argv path would silently fail whenever the script is reached
// through a symlinked directory — and main() never running means this exits 0 having
// printed nothing, which is the same silent-green failure the rest of this file exists to
// prevent. Falls back to the unresolved path if argv[1] no longer exists on disk.
function invokedDirectly() {
  if (!process.argv[1]) return false;
  let invoked = path.resolve(process.argv[1]);
  try {
    invoked = fs.realpathSync(invoked);
  } catch {
    // argv[1] is not a real path (deleted, or a virtual entry point); use it as-is.
  }
  return invoked === fs.realpathSync(__filename);
}

if (invokedDirectly()) {
  main();
}
