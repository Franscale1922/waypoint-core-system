import { describe, it, expect, beforeEach, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

import { DEFAULT_ARTICLES_DIR } from "../../scripts/verify-dates.mjs";
import { createFakeGitHub, useGitHubEnv, type FakeGitHub } from "./helpers/fake-github";

/**
 * WHERE the AI content refresh writes, as opposed to what it writes.
 *
 * tests/unit/write-path-dates.test.ts covers the bytes. This file covers the destination, which is
 * the other half of the same commit and was unconstrained: `commitRefreshedArticles` built a tree
 * entry as `content/articles/${slug}.md` straight from the payload, then committed that tree by
 * PATCHing the branch ref, which defaults to `main`. A slug carrying `../` or a `/` would have
 * placed the blob somewhere else in the repository, and nothing after this point re-checks a path
 * that GitHub has already accepted into a tree.
 *
 * Scope this honestly: the slug is NOT model output. src/inngest/functions.ts derives each payload
 * slug from the source file's own path on disk and discards the model's slug first, so the value
 * reaching here is the basename of an article already committed to this repository. These are
 * guards at a boundary that writes to production `main`, not a live hole being closed.
 *
 * The load-bearing assertion throughout is the one the dates file established: when validation
 * objects, `fetch` is never called. That is what "no blob was created and the ref was not
 * advanced" actually means, and it cannot be read off the source with confidence.
 */

const BODY = "Refreshed body copy.\n";
const VALID_SLUG = "how-franchise-financing-works";

/**
 * A complete article apart from its slug.
 *
 * Every required non-date field is present on purpose (src/lib/frontmatterFields.mjs,
 * tests/unit/write-path-fields.test.ts). validateArticlePayload reports field problems alongside
 * slug problems, so a fixture missing `faqs` would fail these tests with an extra error that has
 * nothing to do with the destination, and the counts below would stop meaning what they say.
 */
const BASE_FRONTMATTER = {
  title: "How Franchise Financing Works",
  date: "2026-01-15",
  updatedAt: "2026-01-15",
  category: "Getting Started",
  tier: 1,
  excerpt: "An excerpt.",
  relatedSlugs: [],
  faqs: [{ q: "Does this fixture publish an FAQ?", a: "Yes, and it has to." }],
};

/** The two slugs travel separately in one payload, so the fixture sets them separately. */
function payload(slug: unknown, frontmatterSlug: unknown = slug) {
  return { slug, frontmatter: { ...BASE_FRONTMATTER, slug: frontmatterSlug }, body: BODY } as never;
}

/**
 * An article carrying no `slug:`, in the two shapes that actually occur.
 *
 * `omitted` is what gray-matter produces when reading such a file. `undefinedValue` is what the
 * refresh then builds from it: src/inngest/functions.ts assigns
 * `newFrontmatter.slug = article.frontmatter.slug` unconditionally, which writes the key with an
 * explicit `undefined`. That second shape is the one that reaches the commit boundary in
 * production, and it is the one js-yaml refuses to dump, so it must be validated before any
 * serialization happens. Testing only the first shape would miss exactly that.
 */
const noFrontmatterSlug = {
  omitted: (slug: string) => ({ slug, frontmatter: { ...BASE_FRONTMATTER }, body: BODY } as never),
  undefinedValue: (slug: string) =>
    ({ slug, frontmatter: { ...BASE_FRONTMATTER, slug: undefined }, body: BODY }) as never,
};

/**
 * Values that must never become a path.
 *
 * The first five are the ones that actually matter: each would write a blob outside
 * content/articles/, and the first would overwrite a CI workflow, which is the gate that would
 * otherwise catch the commit afterwards.
 */
const REJECTED: [label: string, slug: string][] = [
  ["parent-directory traversal", "../../.github/workflows/verify-links"],
  ["a bare parent reference", ".."],
  ["a nested path", "guides/financing"],
  ["an absolute path", "/etc/passwd"],
  ["a backslash path", "..\\..\\evil"],
  ["a dot, which changes the extension", "financing.md"],
  ["a percent-encoded traversal", "%2e%2e%2fevil"],
  ["a null byte", "financing\u0000.md"],
  ["a newline", "financing\nevil"],
  ["a leading space", " financing"],
  // Terminal line terminators, spelled out because the answer depends on the language rather than
  // on the pattern. JavaScript's `$` without the `m` flag is a strict end-of-input assertion, so
  // these are already rejected; in Python or PCRE the same source text would accept a trailing
  // newline and commit `content/articles/financing\n.md`. Anyone porting this pattern needs these
  // cases to keep failing.
  ["a trailing newline", "financing\n"],
  ["a trailing carriage return", "financing\r"],
  ["a trailing CRLF", "financing\r\n"],
  ["a trailing U+2028 line separator", "financing\u2028"],
  ["a trailing U+2029 paragraph separator", "financing\u2029"],
  ["uppercase", "How-Franchise-Financing-Works"],
  ["the empty string", ""],
  ["a leading hyphen", "-financing"],
  ["a trailing hyphen", "financing-"],
  ["a doubled hyphen", "franchise--financing"],
  ["an underscore", "franchise_financing"],
];

describe("the slug format, applied to the payload slug", () => {
  it("accepts a well-formed slug", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    expect(validateArticlePayload(payload(VALID_SLUG)).errors).toEqual([]);
  });

  it.each(REJECTED)("rejects %s", async (_label, slug) => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    // Only the payload slug is bad, so the frontmatter slug cannot be what fails this.
    const { errors } = validateArticlePayload(payload(slug, VALID_SLUG));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("payload slug");
  });

  it("rejects a slug longer than the limit, and accepts one at it", async () => {
    const { validateArticlePayload, SLUG_MAX_LENGTH } = await import("@/lib/githubArticleCommit");

    const atLimit = "a".repeat(SLUG_MAX_LENGTH);
    expect(validateArticlePayload(payload(atLimit)).errors).toEqual([]);

    const overLimit = "a".repeat(SLUG_MAX_LENGTH + 1);
    const { errors } = validateArticlePayload(payload(overLimit, VALID_SLUG));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`over the ${SLUG_MAX_LENGTH}-character limit`);
  });

  it("caps the rejected value in the message, so a hostile slug cannot flood the log", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(payload(`../${"a".repeat(5000)}`, VALID_SLUG));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("[truncated]");
    expect(errors[0].length).toBeLessThan(600);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a number", 42],
    ["an object", {}],
  ])("rejects %s rather than coercing it into a path", async (_label, slug) => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(payload(slug, VALID_SLUG));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("must be a string");
  });
});

describe("the slug format, applied to the frontmatter slug", () => {
  it.each(REJECTED)("rejects %s", async (_label, slug) => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(payload(VALID_SLUG, slug));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("frontmatter slug");
  });

  /**
   * The realistic shape of this one: the payload slug is the filename, which always exists, while
   * an article with no `slug:` has nothing to put in the frontmatter half. Such an article is
   * dropped from the refresh and reported, rather than committed to a guessed path.
   */
  it.each([
    ["the key omitted, as gray-matter reads it", noFrontmatterSlug.omitted],
    ["an explicit undefined, as the refresh assigns it", noFrontmatterSlug.undefinedValue],
  ])("rejects an article whose frontmatter carries no slug: %s", async (_label, build) => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(build(VALID_SLUG));

    // Asserted by presence rather than by count, because the two shapes legitimately differ: the
    // explicit-undefined one ALSO fails to serialize, and reports both problems rather than making
    // a maintainer fix one, wait a month, and discover the other.
    expect(errors.some((e) => /frontmatter slug must be a string/.test(e))).toBe(true);
  });

  /**
   * A payload can be wrong in both ways at once, and both have to survive the report.
   *
   * js-yaml refuses to dump an explicit `undefined` ("unacceptable kind of an object to dump"), so
   * this article fails to serialize AND names no destination. The serialization failure is caught
   * so the throw cannot escape the per-article Inngest step and take the whole monthly run with it
   * (see validateArticlePayload). The risk that creates is the slug problem being swallowed by the
   * early return on the way out, which would mean fixing the frontmatter next month only to
   * discover the slug problem the month after.
   */
  it("reports the slug problem even when the same payload also fails to serialize", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const build = () => validateArticlePayload(noFrontmatterSlug.undefinedValue(VALID_SLUG));

    expect(build).not.toThrow();
    const { errors, content } = build();

    expect(errors.some((e) => /frontmatter slug must be a string/.test(e))).toBe(true);
    expect(errors.some((e) => /could not be serialized/.test(e))).toBe(true);
    // No bytes, because nothing was serialized.
    expect(content).toBe("");
  });
});

describe("the two slugs must agree", () => {
  it("rejects a payload that would overwrite a different article's file", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(payload("franchise-costs", "franchise-financing"));

    expect(errors).toHaveLength(1);
    // Both values named, because the fix depends on knowing which one is wrong.
    expect(errors[0]).toContain("franchise-costs");
    expect(errors[0]).toContain("franchise-financing");
  });

  it("reports the malformed value alone when one of them is also malformed", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const { errors } = validateArticlePayload(payload("../evil", VALID_SLUG));

    // A mismatch complaint stacked on top of a traversal is noise: they cannot be meaningfully
    // compared until the malformed one is fixed.
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a valid article slug");
  });
});

describe("commitRefreshedArticles: nothing is written when the destination is wrong", () => {
  useGitHubEnv();

  let gh: FakeGitHub;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // The same stateful fake tests/unit/write-path-dates.test.ts drives, rather than a second flat
    // stub. A flat stub answers every endpoint with one shape, which is not merely imprecise: the
    // batch-identity lookup reads `/commits` as an ARRAY, so a stub returning an object fails as a
    // TypeError inside production code rather than as an honest assertion.
    gh = createFakeGitHub();
    fetchMock = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", fetchMock);
  });

  /**
   * The positive control, first, so every "not called" assertion below means something. Without it
   * they would all pass against a function that never calls fetch at all.
   */
  it("commits a valid batch to exactly the paths the slugs name", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await commitRefreshedArticles([payload("franchise-costs"), payload("franchise-financing")]);

    const treeCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/git/trees"));
    expect(treeCall).toBeDefined();
    const tree = JSON.parse(treeCall![1].body).tree as { path: string }[];
    expect(tree.map((entry) => entry.path)).toEqual([
      "content/articles/franchise-costs.md",
      "content/articles/franchise-financing.md",
    ]);

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true);
  });

  it("refuses a traversal slug before issuing a single request", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("../../.github/workflows/verify-links", VALID_SLUG)];

    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/not a valid article slug/);
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/main was not advanced/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * The same regression, at the boundary that actually writes.
   *
   * The distinction being asserted is which error comes back: a YAMLException here would mean the
   * payload blew up during serialization instead of being refused by the guard, which is how this
   * article used to take the entire batch down with it.
   */
  it("refuses an unserializable frontmatter slug as a validation error, not a crash", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [noFrontmatterSlug.undefinedValue(VALID_SLUG)];

    // The distinction is which error comes back. A raw YAMLException escaping the boundary is how
    // this article used to take the whole batch down; the guard's own refusal, counting the
    // problems and naming the branch it did not touch, is the shape that gets reported and
    // recovered from. The js-yaml text appears INSIDE that refusal as detail, which is why the
    // assertion is on the refusal's structure rather than on the absence of the phrase.
    const error = await commitRefreshedArticles(batch).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(/Refusing to commit \d+ problem\(s\)/);
    expect(message).toMatch(/frontmatter slug must be a string/);
    expect(message).toMatch(/main was not advanced/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a slug that disagrees with its frontmatter before issuing a single request", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("franchise-costs", "franchise-financing")];

    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/does not match the frontmatter/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * The batch property, which no per-article check can see.
   *
   * A tree cannot carry two entries for one path: GitHub keeps whichever is listed last and drops
   * the other, with a successful commit and nothing to indicate an article was discarded.
   */
  it("refuses two payloads that resolve to the same file", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("franchise-costs"), payload("franchise-costs")];

    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/duplicate destination/);
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(
      /content\/articles\/franchise-costs\.md claimed by 2 payloads/,
    );
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/main was not advanced/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still commits a batch whose slugs merely share a prefix", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    // The collision check keys on the resolved path, so near-misses must not be caught by it.
    await commitRefreshedArticles([payload("franchise-costs"), payload("franchise-costs-2026")]);

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true);
  });

  it("names every bad destination in the batch, not just the first", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [
      payload("../evil", VALID_SLUG),
      payload("also/bad", VALID_SLUG),
      payload("franchise-costs"),
    ];

    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/2 problem\(s\)/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * The corpus, checked against the enforced format.
 *
 * This is what keeps the guard and the articles from drifting apart. The format was confirmed
 * against all 45 articles before it was enforced; without this test, article 46 could be authored
 * with a slug the refresh silently refuses, and the failure would surface months later as a
 * dropped article in a monthly summary email rather than here.
 *
 * It asserts a COUNT as well as the per-file rules, because this repo has already shipped a guard
 * that checked zero files and printed a green pass for months (see tests/unit/verify-links.test.ts).
 */
describe("every article on disk satisfies the format the write path enforces", () => {
  const files = readdirSync(DEFAULT_ARTICLES_DIR).filter((f) => f.endsWith(".md"));

  it("found articles to check", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)("%s", async (file) => {
    const { SLUG_PATTERN, SLUG_MAX_LENGTH } = await import("@/lib/githubArticleCommit");
    const stem = file.replace(/\.md$/, "");
    const { data } = matter(readFileSync(join(DEFAULT_ARTICLES_DIR, file), "utf-8"));

    expect(stem).toMatch(SLUG_PATTERN);
    expect(stem.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    // The frontmatter slug is what the payload carries and what the guard compares against, so it
    // has to satisfy the same rule and agree with the filename. getAllArticles falls back to the
    // filename when `slug:` is absent, which would reach the guard as a mismatch.
    expect(typeof data.slug).toBe("string");
    expect(data.slug).toBe(stem);
  });

  it("has no two articles claiming one destination", () => {
    const slugs = files.map((f) => f.replace(/\.md$/, ""));
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
