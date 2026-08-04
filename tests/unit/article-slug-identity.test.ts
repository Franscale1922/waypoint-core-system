import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getAllArticles, getRefreshCadenceDays, type Article } from "@/lib/contentRefresh";
import { auditArticle, auditAll } from "../../scripts/aeo-audit.mjs";

/**
 * Which of `content/articles/<name>.md` and its own frontmatter `slug:` field decides an article's
 * identity, on the automated content-refresh write path.
 *
 * The two are not interchangeable copies of one fact. They were read by different halves of the
 * system, and the halves disagreed:
 *
 *   - src/lib/articles.ts (the LIVE SITE) derives every slug it serves from the FILENAME and
 *     ignores frontmatter.slug entirely. That is the URL a reader actually gets.
 *   - src/lib/contentRefresh.ts (the REFRESH) preferred the FIELD, and handed it to
 *     githubArticleCommit.ts, which interpolates it into `content/articles/${slug}.md` and PATCHes
 *     `main` through the GitHub API.
 *
 * So a file whose frontmatter contradicted its name published nothing wrong on the day it was
 * authored, and armed the monthly refresh to write a SECOND file months later: the original left
 * untouched and stale, the same article served under two URLs, and every subsequent run
 * re-processing the unchanged original forever, because the file it wrote was never the file it
 * read.
 *
 * This was never reachable through the model. src/inngest/functions.ts pins the slug back to the
 * original before committing, so the refresh could not invent a divergence. It could only inherit
 * one that a human had already committed, which is why the fix is in two places at once: identity
 * derives from the filename here, and scripts/aeo-audit.mjs fails the push at the point a human can
 * still say which of the two names was intended. Nothing downstream can recover that.
 *
 * All 45 articles on `main` agreed at the time of writing, verified file by file. These tests are
 * what keeps the 46th from being the one that doesn't.
 */

// ─── contentRefresh discovery ───────────────────────────────────────────────

/**
 * getAllArticles reads a module-level ARTICLES_DIR fixed at import time, so the two fs calls are
 * stubbed rather than the directory redirected. Both are spies on the REAL fs module object that
 * contentRefresh.ts holds a reference to, not a vi.mock of "fs": gray-matter reaches into fs for
 * matter.read, and replacing the whole module to test a path that never calls it is how a mock
 * starts failing for reasons unrelated to the code under test.
 */
function withArticleFiles(files: Record<string, string>) {
  vi.spyOn(fs, "readdirSync").mockReturnValue(
    Object.keys(files) as unknown as ReturnType<typeof fs.readdirSync>,
  );
  vi.spyOn(fs, "readFileSync").mockImplementation((p: Parameters<typeof fs.readFileSync>[0]) => {
    const name = String(p).split("/").pop() as string;
    if (!(name in files)) throw new Error(`unexpected read: ${String(p)}`);
    return files[name];
  });
}

function frontmatter(fields: Record<string, string>, body = "Body copy.\n"): string {
  const lines = ["---", ...Object.entries(fields).map(([k, v]) => `${k}: "${v}"`), "---", "", body];
  return lines.join("\n");
}

describe("contentRefresh identity comes from the filename", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the filename, not a frontmatter slug that agrees with it", () => {
    withArticleFiles({ "guide.md": frontmatter({ slug: "guide", title: "Guide" }) });

    const articles = getAllArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].slug).toBe("guide");
  });

  it("uses the filename when the article carries no slug field at all", () => {
    // The field is optional and stays optional. Only a contradictory value is a problem, so an
    // article that simply omits it must still be discovered and refreshed as normal.
    withArticleFiles({ "guide.md": frontmatter({ title: "Guide" }) });

    const articles = getAllArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].slug).toBe("guide");
  });

  it("SKIPS an article whose frontmatter slug contradicts its filename", () => {
    // The regression this file exists for. Under the old `data.slug ?? filename` derivation this
    // article was discovered with slug "renamed-guide", and the refresh committed
    // content/articles/renamed-guide.md while guide.md sat unchanged and stale.
    withArticleFiles({
      "guide.md": frontmatter({ slug: "renamed-guide", title: "Guide" }),
    });

    const articles = getAllArticles();

    expect(articles).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("renamed-guide");
    expect(warn.mock.calls[0][0]).toContain("guide.md");
  });

  it("drops only the contradictory article, never the rest of the batch", () => {
    // Skipping rather than throwing is the contract the whole monthly run depends on: one bad file
    // must not take down the other refreshes and suppress the summary email. A throw here would
    // pass a naive "it rejected the bad article" assertion while doing exactly that.
    withArticleFiles({
      "good-one.md": frontmatter({ slug: "good-one", title: "Good One" }),
      "bad.md": frontmatter({ slug: "not-bad", title: "Bad" }),
      "good-two.md": frontmatter({ title: "Good Two" }),
    });

    const articles = getAllArticles();

    expect(articles.map((a) => a.slug)).toEqual(["good-one", "good-two"]);
  });

  it("never returns an article whose slug disagrees with the file it was read from", () => {
    // The property that actually matters, stated directly rather than inferred from the cases
    // above: the commit path builds `content/articles/${slug}.md` out of this value, so anything
    // getAllArticles returns must round-trip to the file it came from.
    withArticleFiles({
      "alpha.md": frontmatter({ slug: "alpha", title: "Alpha" }),
      "beta.md": frontmatter({ slug: "wrong", title: "Beta" }),
      "gamma.md": frontmatter({ title: "Gamma" }),
    });

    for (const a of getAllArticles()) {
      expect(a.filePath.endsWith(`/${a.slug}.md`)).toBe(true);
    }
  });
});

// ─── Cadence precedence ─────────────────────────────────────────────────────

function articleFor(slug: string, category: string, tier: number): Article {
  return {
    slug,
    frontmatter: {
      title: "T",
      slug,
      date: "2020-01-01",
      category,
      tier,
      excerpt: "e",
      relatedSlugs: [],
    },
    body: "",
    filePath: `/content/articles/${slug}.md`,
  };
}

describe("refresh cadence prefers a curated category over a slug keyword", () => {
  it("gives an Industry Spotlight its 548-day cadence even when the slug contains a financing word", () => {
    // The reported bug. FINANCING_KEYWORDS matches a substring anywhere in the slug, so a spotlight
    // on a cost-sensitive segment was pulled onto the 365-day financing cadence and refreshed 183
    // days early on every cycle, purely because of how its title reads.
    expect(
      getRefreshCadenceDays(
        articleFor("cost-and-operational-efficiency-franchises", "Industry Spotlights", 3),
      ),
    ).toBe(548);
  });

  it("applies the same precedence to a tier-3 article in any category", () => {
    expect(getRefreshCadenceDays(articleFor("sba-lending-for-widgets", "Going Deeper", 3))).toBe(548);
  });

  it("KEEPS financing articles on 365 rather than letting Going Deeper claim them", () => {
    // The half of the ordering that is deliberately NOT changed, and the reason this was not fixed
    // by moving every category branch above the keywords. Three real articles depend on it: SBA
    // terms, ROBS rules and fee structures go stale far faster than the 730-day process cadence, so
    // a wholesale reorder would trade a latent bug for a live one by letting real rate and rule
    // changes sit unreviewed for two years.
    expect(getRefreshCadenceDays(articleFor("how-franchise-funding-actually-works", "Going Deeper", 2))).toBe(365);
    expect(getRefreshCadenceDays(articleFor("sba-loan-vs-robs-franchise-funding-comparison", "Going Deeper", 2))).toBe(365);
    expect(getRefreshCadenceDays(articleFor("franchise-investment-by-category", "Going Deeper", 2))).toBe(365);
  });

  it("leaves the non-financing Going Deeper cadence at 730", () => {
    expect(getRefreshCadenceDays(articleFor("how-to-read-an-fdd", "Going Deeper", 2))).toBe(730);
  });

  it("still never refreshes a strategic slug, whatever its category says", () => {
    expect(getRefreshCadenceDays(articleFor("are-you-ready-to-own-a-franchise", "Industry Spotlights", 3))).toBeNull();
  });
});

// ─── The authoring-time gate ────────────────────────────────────────────────

describe("aeo-audit fails the push on a slug that contradicts its filename", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "slug-identity-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function article(fields: Record<string, string>): string {
    const lines = [
      "---",
      ...Object.entries(fields).map(([k, v]) => `${k}: "${v}"`),
      `excerpt: "${"x".repeat(155)}"`,
      "relatedSlugs:",
      '  - "other-0"',
      "faqs:",
      '  - q: "Question?"',
      '    a: "Answer."',
      "---",
      "",
      "## What is this?\n\nBody text.\n",
    ];
    return lines.join("\n");
  }

  function repo() {
    const articlesDir = join(dir, "articles");
    const appDir = join(dir, "app");
    const dataDir = join(dir, "data");
    const codeDir = join(dir, "code");
    for (const d of [articlesDir, appDir, dataDir, codeDir]) mkdirSync(d, { recursive: true });
    return { articlesDir, appDir, dataDir, codeDirs: [codeDir] };
  }

  it("reports the mismatch, naming both sides", () => {
    const row = auditArticle(article({ slug: "renamed-guide", title: "Guide" }), "guide.md");

    expect(row.slugMismatch).toEqual({
      file: "content/articles/guide.md",
      frontmatter: "renamed-guide",
      filename: "guide",
    });
  });

  it("reports nothing when the two agree", () => {
    expect(auditArticle(article({ slug: "guide", title: "Guide" }), "guide.md").slugMismatch).toBeNull();
  });

  it("reports nothing when the slug field is absent", () => {
    expect(auditArticle(article({ title: "Guide" }), "guide.md").slugMismatch).toBeNull();
  });

  it("turns the mismatch into an actual FAILURE, not just a printed line", () => {
    // The bug class aeo-audit.test.ts was written to prevent: a checker that measures something,
    // prints it, and still exits green. The failure list is what .githooks/pre-push blocks on.
    const dirs = repo();
    writeFileSync(join(dirs.articlesDir, "guide.md"), article({ slug: "renamed-guide", title: "Guide" }));

    const result = auditAll(dirs);

    expect(result.slugMismatches).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("contradicts the filename");
  });

  it("passes a clean article, so the gate is not failing everything indiscriminately", () => {
    const dirs = repo();
    writeFileSync(join(dirs.articlesDir, "guide.md"), article({ slug: "guide", title: "Guide" }));

    const result = auditAll(dirs);

    // Load-bearing: it EXAMINED an article and found this specific problem absent. Asserting only
    // "no slug failure" would also pass if the audit had scanned nothing at all.
    expect(result.rows).toHaveLength(1);
    expect(result.slugMismatches).toEqual([]);
    expect(result.failures.join(" ")).not.toContain("contradicts the filename");
  });
});
