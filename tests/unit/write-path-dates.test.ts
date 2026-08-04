import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash } from "crypto";
import matter from "gray-matter";

import { addUtcDays, validateFrontmatterDates } from "@/lib/frontmatterDates.mjs";
import {
  createFakeGitHub,
  jsonResponse,
  methodOf,
  pathOf,
  useGitHubEnv,
  OWNER,
  REPO,
  TODAY,
  type FakeGitHub,
} from "./helpers/fake-github";

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
 * The last three blocks cover the OTHER thing that path has to survive: running twice. The refresh
 * function retries once, so a lost reply to the ref update used to produce a second commit with
 * identical content — a misleading history and a second production deploy, each of which runs
 * `prisma db push` against the production database. Those tests drive a fake Git Data API rather
 * than a flat stub, because the property at stake ("the retry does not commit again") is only
 * meaningful against a server that REMEMBERS the first attempt.
 *
 * These tests drive the REAL serializeArticle rather than hand-written fixture strings wherever the
 * question is "what gets committed", because the whole class of bug here lives in the gap between
 * the frontmatter object and the bytes gray-matter emits from it.
 */

// TODAY is imported from ./helpers/fake-github: the pinned clock and the fake server have to agree
// about the day, because the stamped date is part of the bytes and therefore part of the batch id.
const BODY = "Refreshed body copy.\n";

/**
 * Frontmatter shaped like what `matter(modelOutput).data` produces, cast the same way the pipeline
 * casts it.
 *
 * The `faqs` block is not decoration. validateArticlePayload also enforces the required non-date
 * fields (src/lib/frontmatterFields.mjs, tests/unit/write-path-fields.test.ts), and a fixture
 * without one is not a valid article, so it would fail these date tests for an unrelated reason and
 * make them assert nothing about dates.
 *
 * The slug defaults to "alpha" for the same reason: the payloads throughout this file are named
 * `alpha`, and validateArticlePayload requires the payload slug and the frontmatter slug to agree
 * (tests/unit/write-path-slug.test.ts). A fixture whose two slugs disagreed would fail the slug
 * guard before any date rule was reached.
 */
function modelFrontmatter(extra: Record<string, unknown> = {}) {
  return {
    title: "How Franchise Financing Works",
    slug: "alpha",
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
 * A payload whose two slugs agree.
 *
 * The commit boundary requires that (see tests/unit/write-path-slug.test.ts), so these fixtures
 * have to carry it or every test here would trip the slug guard instead of exercising the date
 * rules it is asking about.
 */
function payload(slug: string, extra: Record<string, unknown> = {}) {
  return { slug, frontmatter: modelFrontmatter({ slug, ...extra }), body: BODY };
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
// ─── A fake Git Data API ──────────────────────────────────────────────────────
//
// Lives in ./helpers/fake-github.ts so tests/unit/write-path-slug.test.ts drives the same one.
// See that file for why it is stateful and why it addresses trees by content.

const alphaArticle = () => ({ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY });

describe("commitRefreshedArticles: nothing is written when validation fails", () => {
  useGitHubEnv();

  let gh: FakeGitHub;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gh = createFakeGitHub();
    fetchMock = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("commits the exact bytes it validated", async () => {
    const { commitRefreshedArticles, serializeArticle } = await import("@/lib/githubArticleCommit");
    const article = alphaArticle();

    const outcome = await commitRefreshedArticles([article]);

    const blobCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/git/blobs"));
    expect(blobCall).toBeDefined();
    const sent = Buffer.from(JSON.parse(blobCall![1].body).content, "base64").toString("utf-8");
    // The committed content is the validated content, not a second serialization of it. A
    // re-serialize would be indistinguishable here on most days and wrong on exactly one: the run
    // that crosses midnight.
    expect(sent).toBe(serializeArticle(article.frontmatter, article.body));

    // And the ref really was advanced, so the negative assertion below means something. Asserted
    // against the server's own state rather than "a PATCH was issued", which is a weaker claim.
    expect(outcome.status).toBe("committed");
    expect(gh.head).toBe(outcome.commitSha);
    expect(gh.fileAt(gh.head, "content/articles/alpha.md")).toBe(sent);
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
    const article = alphaArticle();

    await expect(commitRefreshedArticles([article])).rejects.toThrow(/not a real calendar day/);
    await expect(commitRefreshedArticles([article])).rejects.toThrow(/main was not\s+advanced/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * The date guard is DETERMINISTIC, and has to stay that way.
   *
   * Everything else added to this module is about making a second attempt behave differently from
   * the first. This is the one thing that must not: a batch rejected for a bad date is rejected the
   * same way every time, having touched nothing, because there is no half-applied state to recover
   * and no reason to spend a request before refusing. The two calls above already assert the same
   * message twice; this asserts the part that would rot silently — that neither call reached the
   * network, so no idempotency check was consulted ahead of the guard.
   */
  it("fails identically on a retry, without ever reaching GitHub", async () => {
    vi.doMock("@/lib/frontmatterDates.mjs", async () => {
      const actual = await vi.importActual<Record<string, unknown>>("@/lib/frontmatterDates.mjs");
      return {
        ...actual,
        validateFrontmatterDates: () => ({ errors: ["alpha.md: FUTURE"], checked: 1 }),
      };
    });

    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const article = alphaArticle();

    const first = await commitRefreshedArticles([article]).catch((error: Error) => error.message);
    const second = await commitRefreshedArticles([article]).catch((error: Error) => error.message);

    expect(first).toBe(second);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gh.createdCommits).toBe(0);
    expect(gh.head).toBe("commit-base");
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

    await commitRefreshedArticles([{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }]);

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
      commitRefreshedArticles([{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }]),
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
    const batch = [{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }];
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
        commitRefreshedArticles([{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }]),
      ).rejects.toThrow(/Refusing to use GITHUB_BRANCH/);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("refuses an owner or repo that would retarget the request the same way", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }];

    process.env.GITHUB_REPO_OWNER = "Franscale1922/evil";
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/Refusing to use GITHUB_REPO_OWNER/);

    process.env.GITHUB_REPO_OWNER = "Franscale1922";
    process.env.GITHUB_REPO_NAME = "waypoint-core-system#x";
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/Refusing to use GITHUB_REPO_NAME/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still accepts the default and other ordinary branch names", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }];

    // Resolving is the claim; the value is asserted on rather than required to be undefined,
    // because the function now reports what it did. The repeats below deliberately do not pin a
    // status: the fake server is stateful, so the first call commits the batch and the rest
    // recognise it as already applied. Accepting the branch name is what is under test here.
    delete process.env.GITHUB_BRANCH; // the documented default
    await expect(commitRefreshedArticles(batch)).resolves.toMatchObject({ articles: 1 });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain(
      "https://api.github.com/repos/Franscale1922/waypoint-core-system/git/ref/heads/main",
    );

    for (const branch of ["main", "feature/JIRA-12_v2.1", "v2.0.x", "_staging"]) {
      process.env.GITHUB_BRANCH = branch;
      await expect(commitRefreshedArticles(batch)).resolves.toMatchObject({ articles: 1 });
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
    const batch = [{ slug: "alpha", frontmatter: modelFrontmatter(), body: BODY }];

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
    const batch = ["alpha", "beta", "gamma"].map((slug) => payload(slug));

    // Plain "problem(s)": the boundary reports date, required-field AND slug failures through the
    // same counter, so the message cannot claim every problem it is refusing is a date, nor even
    // that every one is frontmatter. See tests/unit/write-path-slug.test.ts.
    await expect(commitRefreshedArticles(batch)).rejects.toThrow(/3 problem\(s\)/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * The ref update is the one call in this module whose failure carries a question.
 *
 * Everything before it creates Git objects, which are unreachable until something points at them.
 * This is the call that publishes. When it fails in a way that says nothing about whether it was
 * applied, the module has to go and look; when it fails in a way that DOES say, it must not.
 */
describe("commitRefreshedArticles: an ambiguous ref update is resolved, not assumed", () => {
  useGitHubEnv();

  let gh: FakeGitHub;

  beforeEach(() => {
    gh = createFakeGitHub();
  });

  /** GitHub applied the update and the reply never made it back. */
  const dropReplyToPatch = () => {
    const spy = vi.fn(async (url: unknown, init?: RequestInit) => {
      const res = await gh.handle(String(url), init);
      if (methodOf(init) === "PATCH") throw new TypeError("fetch failed");
      return res;
    });
    vi.stubGlobal("fetch", spy);
    return spy;
  };

  it("treats a dropped connection whose update landed as success", async () => {
    dropReplyToPatch();
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    const outcome = await commitRefreshedArticles([alphaArticle()]);

    expect(outcome.status).toBe("committed");
    expect(gh.head).toBe(outcome.commitSha);
    expect(gh.createdCommits).toBe(1);
  });

  it("treats a 5xx whose update landed as success", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      const res = await gh.handle(String(url), init);
      if (methodOf(init) === "PATCH") return jsonResponse(502, { message: "Bad gateway" });
      return res;
    }));
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    const outcome = await commitRefreshedArticles([alphaArticle()]);

    expect(outcome.status).toBe("committed");
    expect(gh.head).toBe(outcome.commitSha);
  });

  /**
   * The counterweight, and the reason this is not "treat errors as success": the SAME ambiguous
   * status, on an update that did not land, still fails. Ambiguity only buys a look at the ref —
   * the branch pointing at our commit is what buys success.
   */
  it("still fails when the ambiguous update did NOT land", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      // Intercepted BEFORE the fake sees it, so the ref is genuinely untouched.
      if (methodOf(init) === "PATCH") return jsonResponse(500, { message: "Internal Server Error" });
      return gh.handle(String(url), init);
    }));
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await expect(commitRefreshedArticles([alphaArticle()])).rejects.toThrow(
      /branch is at commit-base, not the commit that was created \(commit-1\)/,
    );
    expect(gh.head).toBe("commit-base");
  });

  it("surfaces the batch id when it cannot find out either way", async () => {
    let refReads = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      if (methodOf(init) === "GET" && pathOf(url).endsWith("/git/ref/heads/main") && ++refReads === 2) {
        throw new TypeError("fetch failed");
      }
      const res = await gh.handle(String(url), init);
      if (methodOf(init) === "PATCH") throw new TypeError("fetch failed");
      return res;
    }));
    const { commitRefreshedArticles, batchTrailer, computeBatchId, serializeArticle } =
      await import("@/lib/githubArticleCommit");
    const article = alphaArticle();
    const expectedId = computeBatchId([
      { slug: article.slug, content: serializeArticle(article.frontmatter, article.body) },
    ]);

    const message = await commitRefreshedArticles([article]).catch((e: Error) => e.message);

    expect(message).toMatch(/may or may not be on main/);
    // A run that ended not knowing still hands the operator the exact string to grep history for,
    // and it is the string really sitting in the commit that landed — not a plausible-looking one.
    expect(message).toContain(batchTrailer(expectedId));
    expect(gh.messageOf("commit-1")).toContain(batchTrailer(expectedId));
  });

  it.each([
    [422, "Update is not a fast forward"],
    [404, "Branch not found"],
    [403, "Resource not accessible by personal access token"],
  ])("rethrows a definite %i without re-reading the ref", async (status, detail) => {
    let refReads = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      if (methodOf(init) === "GET" && pathOf(url).endsWith("/git/ref/heads/main")) refReads++;
      if (methodOf(init) === "PATCH") return jsonResponse(status, { message: detail });
      return gh.handle(String(url), init);
    }));
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await expect(commitRefreshedArticles([alphaArticle()])).rejects.toThrow(
      new RegExp(`GitHub API error ${status}`),
    );
    // Exactly the one read at the top of the run. GitHub already answered the question, so no
    // request is spent asking it again — and, more to the point, no path exists by which a refused
    // write could be talked into looking like a successful one.
    expect(refReads).toBe(1);
    expect(gh.head).toBe("commit-base");
  });
});

/**
 * The headline: the same batch, run twice, produces one commit.
 *
 * Before this, a lost reply to the ref update threw, the function retried against a HEAD that
 * already contained the work, and committed it again — a second commit with identical content, a
 * misleading history, and a second production deploy carrying `prisma db push` against production.
 */
describe("commitRefreshedArticles: a retry does not commit the same batch twice", () => {
  useGitHubEnv();

  let gh: FakeGitHub;

  beforeEach(() => {
    gh = createFakeGitHub();
  });

  it("recognises its own already-applied work when the reply AND the re-read were both lost", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const article = alphaArticle();

    // ── Attempt 1: the PATCH is applied, its reply is lost, and the confirming re-read is lost
    // too — so the run ends knowing nothing, which is precisely when the SHA is not to hand.
    let refReads = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      if (methodOf(init) === "GET" && pathOf(url).endsWith("/git/ref/heads/main") && ++refReads === 2) {
        throw new TypeError("fetch failed");
      }
      const res = await gh.handle(String(url), init);
      if (methodOf(init) === "PATCH") throw new TypeError("fetch failed");
      return res;
    }));

    await expect(commitRefreshedArticles([article])).rejects.toThrow(/outcome is unknown|may or may not/);

    // The work really did land, which is what makes the retry dangerous.
    expect(gh.head).toBe("commit-1");
    expect(gh.createdCommits).toBe(1);

    // ── Attempt 2: what Inngest runs next. Same payload — the per-article steps are memoized, so
    // the retry holds identical bytes — and no memory whatsoever of commit-1.
    const retryFetch = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", retryFetch);

    const outcome = await commitRefreshedArticles([article]);

    expect(outcome.status).toBe("already-applied");
    expect(outcome.commitSha).toBe("commit-1");
    // The assertion the whole change exists for. This was 2.
    expect(gh.createdCommits).toBe(1);
    expect(gh.head).toBe("commit-1");
    expect(retryFetch.mock.calls.some(([, init]) => methodOf(init as RequestInit) === "PATCH")).toBe(false);
  });

  it("stands down before creating a single blob", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const article = alphaArticle();

    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init)));
    await commitRefreshedArticles([article]);

    const retryFetch = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", retryFetch);
    await commitRefreshedArticles([article]);

    // Cheap as well as correct: an already-applied batch costs two GETs, not a blob upload per
    // article followed by a tree and a commit.
    const written = retryFetch.mock.calls.filter(([, init]) => methodOf(init as RequestInit) !== "GET");
    expect(written).toHaveLength(0);
  });

  it("carries the batch id in the commit message, which is what the retry reads", async () => {
    const { commitRefreshedArticles, batchTrailer } = await import("@/lib/githubArticleCommit");
    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init)));

    const outcome = await commitRefreshedArticles([alphaArticle()]);

    expect(outcome.batchId).toMatch(/^[0-9a-f]{16}$/);
    const message = gh.messageOf(outcome.commitSha!)!;
    // A trailer on its own line, below the summary a human reads.
    expect(message.split("\n")[0]).toMatch(/^chore: content refresh/);
    expect(message).toContain(`\n${batchTrailer(outcome.batchId!)}`);
  });

  it("keeps the trailer on a caller-supplied message, since that is the only handle a retry has", async () => {
    const { commitRefreshedArticles, batchTrailer } = await import("@/lib/githubArticleCommit");
    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init)));

    const outcome = await commitRefreshedArticles([alphaArticle()], "docs: hand-written subject");
    const message = gh.messageOf(outcome.commitSha!)!;

    expect(message.split("\n")[0]).toBe("docs: hand-written subject");
    expect(message).toContain(batchTrailer(outcome.batchId!));
  });

  /**
   * A caller does not get to author batch identity.
   *
   * The trailer is derived from the article bytes precisely so it cannot be claimed, and the
   * failure a forged one produces is the quiet kind: some later batch reads it, decides it is
   * already published, and returns success having written nothing at all.
   */
  it("refuses a caller-supplied message that forges the trailer, before any request", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const spy = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", spy);

    await expect(
      commitRefreshedArticles([alphaArticle()], "chore: refresh\n\nRefresh-Batch: deadbeefdeadbeef"),
    ).rejects.toThrow(/Refusing a commit message containing a "Refresh-Batch:" line/);

    expect(spy).not.toHaveBeenCalled();
    expect(gh.createdCommits).toBe(0);
  });

  /**
   * The trailer has to be a LINE, not a substring.
   *
   * Prose that merely quotes one must not answer for it. This module's own "could not find out"
   * error quotes the trailer, so a message that pasted that error in would otherwise be read as
   * proof the batch had landed, and the real articles would never be published.
   */
  it("does not accept a trailer quoted inside prose as proof the batch landed", async () => {
    const { commitRefreshedArticles, computeBatchId, serializeArticle } =
      await import("@/lib/githubArticleCommit");
    const article = alphaArticle();
    const batchId = computeBatchId([
      { slug: article.slug, content: serializeArticle(article.frontmatter, article.body) },
    ]);

    // A commit that talks ABOUT the batch without carrying it.
    const decoy = createFakeGitHub();
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      const res = await decoy.handle(String(url), init);
      if (methodOf(init) === "GET" && pathOf(url).endsWith("/commits")) {
        return jsonResponse(200, [
          { sha: "commit-base", commit: { message: `chore: retry notes (Refresh-Batch: ${batchId}) still unresolved` } },
        ]);
      }
      return res;
    }));

    const outcome = await commitRefreshedArticles([article]);

    // Not fooled: it went ahead and published.
    expect(outcome.status).toBe("committed");
    expect(decoy.createdCommits).toBe(1);
  });

  /**
   * The second, independent read on "already landed", and the one that still works when the batch
   * id does not — a retry that crossed midnight UTC re-stamps the date, derives a different id, and
   * would sail past the trailer check. The tree comparison catches it because the bytes, not the
   * name, are what it looks at.
   */
  it("creates nothing when the branch already holds these exact bytes", async () => {
    const { serializeArticle } = await import("@/lib/githubArticleCommit");
    const article = alphaArticle();
    const already = createFakeGitHub({
      "content/articles/alpha.md": serializeArticle(article.frontmatter, article.body),
    });

    const spy = vi.fn((url: unknown, init?: RequestInit) => already.handle(String(url), init));
    vi.stubGlobal("fetch", spy);

    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const outcome = await commitRefreshedArticles([article]);

    expect(outcome.status).toBe("no-changes");
    expect(outcome.commitSha).toBe("commit-base");
    expect(already.createdCommits).toBe(0);
    expect(already.head).toBe("commit-base");
    expect(spy.mock.calls.some(([, init]) => methodOf(init as RequestInit) === "PATCH")).toBe(false);
  });

  it("returns nothing-to-do for an empty batch without reading config or the network", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    delete process.env.GITHUB_TOKEN;

    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    expect(await commitRefreshedArticles([])).toEqual({
      status: "nothing-to-do",
      batchId: null,
      commitSha: null,
      articles: 0,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

/**
 * The identifier has one job: be the same on the retry as it was on the attempt that failed.
 */
describe("computeBatchId", () => {
  const entry = (slug: string, content: string) => ({ slug, content });

  it("is stable across calls with the same bytes", async () => {
    const { computeBatchId } = await import("@/lib/githubArticleCommit");
    const batch = [entry("alpha", "one"), entry("beta", "two")];

    expect(computeBatchId(batch)).toBe(computeBatchId([...batch]));
    expect(computeBatchId(batch)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("does not depend on the order articles arrive in", async () => {
    const { computeBatchId } = await import("@/lib/githubArticleCommit");
    const a = entry("alpha", "one");
    const b = entry("beta", "two");

    expect(computeBatchId([a, b])).toBe(computeBatchId([b, a]));
  });

  it("changes when any byte of any article changes", async () => {
    const { computeBatchId } = await import("@/lib/githubArticleCommit");
    const base = computeBatchId([entry("alpha", "one"), entry("beta", "two")]);

    expect(computeBatchId([entry("alpha", "one!"), entry("beta", "two")])).not.toBe(base);
    expect(computeBatchId([entry("alpha", "one"), entry("gamma", "two")])).not.toBe(base);
    expect(computeBatchId([entry("alpha", "one")])).not.toBe(base);
  });

  /**
   * Length-prefixing, proven rather than asserted in a comment. Joined on a delimiter these two
   * batches would hash the same, and one batch could then be mistaken for the other in history.
   */
  it("cannot be spoofed by a slug or body containing the delimiter", async () => {
    const { computeBatchId } = await import("@/lib/githubArticleCommit");

    expect(computeBatchId([entry("alpha", "one\nbeta"), entry("x", "two")]))
      .not.toBe(computeBatchId([entry("alpha", "one"), entry("beta\nx", "two")]));
  });
});
