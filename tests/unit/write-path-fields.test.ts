import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import matter from "gray-matter";

import {
  EXCERPT_MAX,
  EXCERPT_MIN,
  TITLE_BUDGET,
  classifyExcerpt,
  classifyFaqs,
  classifyTitle,
  hardCodesBrand,
  validateRequiredFields,
} from "@/lib/frontmatterFields.mjs";
import { validFaqEntries } from "@/app/lib/structured-data";
import * as aeoAudit from "../../scripts/aeo-audit.mjs";

/**
 * The required NON-DATE frontmatter fields, on the AI content-refresh write path.
 *
 * tests/unit/write-path-dates.test.ts is the sibling covering dates on this same path. The split is
 * not cosmetic: the two halves of validateArticlePayload are different KINDS of check, and merging
 * these tests into that file would blur the distinction that keeps this one from being deleted as
 * redundant.
 *
 * Dates are STAMPED by serializeArticle, so no model-authored date survives and the date validator
 * is a backstop that cannot fire through the public API. Its fail-closed test has to force the
 * validator to prove the branch works at all.
 *
 * These fields are the opposite. Nothing stamps `title`, `excerpt` or `faqs`: src/inngest/
 * functions.ts pins slug, category, tier and relatedSlugs back to the original article and takes
 * these three from model output verbatim. So every test below drives the REAL public API with a
 * realistic bad payload, and the batch-level test proves the refusal with no mocking of the
 * validator whatsoever. That is a strictly stronger guarantee than the date file can offer, and it
 * is the reason this path needed a runtime check rather than the TypeScript cast in
 * src/lib/articles.ts, which is a compile-time claim over unvalidated markdown.
 */

const TODAY = "2026-08-04";
const BODY = "Refreshed body copy.\n";
/** Blob SHA these fixtures claim to be based on; the mocked tree reports the same. */
const BASE_SHA = "a".repeat(40);

/** Exactly 160 characters: the last excerpt length that is allowed through. */
const EXCERPT_AT_LIMIT = "x".repeat(EXCERPT_MAX);

/** A valid article as the pipeline would hand it to the commit boundary. */
function validFrontmatter(extra: Record<string, unknown> = {}) {
  return {
    title: "How Franchise Financing Works",
    slug: "how-franchise-financing-works",
    date: "2026-01-15",
    category: "Getting Started",
    tier: 1,
    excerpt: "An excerpt that is short but perfectly legal.",
    relatedSlugs: [],
    faqs: [{ q: "Is this a question?", a: "It is." }],
    ...extra,
  } as never;
}

/**
 * A valid article with one field genuinely ABSENT.
 *
 * Not `{ ...valid, title: undefined }`, which is a different thing and a trap: that creates an own
 * property holding undefined, and js-yaml refuses to dump one ("unacceptable kind of an object to
 * dump"), so the fixture would throw in serialization and never reach the rules under test. A model
 * that omits a field omits the key. The explicit-undefined shape is real too, but it comes from
 * elsewhere and is tested on its own below.
 */
function withoutField(field: string) {
  const fm = { ...(validFrontmatter() as object) } as Record<string, unknown>;
  delete fm[field];
  return fm as never;
}

/** Run the shared rules over the bytes matter.stringify really emits, never a hand-written string. */
const check = (fm: Record<string, unknown>) =>
  validateRequiredFields(matter.stringify(BODY, fm), { label: "alpha.md" });

// ─── The classifiers ─────────────────────────────────────────────────────────

describe("classifyTitle", () => {
  it.each([
    ["missing", undefined],
    ["not-a-string", 2026],
    ["not-a-string", new Date("2026-01-01")],
    ["empty", "   "],
    ["brand", "Why Waypoint Works"],
    // The brand test is a whole-word match in both directions, and both directions were once wrong.
    ["brand", "WHY WAYPOINT WORKS"],
    ["ok", "Waypointing Through Franchise Ownership"],
    ["ok", "How Franchise Financing Works"],
  ])("classifies %s", (kind, value) => {
    expect(classifyTitle(value).kind).toBe(kind);
  });

  it("reports the rendered length including the brand suffix, and does not fail on it", () => {
    // The 60-character budget is an ADVISORY that CONTENT-STANDARDS Section 14 says must not become
    // a gate. This asserts the classifier measures it and that nothing here treats it as an error.
    const long = "A".repeat(200);
    expect(classifyTitle(long)).toEqual({ kind: "ok", rendered: 200 + " | Waypoint".length });
    expect(check({ ...(validFrontmatter() as object), title: long }).errors).toEqual([]);
  });
});

/**
 * Blankness that `trim()` cannot see.
 *
 * Every character below is written as a \u escape, never literally: a literal U+2028 in a source
 * file is a line terminator to the JS parser and breaks the file outright, and the rest are
 * invisible in an editor and so unreviewable. The module under test writes its own pattern the same
 * way for the same reason.
 */
describe("invisible characters are not content", () => {
  const ZWSP = "\u200b";

  it.each([
    ["a single zero-width space", ZWSP],
    ["a byte-order mark", "\ufeff"],
    ["a soft hyphen", "\u00ad"],
    ["a line separator", "\u2028"],
    ["a paragraph separator", "\u2029"],
    ["a word joiner", "\u2060"],
    ["a right-to-left mark", "\u200f"],
    ["an Arabic letter mark", "\u061c"],
    ["a left-to-right override", "\u202d"],
    ["ordinary spaces, which trim() already caught", "   "],
  ])("treats a title of %s as empty", (_label, value) => {
    expect(classifyTitle(value).kind).toBe("empty");
  });

  it("still accepts a title that merely starts with one", () => {
    expect(classifyTitle(`${ZWSP}A Real Title`).kind).toBe("ok");
  });

  it("treats an excerpt of 150 zero-width spaces as empty, not as a valid 150-char excerpt", () => {
    // The exact hole: the length check alone would measure 150 and call this perfectly sized, and
    // the page would ship a blank meta description and a blank JSON-LD description.
    expect(classifyExcerpt(ZWSP.repeat(150))).toEqual({ kind: "empty", length: 150 });
  });

  it("reports an over-length run of them as empty rather than as too long", () => {
    // "You wrote nothing" is the actionable message; "your excerpt is too long" is not.
    expect(classifyExcerpt(ZWSP.repeat(200)).kind).toBe("empty");
  });

  it("measures LENGTH on the raw string, because the raw string is what ships", () => {
    // Emptiness ignores invisibles; length must not. A visible excerpt padded past the cap is
    // still over the cap.
    expect(classifyExcerpt(`${ZWSP.repeat(20)}${"x".repeat(EXCERPT_MAX)}`).kind).toBe("long");
  });

  it("rejects a blank title through the full write path", () => {
    const { errors } = check({ ...(validFrontmatter() as object), title: ZWSP.repeat(30) });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("present but empty");
  });
});

describe("classifyExcerpt", () => {
  it.each([
    ["missing", undefined, null],
    ["not-a-string", 42, null],
    ["empty", "", 0],
    ["empty", "   ", 3],
    ["short", "x".repeat(149), 149],
    ["ok", "x".repeat(150), 150],
    ["ok", EXCERPT_AT_LIMIT, EXCERPT_MAX],
    ["long", "x".repeat(EXCERPT_MAX + 1), EXCERPT_MAX + 1],
  ])("classifies %s", (kind, value, length) => {
    expect(classifyExcerpt(value)).toEqual({ kind, length });
  });
});

describe("classifyFaqs", () => {
  it.each([
    ["missing", undefined, 0],
    // A bare `faqs:` parses to null. It is NOT reported as absence: somebody wrote a broken block
    // rather than forgetting one, and scripts/aeo-audit.mjs has always counted it as malformed.
    ["not-a-list", null, 0],
    ["not-a-list", "three questions", 0],
    ["not-a-list", { q: "a", a: "b" }, 0],
    ["empty", [], 0],
    ["ok", [{ q: "a", a: "b" }], 1],
  ])("classifies %s", (kind, value, count) => {
    expect(classifyFaqs(value)).toEqual({ kind, count });
  });

  it("does not judge the shape of individual entries", () => {
    // Deliberate: validFaqEntries in src/app/lib/structured-data.ts owns entry shape, and
    // src/lib/articles.ts warns against a second, drifting validator. This module answers only
    // "does a block exist", which nothing else on the write path asks.
    expect(classifyFaqs([{ nonsense: true }, null, "bare string"]).kind).toBe("ok");
  });
});

/**
 * The gap a structural check alone leaves open, closed by injecting the real predicate rather than
 * reimplementing it. `faqs: [{}]` is a present, non-empty list that publishes nothing.
 */
describe("the injected FAQ entry filter", () => {
  const withFilter = (fm: Record<string, unknown>) =>
    validateRequiredFields(matter.stringify(BODY, fm), {
      label: "alpha.md",
      faqEntryFilter: (entries) =>
        validFaqEntries(entries as { q: string; a: string }[], "alpha.md"),
    });

  beforeEach(() => {
    // validFaqEntries warns on every entry it drops, which is correct in production and noise here.
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("rejects a list whose entries all get dropped at render time", () => {
    const { errors } = withFilter({ ...(validFrontmatter() as object), faqs: [{}] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("1 of 1");
    expect(errors[0]).toContain("dropped by validFaqEntries");
  });

  it.each([
    ["a stray dash that YAML parses as null", [null]],
    ["a bare string entry", ["just a question?"]],
    ["an entry missing its answer", [{ q: "Where is the answer?" }]],
    ["an entry with an empty answer", [{ q: "Question?", a: "" }]],
  ])("rejects %s", (_label, faqs) => {
    expect(withFilter({ ...(validFrontmatter() as object), faqs }).errors).toHaveLength(1);
  });

  it("rejects PARTIAL loss, which is the worse case because it looks like success", () => {
    // Three good entries and one stray dash. The article would commit, the summary email would
    // report it refreshed, and the page would quietly publish three FAQs while claiming four.
    const { errors } = withFilter({
      ...(validFrontmatter() as object),
      faqs: [
        { q: "One?", a: "Yes." },
        null,
        { q: "Two?", a: "Yes." },
        { q: "Three?", a: "Yes." },
      ],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("1 of 4");
    expect(errors[0]).toContain("publish 3 FAQs");
  });

  it("accepts a list where every entry survives untouched", () => {
    const { errors } = withFilter({
      ...(validFrontmatter() as object),
      faqs: [
        { q: "A real question?", a: "A real answer." },
        { q: "Another?", a: "Another answer." },
      ],
    });
    expect(errors).toEqual([]);
  });

  it("does NOT require four entries", () => {
    // scripts/aeo-audit.mjs reports "fewer than 4 Q" without failing a push. Promoting the prompt's
    // four-FAQ instruction to a hard gate here would make the bot path stricter than every human
    // one, which is a content-policy change and not this guard's call to make.
    expect(withFilter(validFrontmatter()).errors).toEqual([]);
  });

  it("falls back to structural checks only when no filter is injected", () => {
    // scripts/aeo-audit.mjs runs under bare node and cannot import the TypeScript predicate, so it
    // passes nothing. That must stay a supported call, not a crash.
    const { errors } = check({ ...(validFrontmatter() as object), faqs: [{}] });
    expect(errors).toEqual([]);
  });
});

// ─── The rules over serialized bytes ─────────────────────────────────────────

describe("validateRequiredFields", () => {
  it("passes a valid article and counts every field it looked at", () => {
    const { errors, checked } = check(validFrontmatter());
    expect(errors).toEqual([]);
    // The vacuous-pass tripwire. This repo has already shipped a guard that printed green for
    // months while checking zero things (scripts/verify-links.mjs).
    expect(checked).toBe(3);
  });

  it.each([
    ["title", /missing REQUIRED "title"/],
    ["excerpt", /missing REQUIRED "excerpt"/],
    ["faqs", /missing REQUIRED "faqs"/],
  ])("rejects a missing %s", (field, pattern) => {
    const { errors, checked } = check(withoutField(field));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(pattern);
    // Still looked at all three: a field failing must not stop the others being examined.
    expect(checked).toBe(3);
  });

  it("rejects an over-length excerpt at the boundary and accepts it one character below", () => {
    expect(check({ ...(validFrontmatter() as object), excerpt: EXCERPT_AT_LIMIT }).errors).toEqual([]);

    const { errors } = check({
      ...(validFrontmatter() as object),
      excerpt: "x".repeat(EXCERPT_MAX + 1),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${EXCERPT_MAX + 1} characters`);
  });

  it("does NOT reject a short excerpt, matching aeo-audit", () => {
    // Under 150 wastes snippet space and damages nothing, so aeo-audit reports it rather than
    // failing. The write path agrees on purpose; if this ever starts failing, the two gates have
    // diverged and a human push will disagree with a bot commit.
    const { errors } = check({ ...(validFrontmatter() as object), excerpt: "Tiny." });
    expect(errors).toEqual([]);
  });

  it("rejects an empty excerpt even though it is merely 'short' to aeo-audit", () => {
    const { errors } = check({ ...(validFrontmatter() as object), excerpt: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("present but empty");
  });

  it("rejects an empty faqs list, which looks correct to anything checking only for the key", () => {
    const { errors } = check({ ...(validFrontmatter() as object), faqs: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("empty list");
  });

  it("rejects a title that hard-codes the brand, which layout.tsx would then append again", () => {
    const { errors } = check({
      ...(validFrontmatter() as object),
      title: "Franchise Financing With Waypoint",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("hard-codes the brand");
  });

  it("reports every bad field at once, not just the first", () => {
    const bare = { ...(validFrontmatter() as object) } as Record<string, unknown>;
    delete bare.title;
    delete bare.excerpt;
    delete bare.faqs;

    const { errors } = check(bare);
    expect(errors).toHaveLength(3);
    expect(errors.join(" ")).toMatch(/title/);
    expect(errors.join(" ")).toMatch(/excerpt/);
    expect(errors.join(" ")).toMatch(/faqs/);
  });

  it("refuses to report a pass when the YAML cannot be parsed at all", () => {
    // A quoted duplicate key: js-yaml rejects it outright and the article would fail to load.
    const raw = '---\ntitle: "A"\n"title": "B"\n---\nbody\n';
    const { errors, checked } = validateRequiredFields(raw, { label: "alpha.md" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("REFUSES to parse");
    expect(checked).toBe(0);
  });

  it("does not throw on a value it cannot stringify", () => {
    // The validator's job is to turn bad input into a skipped article. If it throws instead, it
    // takes out the Inngest step and the monthly summary email with it.
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => classifyTitle(circular)).not.toThrow();
    const { errors } = validateRequiredFields(
      `---\ntitle: &a\n  self: *a\nexcerpt: "e"\nfaqs:\n  - q: a\n    a: b\n---\nbody\n`,
      { label: "alpha.md" },
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("names the article and its provenance, so the summary email is actionable", () => {
    const { errors } = validateRequiredFields(matter.stringify(BODY, { excerpt: "e" }), {
      label: "content/articles/alpha.md (automated content refresh)",
    });
    expect(errors[0]).toContain("alpha.md");
    expect(errors[0]).toContain("automated content refresh");
  });
});

// ─── The consequence being prevented ─────────────────────────────────────────

describe("the crash this exists to stop", () => {
  it("proves the premise: the committed bytes really do break the resources search", async () => {
    const { serializeArticle } = await import("@/lib/githubArticleCommit");
    const committed = serializeArticle(withoutField("title"), BODY, TODAY);

    // This is what src/app/components/ResourcesGrid.tsx does to every article on every keystroke
    // in the search box, with no guard: `a.title.toLowerCase()`. Asserted against the real
    // serialized bytes rather than a claim about them.
    const meta = matter(committed).data;
    expect(meta.title).toBeUndefined();
    expect(() => (meta.title as string).toLowerCase()).toThrow(TypeError);

    // And that article is now refused before it can be committed.
    expect(validateRequiredFields(committed, { label: "alpha.md" }).errors[0]).toMatch(
      /missing REQUIRED "title"/,
    );
  });
});

// ─── Integration with the commit boundary ────────────────────────────────────

describe("validateArticlePayload: dates and fields are both enforced", () => {
  it("passes a well-formed article", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(
      { slug: "alpha", frontmatter: validFrontmatter(), body: BODY },
      { today: TODAY },
    );
    expect(errors).toEqual([]);
  });

  it("reports a field failure on an article whose dates are perfectly fine", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    // Dates cannot be wrong here: serializeArticle stamps them. That is exactly the point, and it
    // is why the field half is the half that fires on real input.
    const { errors } = validateArticlePayload(
      { slug: "alpha", frontmatter: withoutField("excerpt"), body: BODY },
      { today: TODAY },
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/missing REQUIRED "excerpt"/);
  });

  it("returns the exact bytes it validated, even when it is rejecting them", async () => {
    const { validateArticlePayload, serializeArticle } = await import("@/lib/githubArticleCommit");
    const article = { slug: "alpha", frontmatter: withoutField("title"), body: BODY };
    const { errors, content } = validateArticlePayload(article, { today: TODAY });

    expect(errors).toHaveLength(1);
    expect(content).toBe(serializeArticle(article.frontmatter, article.body, TODAY));
  });
});

describe("commitRefreshedArticles: a bad field stops the batch before any network call", () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = "Franscale1922";
    process.env.GITHUB_REPO_NAME = "waypoint-core-system";
    process.env.GITHUB_BRANCH = "main";

    // Answers per endpoint. The commit path reads `GET /git/trees/{sha}?recursive=1` and iterates
    // `tree` as a LIST to compare each article's blob against the one it was generated from, so the
    // old single-shape stub (which returned `tree: { sha }` to everything) would throw inside the
    // code under test. Method disambiguates GET /git/trees/{sha} from POST /git/trees.
    fetchMock = vi.fn(async (url: unknown, init?: { method?: string }) => {
      const target = String(url);
      const method = init?.method ?? "GET";
      let body: unknown = {};

      if (method === "GET" && target.includes("/git/ref/heads/")) {
        body = { object: { sha: "refsha" } };
      } else if (method === "GET" && target.includes("/git/commits/")) {
        body = { tree: { sha: "treesha" } };
      } else if (method === "GET" && target.includes("/git/trees/")) {
        body = {
          tree: ["alpha", "beta"].map((slug) => ({
            path: `content/articles/${slug}.md`,
            sha: BASE_SHA,
            type: "blob",
          })),
          truncated: false,
        };
      } else if (target.endsWith("/git/blobs")) {
        body = { sha: "blobsha" };
      } else if (target.endsWith("/git/trees")) {
        body = { sha: "newtreesha" };
      } else if (target.endsWith("/git/commits")) {
        body = { sha: "newsha" };
      }

      return { ok: true, json: async () => body, text: async () => "" } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("commits a valid batch, so the negative assertions below mean something", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    await commitRefreshedArticles([
      { slug: "alpha", frontmatter: validFrontmatter(), body: BODY, baseBlobSha: BASE_SHA },
    ]);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true);
  });

  it.each([
    ["a missing title", () => withoutField("title")],
    ["a missing excerpt", () => withoutField("excerpt")],
    ["a missing faqs block", () => withoutField("faqs")],
    ["an over-length excerpt", () => validFrontmatter({ excerpt: "x".repeat(EXCERPT_MAX + 1) })],
    ["a brand-hardcoded title", () => validFrontmatter({ title: "Financing With Waypoint" })],
    ["an empty faqs list", () => validFrontmatter({ faqs: [] })],
    // Proves the injected filter is really wired through the public API, not just unit-tested in
    // isolation: this list is structurally valid and still publishes nothing.
    ["faqs whose entries all get dropped at render time", () => validFrontmatter({ faqs: [{}] })],
  ])("refuses the whole batch over %s, with NO validator mocked", async (_label, makeFrontmatter) => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    // The real public API, a realistic payload, and nothing stubbed but the network. Unlike the
    // date backstop, this branch is genuinely reachable from outside.
    await expect(
      commitRefreshedArticles([
        { slug: "alpha", frontmatter: validFrontmatter(), body: BODY, baseBlobSha: BASE_SHA },
        { slug: "beta", frontmatter: makeFrontmatter(), body: BODY, baseBlobSha: BASE_SHA },
      ]),
    ).rejects.toThrow(/Refusing to commit/);

    // The batch is atomic, so one bad article means the GOOD one is not written either. No blob
    // was created and main was never advanced.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("names the offending article, so the failure is traceable to a slug", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    await expect(
      commitRefreshedArticles([
        { slug: "beta", frontmatter: withoutField("faqs"), body: BODY, baseBlobSha: BASE_SHA },
      ]),
    ).rejects.toThrow(/content\/articles\/beta\.md/);
  });

  /**
   * The failure mode found while writing these tests, and the reason validateArticlePayload catches
   * its own serialization.
   *
   * js-yaml refuses to dump a key whose value is explicitly `undefined`. src/inngest/functions.ts
   * produces exactly that shape when it pins a field back from an original article that lacks it
   * (`newFrontmatter.tier = article.frontmatter.tier`). Unhandled, the throw escapes the Inngest
   * step, fails the run and suppresses the monthly summary email: a batch-wide outage from one bad
   * article, which is the precise thing the per-article skip exists to prevent.
   *
   * All 45 articles currently carry every pinned field, so this is latent rather than live. It is
   * guarded because the pinning has no check in front of it, not because it is firing today.
   */
  it("reports a frontmatter it cannot serialize instead of throwing out of the step", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const explicitlyUndefined = { ...(validFrontmatter() as object), tier: undefined } as never;

    // Prove the premise rather than assuming it: this really does throw in gray-matter.
    expect(() => matter.stringify(BODY, explicitlyUndefined)).toThrow(/unacceptable kind/);

    const { errors, content } = validateArticlePayload(
      { slug: "alpha", frontmatter: explicitlyUndefined, body: BODY },
      { today: TODAY },
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("could not be serialized");
    expect(content).toBe("");
  });
});

// ─── The no-drift guarantee ──────────────────────────────────────────────────

describe("the CLI guard and the write path share one copy of the rules", () => {
  it("re-exports the shared rules rather than equal-looking copies of them", () => {
    expect(aeoAudit.EXCERPT_MAX).toBe(EXCERPT_MAX);
    expect(aeoAudit.EXCERPT_MIN).toBe(EXCERPT_MIN);
    expect(aeoAudit.TITLE_BUDGET).toBe(TITLE_BUDGET);
    // Numbers compare equal even if somebody reintroduces a local `const EXCERPT_MAX = 160`, so a
    // value check alone cannot detect a fork. Function IDENTITY can: this fails the moment
    // aeo-audit goes back to defining its own brand test.
    expect(aeoAudit.hardCodesBrand).toBe(hardCodesBrand);
  });

  it("leaves aeo-audit's own verdicts unchanged on the cases the write path is stricter about", () => {
    // The write path rejects an empty excerpt and an absent faqs block. aeo-audit deliberately does
    // NOT, and this change must not have quietly tightened the gate that every human push runs
    // through. `faqsMalformed` is the only faq condition that fails a push, and an empty excerpt
    // reports as short.
    const article = aeoAudit.auditArticle(
      '---\ntitle: "T"\nexcerpt: ""\n---\n## A question?\n\nBody.\n',
      "sample.md",
    );
    expect(article.faqsMalformed).toBe(false);
    expect(article.faqCount).toBe(0);
    expect(article.excerptLen).toBe(0);

    // And a bare `faqs:` still counts as malformed, exactly as before.
    const bare = aeoAudit.auditArticle('---\ntitle: "T"\nfaqs:\n---\nBody.\n', "sample.md");
    expect(bare.faqsMalformed).toBe(true);
  });
});
