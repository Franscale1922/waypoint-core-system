import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import matter from "gray-matter";
import fs from "fs";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  articleIdentityMatchesFile,
  discoverArticles,
  getRefreshCadenceDays,
  type Article,
} from "@/lib/contentRefresh";
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
 * discoverArticles reads a module-level ARTICLES_DIR fixed at import time, so the two fs calls are
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

    const { articles, skipped } = discoverArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].slug).toBe("guide");
    expect(skipped).toEqual([]);
  });

  it("uses the filename when the article carries no slug field at all", () => {
    // The field is optional and stays optional. Only a contradictory value is a problem, so an
    // article that simply omits it must still be discovered and refreshed as normal.
    withArticleFiles({ "guide.md": frontmatter({ title: "Guide" }) });

    const { articles, skipped } = discoverArticles();

    expect(articles).toHaveLength(1);
    expect(articles[0].slug).toBe("guide");
    expect(skipped).toEqual([]);
  });

  it("SKIPS an article whose frontmatter slug contradicts its filename", () => {
    // The regression this file exists for. Under the old `data.slug ?? filename` derivation this
    // article was discovered with slug "renamed-guide", and the refresh committed
    // content/articles/renamed-guide.md while guide.md sat unchanged and stale.
    withArticleFiles({
      "guide.md": frontmatter({ slug: "renamed-guide", title: "Guide" }),
    });

    const { articles } = discoverArticles();

    expect(articles).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("renamed-guide");
    expect(warn.mock.calls[0][0]).toContain("guide.md");
  });

  it("REPORTS the skip as data, not only as a log line", () => {
    // A console warning inside an Inngest step is not something anyone reads. The skipped article
    // never reaches the stale list, so it cannot show up in the run's failure list on its own:
    // without this, the one article that most needs a human is the one nobody hears about.
    withArticleFiles({ "guide.md": frontmatter({ slug: "renamed-guide", title: "Guide" }) });

    const { skipped } = discoverArticles();

    expect(skipped).toHaveLength(1);
    expect(skipped[0].file).toBe("guide.md");
    expect(skipped[0].reason).toContain("renamed-guide");
  });

  it("SKIPS an article whose reviewCadence is not a cadence", () => {
    // The more dangerous of the two skips, because it fails quietly. Without this, cadence
    // inference falls back to the slug guess, the refresh pins the typo back into the committed
    // file, and the run reports a clean success: the article keeps the cadence the author wrote
    // the field to change, and re-commits the broken value so the next run repeats it.
    withArticleFiles({
      "guide.md": frontmatter({ slug: "guide", title: "Guide", reviewCadence: "stategic" }),
    });

    const { articles, skipped } = discoverArticles();

    expect(articles).toEqual([]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("stategic");
  });

  it("accepts a valid reviewCadence during discovery", () => {
    withArticleFiles({
      "guide.md": frontmatter({ slug: "guide", title: "Guide", reviewCadence: "strategic" }),
    });

    const { articles, skipped } = discoverArticles();

    expect(articles).toHaveLength(1);
    expect(skipped).toEqual([]);
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

    const { articles, skipped } = discoverArticles();

    expect(articles.map((a) => a.slug)).toEqual(["good-one", "good-two"]);
    expect(skipped.map((s) => s.file)).toEqual(["bad.md"]);
  });

  it("never returns an article whose slug disagrees with the file it was read from", () => {
    // The property that actually matters, stated directly rather than inferred from the cases
    // above: the commit path builds `content/articles/${slug}.md` out of this value, so anything
    // discoverArticles returns must round-trip to the file it came from.
    withArticleFiles({
      "alpha.md": frontmatter({ slug: "alpha", title: "Alpha" }),
      "beta.md": frontmatter({ slug: "wrong", title: "Beta" }),
      "gamma.md": frontmatter({ title: "Gamma" }),
    });

    for (const a of discoverArticles().articles) {
      expect(articleIdentityMatchesFile(a)).toBe(true);
    }
  });
});

// ─── The downstream invariant ───────────────────────────────────────────────

describe("articleIdentityMatchesFile re-checks what discovery established", () => {
  // The write path cannot assume discovery produced the article it is holding.
  // src/inngest/functions.ts loads articles inside a memoized Inngest step, so a run that started
  // before this code deployed replays the OLD cached result: an article carrying the
  // frontmatter-derived slug against its original filePath, with every check inside discovery
  // bypassed because discovery never runs again.
  const article = (slug: string, filePath: string): Article => ({
    slug,
    frontmatter: {
      title: "T",
      slug,
      date: "2020-01-01",
      category: "Going Deeper",
      tier: 2,
      excerpt: "e",
      relatedSlugs: [],
    },
    body: "",
    filePath,
  });

  it("accepts an article whose slug matches its file", () => {
    expect(articleIdentityMatchesFile(article("guide", "/content/articles/guide.md"))).toBe(true);
  });

  it("REJECTS a replayed article carrying the old frontmatter-derived slug", () => {
    expect(
      articleIdentityMatchesFile(article("renamed-guide", "/content/articles/guide.md")),
    ).toBe(false);
  });
});

// ─── Cadence precedence ─────────────────────────────────────────────────────

/** The same article, with an explicit cost cadence declared in frontmatter. */
function withDeclaredCadence(slug: string, category: string, tier: number): Article {
  const a = articleFor(slug, category, tier);
  return {
    ...a,
    frontmatter: { ...a.frontmatter, reviewCadence: "investment-and-cost" },
  };
}

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

describe("refresh cadence", () => {
  it("keeps a cost article on 365 even when its category is Industry Spotlights", () => {
    // "Cost and Operational Efficiency Franchises" is queued in CONTENT-CALENDAR.md as an Industry
    // Spotlight, and is wanted on the 365-day cost cadence: CONTENT-STANDARDS lists investment and
    // cost at 12 months, and the article will carry cost figures that go stale on that clock.
    //
    // An earlier revision of this change promoted the category above the financing keywords, on
    // the premise that a spotlight should take its category's 548. That would have delayed review
    // of precisely this article by 183 days. Financing stays ahead of the category branches, where
    // it has always been.
    expect(
      getRefreshCadenceDays(
        articleFor("cost-and-operational-efficiency-franchises", "Industry Spotlights", 3),
      ),
    ).toBe(365);
  });

  it("still gives a spotlight with no financing signal its 548-day cadence", () => {
    expect(getRefreshCadenceDays(articleFor("pilates-studio-franchises", "Industry Spotlights", 3))).toBe(548);
  });

  it("recognises an Industry Spotlight by CATEGORY as well as by tier", () => {
    // Both halves of `category === "Industry Spotlights" || tier === 3`. Reverting an intermediate
    // precedence change left only the tier half behind at one point, which dropped every spotlight
    // whose tier is not 3 to the Going Deeper or default cadence. Category and tier are 1:1 across
    // all 45 articles, so the whole-corpus comparison used to check this work is blind to it: this
    // is the assertion that is not.
    expect(getRefreshCadenceDays(articleFor("mosquito-control-franchises", "Industry Spotlights", 2))).toBe(548);
    expect(getRefreshCadenceDays(articleFor("some-spotlight", "Something Else", 3))).toBe(548);
  });

  it("matches financing keywords as slug TOKENS, not as substrings", () => {
    // `slug.includes("fee")` fires inside "coffee". On a franchise site that is not hypothetical:
    // a coffee franchise article would take the 365-day financing cadence instead of its 730-day
    // process one, purely because of three letters inside an unrelated word.
    expect(getRefreshCadenceDays(articleFor("coffee-franchise-due-diligence", "Going Deeper", 2))).toBe(730);
    // The narrowing must not cost real matches: the corpus writes these both ways.
    expect(getRefreshCadenceDays(articleFor("franchise-fees-explained", "Going Deeper", 2))).toBe(365);
    expect(getRefreshCadenceDays(articleFor("startup-costs-by-brand", "Going Deeper", 2))).toBe(365);
  });

  it("matches the singular and the plural, and NOTHING else: the contract, not an accident", () => {
    // Pinning the exact reach of the heuristic, because it has a real false-negative edge and the
    // right response is to know where it is rather than to chase it. "costing" and "financed" are
    // cost and financing copy that this does not match, where the old substring check did.
    //
    // Not fixed by stemming or by lengthening the keyword list. Substring matching over-matched
    // ("fee" in "coffee"), token matching under-matches ("cost" in "costing"), and no refinement
    // of a slug heuristic gets this right, because the signal is not in the slug: that is the
    // whole reason reviewCadence exists, and CONTENT-STANDARDS tells authors to reach for it when
    // the inference is wrong. Adding morphological forms would trade a known, documented edge for
    // an unknown one.
    expect(getRefreshCadenceDays(articleFor("franchise-cost-guide", "Going Deeper", 2))).toBe(365);
    expect(getRefreshCadenceDays(articleFor("franchise-costs-guide", "Going Deeper", 2))).toBe(365);
    // The documented gap. An author who wants 365 here declares it.
    expect(getRefreshCadenceDays(articleFor("franchise-costing-guide", "Going Deeper", 2))).toBe(730);
    expect(
      getRefreshCadenceDays(withDeclaredCadence("franchise-costing-guide", "Going Deeper", 2)),
    ).toBe(365);
  });

  it("still tokenizes a slug that is not kebab-case", () => {
    // Nothing on this path enforces kebab-case filenames, so `franchise_cost_guide.md` is
    // authorable today. Splitting on "-" alone would yield one token, match nothing, and give
    // genuinely cost-focused copy the 730-day process cadence: stricter than the substring check
    // it replaced, in the one direction that matters. The old check caught this; so must the new.
    expect(getRefreshCadenceDays(articleFor("franchise_cost_guide", "Going Deeper", 2))).toBe(365);
    expect(getRefreshCadenceDays(articleFor("Franchise-COST-Guide", "Going Deeper", 2))).toBe(365);
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

// ─── The authored override ──────────────────────────────────────────────────

describe("an authored reviewCadence overrides every inference", () => {
  function withCadence(slug: string, category: string, tier: number, reviewCadence: unknown): Article {
    const a = articleFor(slug, category, tier);
    return { ...a, frontmatter: { ...a.frontmatter, reviewCadence } as Article["frontmatter"] };
  }

  it("rescues the article no ordering of the rules can classify", () => {
    // "The Playbook Is There for a Reason: Why Improvising Early Costs You" is queued as a
    // strategic piece, and "Costs" in it is a VERB. No precedence change and no amount of
    // tokenizing separates it from a cost article, because the signal simply is not in the slug.
    // Without the override it takes the 12-month financing cadence.
    const slug = "the-playbook-is-there-for-a-reason-why-improvising-early-costs-you";
    expect(getRefreshCadenceDays(articleFor(slug, "After You Buy", 1))).toBe(365);
    expect(getRefreshCadenceDays(withCadence(slug, "After You Buy", 1, "strategic"))).toBeNull();
  });

  it("beats the hard-coded strategic slug list too", () => {
    // The list is itself an inference about a fixed set of slugs. An authored value is the only
    // signal here anybody actually decided, so it wins over that as well.
    expect(
      getRefreshCadenceDays(withCadence("are-you-ready-to-own-a-franchise", "Getting Started", 1, "process")),
    ).toBe(730);
  });

  it("maps every name in the CONTENT-STANDARDS table", () => {
    const cases: [string, number | null][] = [
      ["investment-and-cost", 365],
      ["financing", 365],
      ["category-analysis", 548],
      ["process", 730],
      ["strategic", null],
    ];
    for (const [name, days] of cases) {
      expect(getRefreshCadenceDays(withCadence("some-article", "Going Deeper", 2, name))).toBe(days);
    }
  });

  it("falls back to the inferred cadence on an unknown value rather than throwing", () => {
    // The gate rejects a bad value at push time, so this is unreachable through a pushed article.
    // Falling back keeps one typo from taking down the monthly batch, matching how every other
    // malformed input on this path behaves.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(getRefreshCadenceDays(withCadence("how-to-read-an-fdd", "Going Deeper", 2, "stategic"))).toBe(730);
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it("reaches the committed BYTES, and is still read back as a cadence", async () => {
    // The full path an override actually takes: the real merge the handler calls, then the real
    // serializer, then parsed back the way a later run parses it off disk. The bytes on main are
    // what schedules the next refresh, so asserting on the intermediate object would check
    // something adjacent to the artifact rather than the artifact.
    const { mergeRefreshedFrontmatter } = await import("@/lib/contentRefresh");
    const { serializeArticle } = await import("@/lib/githubArticleCommit");

    const original = withCadence("some-article", "Going Deeper", 2, "strategic").frontmatter;
    // What the model returns: the fields it owns, and nothing about a field it was never told of.
    const merged = mergeRefreshedFrontmatter(original, {
      title: "New title",
      excerpt: "New excerpt",
      faqs: [],
    });

    const committed = matter(serializeArticle(merged, "Body.\n", "2026-08-04"));

    expect(committed.data.reviewCadence).toBe("strategic");
    // Round-tripped, the article is still never stale. Without the override it would be 730.
    expect(
      getRefreshCadenceDays({
        slug: "some-article",
        frontmatter: committed.data as Article["frontmatter"],
        body: "",
        filePath: "/content/articles/some-article.md",
      }),
    ).toBeNull();
  });

  it("is preserved by NOT being a model-owned field, which is the whole mechanism", async () => {
    // There is no explicit pin to assert. mergeRefreshedFrontmatter starts from the original and
    // takes only MODEL_OWNED_FIELDS from the model, so preservation is the default and a field the
    // model invents is dropped. Both halves come free, and the single thing that would break them
    // is somebody adding this field to that list.
    //
    // Asserted against the real exported list rather than the source text, because that list IS
    // the contract: if reviewCadence ever appears on it, the model can rewrite an article's
    // schedule, and nothing validates this field on the write path precisely because it cannot.
    const { MODEL_OWNED_FIELDS } = await import("@/lib/contentRefresh");

    expect(MODEL_OWNED_FIELDS).not.toContain("reviewCadence");
    // The tripwire: a list that stopped naming anything would pass the assertion above vacuously.
    expect(MODEL_OWNED_FIELDS.length).toBeGreaterThan(0);
  });

  it("survives the real merge, not just the real serializer", async () => {
    // End-to-end through the actual function the handler calls, with model output that omits the
    // field (which it always will: the prompt never mentions it) and separately invents one.
    const { mergeRefreshedFrontmatter } = await import("@/lib/contentRefresh");

    const original = withCadence("some-article", "Going Deeper", 2, "strategic").frontmatter;

    const preserved = mergeRefreshedFrontmatter(original, {
      title: "New title",
      excerpt: "New excerpt",
      faqs: [],
    });
    expect(preserved.reviewCadence).toBe("strategic");

    // And on an article that never declared one, a model-invented value does not reach the commit.
    const never = articleFor("some-article", "Going Deeper", 2).frontmatter;
    const invented = mergeRefreshedFrontmatter(never, {
      title: "New title",
      excerpt: "New excerpt",
      faqs: [],
      reviewCadence: "strategic",
    });
    expect(invented.reviewCadence).toBeUndefined();
  });

  it("is not fooled by a value inherited from Object.prototype", () => {
    // `"constructor" in REVIEW_CADENCES` is true. A membership test written that way would treat
    // it as a declared cadence and return undefined as the cadence, making the article never stale.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(getRefreshCadenceDays(withCadence("how-to-read-an-fdd", "Going Deeper", 2, "constructor"))).toBe(730);
    } finally {
      warn.mockRestore();
    }
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

  it("fails the push on an unknown reviewCadence, since a typo silently reverts to the guess", () => {
    const dirs = repo();
    writeFileSync(
      join(dirs.articlesDir, "guide.md"),
      article({ slug: "guide", title: "Guide", reviewCadence: "stategic" }),
    );

    const result = auditAll(dirs);

    expect(result.cadenceErrors).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("reviewCadence");
  });

  it("accepts a valid reviewCadence, and an absent one", () => {
    const dirs = repo();
    writeFileSync(
      join(dirs.articlesDir, "a.md"),
      article({ slug: "a", title: "A", reviewCadence: "strategic" }),
    );
    writeFileSync(join(dirs.articlesDir, "b.md"), article({ slug: "b", title: "B" }));

    const result = auditAll(dirs);

    expect(result.rows).toHaveLength(2);
    expect(result.cadenceErrors).toEqual([]);
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
