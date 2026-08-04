import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import matter from "gray-matter";

import { addUtcDays, validateFrontmatterDates } from "@/lib/frontmatterDates.mjs";

/**
 * The OTHER way an article reaches production.
 *
 * tests/unit/verify-dates.test.ts covers the corpus on disk, which is gated by .githooks/pre-push.
 * This file covers the path that hook cannot see: the monthly AI content refresh, which hands model
 * output to src/lib/githubArticleCommit.ts and reaches `main` by PATCHing the branch ref through
 * the GitHub API. No local git is involved, so no hook runs, and CI only ever reports after the
 * commit already exists.
 *
 * That path is closed twice over, and both halves are tested here:
 *
 *   1. serializeArticle STAMPS both dates, so no model-authored date value survives into the file.
 *      This is the part that actually closes it. The stamping tests are the ones that go red if
 *      somebody restores the passthrough.
 *   2. commitRefreshedArticles validates the serialized bytes before it creates a blob or advances
 *      the ref, against the same rules the pre-push hook applies to hand-written articles.
 *
 * Because (1) works, (2) cannot fire through the public API — which is the point of a backstop, and
 * also why the fail-closed test at the bottom forces the branch rather than waiting for an input
 * that can never arrive. See the comment there.
 *
 * These tests drive the REAL serializeArticle rather than hand-written fixture strings wherever the
 * question is "what gets committed", because the whole class of bug here lives in the gap between
 * the frontmatter object and the bytes gray-matter emits from it.
 */

// A day far enough in the past that these tests keep the same meaning as the clock moves.
const TODAY = "2026-08-04";
const BODY = "Refreshed body copy.\n";

/** Frontmatter shaped like what `matter(modelOutput).data` produces, cast the same way the pipeline casts it. */
function modelFrontmatter(extra: Record<string, unknown> = {}) {
  return {
    title: "How Franchise Financing Works",
    slug: "how-franchise-financing-works",
    date: "2026-01-15",
    category: "Getting Started",
    tier: 1,
    excerpt: "An excerpt.",
    relatedSlugs: [],
    ...extra,
  } as never;
}

describe("serializeArticle: both dates are stamped, never taken from the model", () => {
  it.each([
    ["a future date", { updatedAt: "9999-12-31" }],
    ["an impossible day", { updatedAt: "2026-02-30" }],
    // What the model actually produces when it writes an UNQUOTED date in its own markdown:
    // matter() has already resolved it to a Date (and already rolled it over) at the point the
    // refresh reads it, so this is the realistic shape, not a contrived one.
    ["a rolled-over Date object", { updatedAt: new Date("2026-02-30") }],
    ["no updatedAt at all", {}],
  ])("overwrites %s with today", async (_label, extra) => {
    const { serializeArticle } = await import("@/lib/githubArticleCommit");
    const content = serializeArticle(modelFrontmatter(extra), BODY, TODAY);

    expect(content).toContain(`date: '${TODAY}'`);
    expect(content).toContain(`updatedAt: '${TODAY}'`);
    // Quoted, not bare: an unquoted emission would be re-resolved to a Date by js-yaml on the way
    // back in, which is the corruption this whole area exists to prevent.
    expect(content).not.toMatch(/^updatedAt: [^'"]/m);
    // The stamp is the only date in the file — no stale second copy left behind.
    expect(content.match(/^updatedAt:/gm)).toHaveLength(1);
  });

  it("preserves the rest of the model's frontmatter", async () => {
    const { serializeArticle } = await import("@/lib/githubArticleCommit");
    const content = serializeArticle(modelFrontmatter({ updatedAt: "9999-12-31" }), BODY, TODAY);
    const { data, content: body } = matter(content);

    expect(data.title).toBe("How Franchise Financing Works");
    expect(data.excerpt).toBe("An excerpt.");
    expect(data.tier).toBe(1);
    expect(body.trim()).toBe(BODY.trim());
  });

  it("defaults to the current UTC day when no day is passed", async () => {
    const { serializeArticle } = await import("@/lib/githubArticleCommit");
    const content = serializeArticle(modelFrontmatter(), BODY);
    expect(content).toContain(`date: '${new Date().toISOString().slice(0, 10)}'`);
  });
});

describe("validateArticlePayload: what the boundary checks", () => {
  it("passes a stamped article and returns the exact bytes that will be committed", async () => {
    const { validateArticlePayload, serializeArticle } = await import("@/lib/githubArticleCommit");
    const article = { slug: "alpha", frontmatter: modelFrontmatter(), body: BODY };

    const { errors, content } = validateArticlePayload(article, { today: TODAY });

    expect(errors).toEqual([]);
    expect(content).toBe(serializeArticle(article.frontmatter, article.body, TODAY));
  });

  it("names the article and its provenance, so the summary email is actionable", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const article = { slug: "alpha", frontmatter: modelFrontmatter(), body: BODY };

    // Nothing is wrong with this payload, so assert on the label the guard WOULD use by running
    // the same rules against content that is wrong in the one way stamping cannot reach.
    const { content } = validateArticlePayload(article, { today: TODAY });
    const broken = content.replace(`date: '${TODAY}'`, `date: '2026-02-30'`);
    const { errors } = validateFrontmatterDates(broken, {
      label: `content/articles/${article.slug}.md (automated content refresh)`,
      today: TODAY,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("alpha.md");
    expect(errors[0]).toContain("automated content refresh");
  });
});

/**
 * The rules, applied to serialized bytes rather than a file on disk.
 *
 * Every fixture here is produced by matter.stringify, the same call serializeArticle makes, so
 * these assert against what gray-matter really emits rather than against a guess about it.
 */
describe("the rules the commit boundary applies", () => {
  const serialize = (fm: Record<string, unknown>) => matter.stringify(BODY, fm);
  const check = (fm: Record<string, unknown>, today = TODAY) =>
    validateFrontmatterDates(serialize(fm), { label: "alpha.md", today });

  it("accepts a well-formed pair and counts both dates", () => {
    const { errors, checked } = check({ date: "2026-01-15", updatedAt: TODAY });
    expect(errors).toEqual([]);
    expect(checked).toBe(2);
  });

  it("rejects an impossible day", () => {
    const { errors, checked } = check({ date: "2026-01-15", updatedAt: "2026-02-30" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a real calendar day");
    expect(checked).toBe(2);
  });

  it("rejects a Date, which gray-matter emits UNQUOTED as an ISO timestamp", () => {
    const content = serialize({ date: "2026-01-15", updatedAt: new Date("2026-02-30") });
    // Prove the premise rather than assuming it: this is what the bytes actually look like.
    expect(content).toContain("updatedAt: 2026-03-02T00:00:00.000Z");

    const { errors } = validateFrontmatterDates(content, { label: "alpha.md", today: TODAY });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("UNQUOTED");
  });

  it("rejects a future date", () => {
    const { errors } = check({ date: "2026-01-15", updatedAt: "9999-12-31" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("FUTURE");
    expect(errors[0]).toContain("sitemap lastModified");
  });

  it("rejects updatedAt earlier than date", () => {
    const { errors } = check({ date: "2026-08-04", updatedAt: "2025-01-01" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("EARLIER");
  });

  it("allows exactly one day of slack and no more", () => {
    // The slack exists for the UTC/Mountain gap: an evening edit on the 4th is already the 5th in
    // UTC. Two days ahead is not clock skew, it is a wrong date.
    expect(check({ date: "2026-01-15", updatedAt: addUtcDays(TODAY, 1) }).errors).toEqual([]);
    expect(check({ date: "2026-01-15", updatedAt: addUtcDays(TODAY, 2) }).errors).toHaveLength(1);
    expect(check({ date: addUtcDays(TODAY, 2) }).errors[0]).toContain("FUTURE");
  });

  it("still requires date, and still refuses to report a pass having checked nothing", () => {
    const { errors, checked } = check({ title: "T" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("REQUIRED");
    expect(checked).toBe(0);
  });

  it("rejects the tolerance boundary from the far side of the year", () => {
    const { errors } = check({ date: "2026-12-31", updatedAt: "2027-01-01" }, "2026-12-30");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("FUTURE");
  });
});

/**
 * The regression, reproduced.
 *
 * This is what serializeArticle did before this change: stamp `date`, pass `updatedAt` through from
 * model output untouched. The article below is exactly what would have been committed to `main`,
 * and the assertion is that today's rules catch it. If the stamping is ever removed, the guard in
 * commitRefreshedArticles is what stands between this and production.
 */
describe("the historical bug", () => {
  it("would have shipped a model-authored impossible day, and is now caught", () => {
    const preFix = matter.stringify(BODY, { ...(modelFrontmatter({ updatedAt: "2026-02-30" }) as object), date: TODAY });
    const { errors } = validateFrontmatterDates(preFix, { label: "alpha.md", today: TODAY });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a real calendar day");
  });
});

describe("commitRefreshedArticles: nothing is written when validation fails", () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = "Franscale1922";
    process.env.GITHUB_REPO_NAME = "waypoint-core-system";
    process.env.GITHUB_BRANCH = "main";

    // Minimal Git Data API: ref -> commit -> blob -> tree -> commit -> ref PATCH.
    fetchMock = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({ object: { sha: "refsha" }, tree: { sha: "treesha" }, sha: "newsha" }),
        text: async () => "",
      }) as unknown as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("@/lib/frontmatterDates.mjs");
  });

  it("commits the exact bytes it validated", async () => {
    const { commitRefreshedArticles, serializeArticle } = await import("@/lib/githubArticleCommit");
    const article = { slug: "alpha", frontmatter: modelFrontmatter(), body: BODY };

    await commitRefreshedArticles([article]);

    const blobCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/git/blobs"));
    expect(blobCall).toBeDefined();
    const sent = Buffer.from(JSON.parse(blobCall![1].body).content, "base64").toString("utf-8");
    // The committed content is the validated content, not a second serialization of it. A
    // re-serialize would be indistinguishable here on most days and wrong on exactly one: the run
    // that crosses midnight.
    expect(sent).toBe(serializeArticle(article.frontmatter, article.body));

    // And the ref really was advanced, so the negative assertion below means something.
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true);
  });

  /**
   * The stamping in serializeArticle means no payload reaching this function can fail validation,
   * so this branch cannot be triggered through the public API. That is the intended state, not a
   * gap in the test: a backstop you can reach from outside is not a backstop.
   *
   * Forcing the validator is therefore the only honest way to prove the branch behaves. What is
   * being asserted is the consequence that actually matters and cannot be read off the source with
   * confidence: that the refusal happens BEFORE any network call, so a rejected batch leaves no
   * blobs behind and never advances the ref.
   */
  it("throws before issuing a single request when the validator objects", async () => {
    vi.doMock("@/lib/frontmatterDates.mjs", async () => {
      const actual = await vi.importActual<Record<string, unknown>>("@/lib/frontmatterDates.mjs");
      return {
        ...actual,
        validateFrontmatterDates: () => ({
          errors: ['alpha.md: "updatedAt" is not a real calendar day.'],
          checked: 1,
        }),
      };
    });

    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const article = { slug: "alpha", frontmatter: modelFrontmatter(), body: BODY };

    await expect(commitRefreshedArticles([article])).rejects.toThrow(/not a real calendar day/);
    await expect(commitRefreshedArticles([article])).rejects.toThrow(/main was not\s+advanced/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports every bad article in the batch, not just the first", async () => {
    vi.doMock("@/lib/frontmatterDates.mjs", async () => {
      const actual = await vi.importActual<Record<string, unknown>>("@/lib/frontmatterDates.mjs");
      let call = 0;
      return {
        ...actual,
        validateFrontmatterDates: () => ({ errors: [`problem ${++call}`], checked: 1 }),
      };
    });

    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = ["alpha", "beta", "gamma"].map((slug) => ({
      slug,
      frontmatter: modelFrontmatter(),
      body: BODY,
    }));

    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/3 frontmatter date problem/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
