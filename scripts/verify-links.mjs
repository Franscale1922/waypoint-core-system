#!/usr/bin/env node
/**
 * verify-links.mjs
 *
 * Fails the build/CI when an article's `relatedSlugs` front-matter entry points
 * at an article that does not exist. Production reads that list through
 * gray-matter (src/lib/articles.ts) and silently DROPS entries whose file is
 * missing, so a typo'd slug quietly degrades the related-articles rail with no
 * error anywhere. This script is the only thing that catches it.
 *
 * It parses front matter with gray-matter — the same parser, and therefore the
 * same YAML semantics, that production uses. An earlier version used a regex
 * over the whole document (`/relatedSlugs:\s*\[(.*?)\]/`), which matched only
 * single-line flow arrays. Every article here uses YAML block-list style, so
 * that regex matched nothing in every file and the script reported a green pass
 * while checking zero slugs. Two consequences of that bug are structural, not
 * incidental, and are guarded against below:
 *
 *   1. Parsing front matter (not the raw document) means a fenced code block in
 *      article body text that happens to contain `relatedSlugs: [...]` can never
 *      be mistaken for real metadata.
 *   2. `verifyArticleLinks` treats "zero slugs extracted from a non-empty
 *      article set" as a hard failure. That is the exact shape of the original
 *      bug, and the only way to make it impossible to regress into silently.
 *
 * Run: node scripts/verify-links.mjs   (wired into the `test` npm script)
 * Unit tests: tests/unit/verify-links.test.ts  (npm run test:links)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_ARTICLES_DIR = path.join(__dirname, "..", "content", "articles");

/**
 * Strip the trailing ".md" extension only. `String.replace(".md", "")` strips
 * the FIRST occurrence anywhere in the name, which mangles a file such as
 * "guide.md.v2.md" into "guide.v2.md".
 */
export function slugFromFilename(filename) {
  return path.basename(filename, ".md");
}

function describeValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}

/**
 * Pull `relatedSlugs` out of a single article's front matter.
 * Returns { slugs, errors }. Slug strings are returned verbatim (not trimmed)
 * so resolution below behaves exactly as production's `${slug}.md` lookup does
 * — a whitespace-padded slug fails here because it would also fail there.
 */
export function extractRelatedSlugs(raw, file) {
  const errors = [];
  let data;

  try {
    ({ data } = matter(raw));
  } catch (err) {
    errors.push(`${file}: front matter is not valid YAML — ${err.message}`);
    return { slugs: [], errors };
  }

  if (!Object.prototype.hasOwnProperty.call(data, "relatedSlugs")) {
    return { slugs: [], errors };
  }

  const value = data.relatedSlugs;
  if (!Array.isArray(value)) {
    errors.push(
      `${file}: relatedSlugs must be an array of slug strings, got ${describeValue(value)}.`,
    );
    return { slugs: [], errors };
  }

  const slugs = [];
  value.forEach((entry, i) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      errors.push(
        `${file}: relatedSlugs[${i}] must be a non-empty string, got ${describeValue(entry)}.`,
      );
      return;
    }
    slugs.push(entry);
  });

  return { slugs, errors };
}

/**
 * Verify every relatedSlug in `dir` resolves to a real article file.
 * Returns { fileCount, checkedSlugs, errors }. `checkedSlugs` is reported so a
 * future regression to vacuous passing is visible in the output itself, not
 * only in the exit code.
 */
export function verifyArticleLinks(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const validSlugs = new Set(files.map(slugFromFilename));
  const errors = [];
  let checkedSlugs = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { slugs, errors: parseErrors } = extractRelatedSlugs(raw, file);
    errors.push(...parseErrors);

    for (const slug of slugs) {
      checkedSlugs += 1;
      if (!validSlugs.has(slug)) {
        errors.push(
          `${file}: related slug '${slug}' does not resolve to an article file ` +
            `(expected ${slug}.md). Production drops it silently.`,
        );
      }
    }
  }

  // Anti-vacuity guard. Every article in this repo declares relatedSlugs, so
  // extracting none of them means extraction is broken — not that the content
  // is clean. Without this, a broken extractor reports success.
  if (files.length > 0 && checkedSlugs === 0) {
    errors.push(
      `Extracted 0 relatedSlugs from ${files.length} article(s). Every article here ` +
        `declares relatedSlugs, so this means front-matter extraction is broken, not ` +
        `that the content is clean. Check this script against the front-matter format ` +
        `in content/articles/.`,
    );
  }

  return { fileCount: files.length, checkedSlugs, errors };
}

function main() {
  console.log("Starting Markdown link verification...");
  const { fileCount, checkedSlugs, errors } = verifyArticleLinks(DEFAULT_ARTICLES_DIR);

  if (errors.length) {
    for (const err of errors) console.error(`❌ ${err}`);
    console.error(
      `\n❌ Link verification failed: ${errors.length} problem(s) across ${fileCount} ` +
        `article(s). Fix these before deploying.`,
    );
    process.exit(1);
  }

  console.log(
    `✅ Verified ${checkedSlugs} relatedSlugs across ${fileCount} articles — all resolve.`,
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
