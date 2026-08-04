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

/**
 * Frontmatter shaped like what `matter(modelOutput).data` produces, cast the same way the pipeline
 * casts it.
 *
 * The `faqs` block is not decoration. validateArticlePayload also enforces the required non-date
 * fields (src/lib/frontmatterFields.mjs, tests/unit/write-path-fields.test.ts), and a fixture
 * without one is not a valid article, so it would fail these date tests for an unrelated reason and
 * make them assert nothing about dates.
 */
function modelFrontmatter(extra: Record<string, unknown> = {}) {
  return {
    title: "How Franchise Financing Works",
    slug: "how-franchise-financing-works",
    date: "2026-01-15",
    category: "Getting Started",
    tier: 1,
    excerpt: "An excerpt.",
    relatedSlugs: [],
    faqs: [{ q: "Does this fixture publish an FAQ?", a: "Yes, and it has to." }],
    ...extra,
  } as never;
}

/**
 * The blob SHA every fixture article claims to have been generated from.
 *
 * The commit path refuses to overwrite a file whose blob on the branch is not the one the refresh
 * read, so a batch only commits when this matches what the mocked tree reports. Tests that want the
 * happy path use it on both sides; the conflict tests deliberately make them differ.
 */
const BASE_SHA = "a".repeat(40);

/** An article whose recorded base SHA agrees with the branch, i.e. the non-conflicting case. */
const payload = (slug: string) => ({
  slug,
  frontmatter: modelFrontmatter(),
  body: BODY,
  baseBlobSha: BASE_SHA,
});

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
    const article = payload("alpha");

    const { errors, content } = validateArticlePayload(article, { today: TODAY });

    expect(errors).toEqual([]);
    expect(content).toBe(serializeArticle(article.frontmatter, article.body, TODAY));
  });

  it("names the article and its provenance, so the summary email is actionable", async () => {
    const { validateArticlePayload } = await import("@/lib/githubArticleCommit");
    const article = payload("alpha");

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
    // The slack is for two machines disagreeing about the current day, NOT for the UTC/Mountain
    // gap, which runs the other way: Mountain lags UTC, so a local date never leads it.
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

/**
 * The encoder, tested directly.
 *
 * getConfig now rejects every branch name that actually needs encoding, so — exactly like the
 * fail-closed validator test below — this cannot be reached through the public API with the inputs
 * that matter. Driving it directly is the only honest way to show it encodes them correctly, which
 * is what keeps the URL right if that validation is ever loosened.
 */
describe("encodeRefForPath", () => {
  it.each([
    ["main", "main"],
    ["release/1.0", "release/1.0"],
    ["feature/JIRA-12_v2.1", "feature/JIRA-12_v2.1"],
    // Legal in a ref, each corrupting the URL its own way: fragment, stray escape, separator.
    ["release#1", "release%231"],
    ["rel%2Fx", "rel%252Fx"],
    ["a&b", "a%26b"],
    ["a+b", "a%2Bb"],
    // Slashes survive; only the segments around them are encoded.
    ["release#1/hot", "release%231/hot"],
  ])("encodes %o as %o", async (input, expected) => {
    const { encodeRefForPath } = await import("@/lib/githubArticleCommit");
    expect(encodeRefForPath(input)).toBe(expected);
  });

  it("never turns a separator into %2F", async () => {
    const { encodeRefForPath } = await import("@/lib/githubArticleCommit");
    // The whole reason this is not encodeURIComponent(branch).
    expect(encodeURIComponent("release/1.0")).toBe("release%2F1.0");
    expect(encodeRefForPath("release/1.0")).toBe("release/1.0");
  });
});

/**
 * The two paths the commit path actually requests.
 *
 * This is the assertion that guards the CALL SITES rather than the encoder. Because getConfig
 * rejects every branch name needing encoding, driving commitRefreshedArticles can never distinguish
 * an encoded path from a raw one — verified by mutation: reverting both call sites to raw
 * interpolation left all the end-to-end tests green. So the paths are asserted here, where a branch
 * that needs encoding can still be passed in.
 */
describe("branchRefPaths", () => {
  it("encodes the ref in both the read and the update path", async () => {
    const { branchRefPaths } = await import("@/lib/githubArticleCommit");

    // The fragment case: raw, the update path is sent as `/git/refs/heads/release`, which on a repo
    // that also has a `release` branch advances the wrong ref while every response looks healthy.
    expect(branchRefPaths("release#1")).toEqual({
      read: "/git/ref/heads/release%231",
      update: "/git/refs/heads/release%231",
    });
    expect(branchRefPaths("a&b")).toEqual({
      read: "/git/ref/heads/a%26b",
      update: "/git/refs/heads/a%26b",
    });
  });

  it("leaves an ordinary or slashed branch untouched", async () => {
    const { branchRefPaths } = await import("@/lib/githubArticleCommit");

    expect(branchRefPaths("main")).toEqual({
      read: "/git/ref/heads/main",
      update: "/git/refs/heads/main",
    });
    expect(branchRefPaths("release/1.0")).toEqual({
      read: "/git/ref/heads/release/1.0",
      update: "/git/refs/heads/release/1.0",
    });
  });

  it("keeps GitHub's singular/plural asymmetry, which is not a typo", async () => {
    const { branchRefPaths } = await import("@/lib/githubArticleCommit");
    const { read, update } = branchRefPaths("main");

    expect(read).toContain("/git/ref/heads/");
    expect(update).toContain("/git/refs/heads/");
    expect(read).not.toBe(update);
  });
});

/**
 * A Git Data API stub that answers per endpoint instead of returning one merged object for
 * everything.
 *
 * The old single-shape stub returned `tree: { sha }` to every caller, which happened to satisfy both
 * the commit read and the tree write because nothing ever inspected it. The CAS reads
 * `GET /git/trees/{sha}?recursive=1` and iterates `tree` as a LIST of entries, so a stub that keeps
 * answering with an object would throw inside the code under test and every one of these tests would
 * fail for a reason that has nothing to do with what it is asserting.
 *
 * Method is what disambiguates the two collision pairs: `GET /git/trees/{sha}` vs `POST /git/trees`,
 * and `GET /git/commits/{sha}` vs `POST /git/commits`. Matching on the URL alone silently routes the
 * write to the read branch.
 */
function githubApiMock(
  options: { entries?: { path: string; sha: string; type: string }[]; truncated?: boolean } = {},
) {
  const entries = options.entries ?? ["alpha", "beta", "gamma"].map((slug) => ({
    path: `content/articles/${slug}.md`,
    sha: BASE_SHA,
    type: "blob",
  }));

  return vi.fn(async (url: unknown, init?: { method?: string }) => {
    const target = String(url);
    const method = init?.method ?? "GET";
    let payload: unknown = {};

    if (method === "GET" && target.includes("/git/ref/heads/")) {
      payload = { object: { sha: "refsha" } };
    } else if (method === "GET" && target.includes("/git/commits/")) {
      payload = { tree: { sha: "treesha" } };
    } else if (method === "GET" && target.includes("/git/trees/")) {
      payload = { tree: entries, truncated: options.truncated ?? false };
    } else if (target.endsWith("/git/blobs")) {
      payload = { sha: "blobsha" };
    } else if (target.endsWith("/git/trees")) {
      payload = { sha: "newtreesha" };
    } else if (target.endsWith("/git/commits")) {
      payload = { sha: "newsha" };
    }

    return { ok: true, json: async () => payload, text: async () => "" } as unknown as Response;
  });
}

describe("commitRefreshedArticles: nothing is written when validation fails", () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = "Franscale1922";
    process.env.GITHUB_REPO_NAME = "waypoint-core-system";
    process.env.GITHUB_BRANCH = "main";

    // Minimal Git Data API: ref -> commit -> tree read -> blob -> tree -> commit -> ref PATCH.
    fetchMock = githubApiMock();
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
    const article = payload("alpha");

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
    const article = payload("alpha");

    await expect(commitRefreshedArticles([article])).rejects.toThrow(/not a real calendar day/);
    await expect(commitRefreshedArticles([article])).rejects.toThrow(/main was not\s+advanced/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * The branch name reaches production through a URL, not through git.
   *
   * `#`, `%`, `&` and `+` are all legal in a branch name (`git check-ref-format` accepts
   * `refs/heads/release#1`) and all of them mean something else inside a URL. Interpolated raw, a
   * `#` opens a fragment: the request for `/git/refs/heads/release#1` leaves as
   * `/git/refs/heads/release`, so on a repo that also has a `release` branch the PATCH advances
   * THAT branch, and every response still looks healthy.
   *
   * These assert on the URL the stub was actually called with, which is the only place the
   * difference is observable.
   */
  it("keeps the slashes in a slashed branch instead of encoding them away", async () => {
    process.env.GITHUB_BRANCH = "release/1.0";
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await commitRefreshedArticles([payload("alpha")]);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    // The trap in the fix itself: encodeURIComponent over the whole value yields `release%2F1.0`,
    // which GitHub reads as a branch of that literal name. Both the read and the PATCH must keep
    // `/` as a path separator.
    expect(urls).toContain("https://api.github.com/repos/Franscale1922/waypoint-core-system/git/ref/heads/release/1.0");
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(String(patch![0])).toBe(
      "https://api.github.com/repos/Franscale1922/waypoint-core-system/git/refs/heads/release/1.0",
    );
    expect(urls.some((url) => url.includes("%2F"))).toBe(false);
  });

  it("refuses a branch name that would change which ref the URL points at", async () => {
    process.env.GITHUB_BRANCH = "release#1";
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await expect(
      commitRefreshedArticles([payload("alpha")]),
    ).rejects.toThrow(/Refusing to use GITHUB_BRANCH/);
    // The consequence that matters: rejected on configuration, before a blob exists or any ref moved.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * This error is thrown inside an Inngest step, so it reaches failure telemetry and the monthly
   * summary email. The values that trigger it are, by the check's own premise, most likely
   * mis-mapped environment variables, so the rejected bytes could be anything that got pointed at
   * the wrong name. The message names the variable and states the rule; it must not quote the value.
   */
  it("names the offending variable without echoing what was in it", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("alpha")];
    const secretish = "ghp_NOTAREALTOKEN&pretend=this=leaked";

    process.env.GITHUB_BRANCH = secretish;
    const error = await commitRefreshedArticles(batch).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("GITHUB_BRANCH");
    expect(message).toContain("not a plain slash-separated name");
    // The whole point. Neither the value nor any recognisable run of it survives into the message.
    expect(message).not.toContain(secretish);
    expect(message).not.toContain("ghp_");
    expect(message).not.toContain("NOTAREALTOKEN");
    // Length is reported instead, which is diagnostic without being a disclosure.
    expect(message).toContain(`${secretish.length} character(s)`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["", "release%2Fmain", "a&b", "feature/../main", "/main", "main/"])(
    "refuses GITHUB_BRANCH=%o before issuing a request",
    async (branch) => {
      process.env.GITHUB_BRANCH = branch;
      const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

      await expect(
        commitRefreshedArticles([payload("alpha")]),
      ).rejects.toThrow(/Refusing to use GITHUB_BRANCH/);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("refuses an owner or repo that would retarget the request the same way", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("alpha")];

    process.env.GITHUB_REPO_OWNER = "Franscale1922/evil";
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/Refusing to use GITHUB_REPO_OWNER/);

    process.env.GITHUB_REPO_OWNER = "Franscale1922";
    process.env.GITHUB_REPO_NAME = "waypoint-core-system#x";
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/Refusing to use GITHUB_REPO_NAME/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still accepts the default and other ordinary branch names", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("alpha")];

    delete process.env.GITHUB_BRANCH; // the documented default
    // `committed`, not merely "did not throw": the batch has to have actually been written. A
    // conflict skip also resolves, so asserting on resolution alone would now pass even if the CAS
    // were silently rejecting every article.
    await expect(commitRefreshedArticles(batch)).resolves.toMatchObject({ committed: ["alpha"] });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain(
      "https://api.github.com/repos/Franscale1922/waypoint-core-system/git/ref/heads/main",
    );

    for (const branch of ["main", "feature/JIRA-12_v2.1", "v2.0.x", "_staging"]) {
      process.env.GITHUB_BRANCH = branch;
      await expect(commitRefreshedArticles(batch)).resolves.toMatchObject({ committed: ["alpha"] });
    }
  });

  /**
   * The tripwire between the two guards.
   *
   * The encoding and the validation close different halves of the same hole, and today the
   * validation is the stricter of the two: every branch name it accepts is already URL-safe, so the
   * encoding changes nothing for any value that can actually reach the call sites. That is by
   * design, and it is also why the end-to-end tests above cannot observe the encoding at all —
   * hence the direct assertions on `branchRefPaths`.
   *
   * This pins the relationship rather than leaving it as a comment. Widen SAFE_REF_SEGMENT to admit
   * something like `#` and this goes red, which is the moment the encoding stops being belt-and-
   * braces and starts being the only thing standing between a mangled env var and the wrong ref.
   */
  it("accepts only branch names that already encode to themselves", async () => {
    const { commitRefreshedArticles, encodeRefForPath } = await import("@/lib/githubArticleCommit");
    const batch = [payload("alpha")];

    const candidates = [
      "main", "release/1.0", "feature/JIRA-12_v2.1", "v2.0.x", "_staging", "a..b",
      "release#1", "a&b", "a+b", "rel%2Fx", "", "/main", "main/",
    ];

    let accepted = 0;
    for (const branch of candidates) {
      process.env.GITHUB_BRANCH = branch;
      fetchMock.mockClear();
      const ok = await commitRefreshedArticles(batch).then(() => true, () => false);
      if (!ok) continue;
      accepted++;
      // One direction only. The converse does not hold and should not be asserted: "", "/main" and
      // "main/" are rejected for being malformed, not for needing encoding.
      expect(encodeRefForPath(branch)).toBe(branch);
      expect(String(fetchMock.mock.calls[0][0])).toContain(`/git/ref/heads/${branch}`);
    }

    // Guard against the whole loop passing vacuously if every candidate were somehow rejected.
    expect(accepted).toBe(6);
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
    const batch = ["alpha", "beta", "gamma"].map(payload);

    // "frontmatter problem", not "frontmatter date problem": the boundary now reports date and
    // required-field failures through the same counter, so the message can no longer claim every
    // problem it is refusing is a date.
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/3 frontmatter problem/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
