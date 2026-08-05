import { describe, it, expect, beforeEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { gitBlobSha } from "@/lib/gitBlobSha";
import { DEFAULT_ARTICLES_DIR } from "../../scripts/verify-dates.mjs";
import {
  baseArticleFile,
  baseBlobShaFor,
  createFakeGitHub,
  jsonResponse,
  methodOf,
  pathOf,
  seedArticles,
  useGitHubEnv,
  TODAY,
  type FakeGitHub,
} from "./helpers/fake-github";

/**
 * WHETHER the AI content refresh may overwrite the file it is pointed at.
 *
 * The sibling suites cover the other two decisions this write path makes: write-path-dates and
 * write-path-fields cover WHAT gets written, write-path-slug covers WHERE. This one covers the
 * question none of those can answer, because no amount of inspecting a payload reveals it: is the
 * file being replaced still the file this content was generated FROM?
 *
 * The defect being closed is silent by construction. A human edits an article; the monthly refresh,
 * holding content generated from the pre-edit copy, lays its blob over the path; the ref PATCH is a
 * clean fast-forward because the commit still descends from theirs; the run reports success. The
 * absent `force` on that PATCH looks like it covers this and does not: it protects the branch
 * pointer, not file contents.
 *
 * A NOTE ON WHAT MAKES THESE TESTS WORTH ANYTHING. The previous attempt at this fix shipped two
 * guards that no test could distinguish from their own absence: deleting `?recursive=1` and
 * deleting the blob-type filter each left the whole suite green, and the first of those would have
 * disabled the refresh entirely against real GitHub while reporting success every month. So the
 * fake models the difference between a recursive and a top-level tree read (see fake-github.ts),
 * every classification branch is reachable from outside, and the hash is checked against git itself
 * rather than a frozen digest.
 */

const BODY = "Refreshed body copy.\n";

function frontmatterFor(slug: string) {
  return {
    title: "How Franchise Financing Works",
    slug,
    date: "2026-01-15",
    category: "Getting Started",
    tier: 1,
    excerpt: "An excerpt that is short but perfectly legal.",
    relatedSlugs: [],
    faqs: [{ q: "Is this a question?", a: "It is." }],
  } as never;
}

/** A payload pointed at the file `seedArticles` puts on the branch. */
const payload = (slug: string) => ({
  slug,
  frontmatter: frontmatterFor(slug),
  body: BODY,
  baseBlobSha: baseBlobShaFor(slug),
});

const articlePath = (slug: string) => `content/articles/${slug}.md`;

/** What this payload intends to write, which is what an earlier attempt would have left behind. */
async function outputFor(slug: string) {
  const { serializeArticle } = await import("@/lib/githubArticleCommit");
  return serializeArticle(frontmatterFor(slug), BODY, TODAY);
}

// ─── The ordinary case, and the one it protects ───────────────────────────────

describe("the compare-and-swap: an unchanged file is written, a changed one is not", () => {
  useGitHubEnv();

  let gh: FakeGitHub;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gh = createFakeGitHub(seedArticles("alpha", "beta"));
    fetchMock = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", fetchMock);
  });

  /**
   * The positive control. Every "did not write" assertion below is worthless without it: they would
   * all pass against a function that had simply stopped writing anything, which is precisely the
   * failure mode the previous attempt's missing recursive-read test would have produced.
   */
  it("commits an article whose file is still the one it was generated from", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    const outcome = await commitRefreshedArticles([payload("alpha")]);

    expect(outcome.status).toBe("committed");
    expect(outcome.applied).toEqual(["alpha"]);
    expect(outcome.stoodDown).toEqual([]);
    expect(gh.fileAt(gh.head, articlePath("alpha"))).toBe(await outputFor("alpha"));
  });

  /**
   * The defect itself, driven end to end: an editor commits between the read and the write.
   *
   * The assertion that matters is the last one. Reporting the stand-down is good; leaving the
   * editor's bytes in place is the point.
   */
  it("stands down rather than overwriting an article that changed underneath the run", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const humanEdit = "---\ntitle: My edit\nslug: alpha\n---\n\nA human got here first.\n";
    gh.writeFile(articlePath("alpha"), humanEdit);

    const outcome = await commitRefreshedArticles([payload("alpha"), payload("beta")]);

    expect(outcome.status).toBe("committed");
    expect(outcome.stoodDown).toHaveLength(1);
    expect(outcome.stoodDown[0].slug).toBe("alpha");
    expect(outcome.stoodDown[0].reason).toMatch(/changed on main after this refresh read it/);

    // The rest of the batch is unaffected: one stale article does not cost the month.
    expect(outcome.applied).toEqual(["beta"]);
    expect(gh.fileAt(gh.head, articlePath("beta"))).toBe(await outputFor("beta"));

    // And the edit survives, byte for byte.
    expect(gh.fileAt(gh.head, articlePath("alpha"))).toBe(humanEdit);
  });

  it("writes nothing at all when every article in the batch changed underneath the run", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    gh.writeFile(articlePath("alpha"), "---\nslug: alpha\n---\nedited\n");
    gh.writeFile(articlePath("beta"), "---\nslug: beta\n---\nedited too\n");
    const headBefore = gh.head;

    const outcome = await commitRefreshedArticles([payload("alpha"), payload("beta")]);

    expect(outcome.status).toBe("stood-down");
    expect(outcome.commitSha).toBeNull();
    expect(outcome.applied).toEqual([]);
    expect(outcome.stoodDown.map((s) => s.slug).sort()).toEqual(["alpha", "beta"]);
    expect(gh.createdCommits).toBe(0);
    expect(gh.head).toBe(headBefore);
    expect(fetchMock.mock.calls.some(([, init]) => methodOf(init as RequestInit) === "PATCH"))
      .toBe(false);
  });

  /**
   * A path that is simply gone. Re-creating it would silently revert a deletion or a rename, which
   * is a different mistake from overwriting an edit and deserves its own message: an operator
   * reading "changed underneath the run" about a file they deliberately deleted would go looking
   * for a diff that does not exist.
   */
  it("stands down when the file was deleted or renamed rather than re-creating it", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const only = createFakeGitHub(seedArticles("beta"));
    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => only.handle(String(url), init)));

    const outcome = await commitRefreshedArticles([payload("alpha")]);

    expect(outcome.status).toBe("stood-down");
    expect(outcome.stoodDown[0].reason).toMatch(/no longer exists on main/);
    expect(only.createdCommits).toBe(0);
  });

  /**
   * Not every path holds a regular file. Git can put a submodule or a symlink where an article is
   * expected, and laying a 100644 blob over either is a structural change to the repository that no
   * content refresh has any business making.
   *
   * This is the branch the previous attempt could not test. It filtered the tree listing on
   * `type === "blob"`, and deleting that filter left every test green, because a filtered-out entry
   * and a missing entry are indistinguishable once the map is built. Classifying the entry at the
   * path, rather than filtering the list, is what makes the behaviour observable.
   */
  it.each([
    ["a submodule", { type: "commit", mode: "160000" }],
    ["a symlink", { type: "blob", mode: "120000" }],
  ])("stands down when the path holds %s rather than a regular file", async (_label, entry) => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    gh.setTreeEntry(articlePath("alpha"), entry);

    const outcome = await commitRefreshedArticles([payload("alpha")]);

    expect(outcome.status).toBe("stood-down");
    expect(outcome.stoodDown[0].reason).toMatch(/is not a regular file on main/);
    expect(gh.createdCommits).toBe(0);
  });
});

// ─── Recognising this run's OWN work, which is not a conflict ─────────────────

describe("the compare-and-swap: a retry does not mistake its own bytes for somebody else's", () => {
  useGitHubEnv();

  let gh: FakeGitHub;

  beforeEach(() => {
    gh = createFakeGitHub(seedArticles("alpha", "beta"));
    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init)));
  });

  /**
   * THE REGRESSION TEST FOR THE DEFECT THAT STOPPED THE PREVIOUS ATTEMPT SHIPPING, found
   * independently by two reviewers.
   *
   * A batch commits some articles and stands others down. Something later in the run fails, so
   * Inngest retries the whole function. Without the output-SHA arm, the retry reads the bytes it
   * committed itself, matches no base SHA, files every one of them as a conflict, and emails
   * "0 updated / N failed" for work that committed and deployed correctly.
   *
   * The second half of this test is the part that would go red if the batch identity were computed
   * over every payload instead of over what was actually published, or if the trailer scan were
   * moved back ahead of the compare-and-swap. Either change makes the retry return early with
   * nothing to report, and the article that stood down disappears from the summary entirely while
   * still being listed as refreshed.
   */
  it("reports a partial batch's committed articles as applied and still names the one that stood down", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    gh.writeFile(articlePath("alpha"), "---\nslug: alpha\n---\nA human got here first.\n");
    const batch = [payload("alpha"), payload("beta")];

    const first = await commitRefreshedArticles(batch);
    expect(first.status).toBe("committed");
    expect(first.applied).toEqual(["beta"]);
    expect(gh.createdCommits).toBe(1);

    // The retry. Same payloads, a branch that now carries beta's refreshed bytes.
    const retry = await commitRefreshedArticles(batch);

    expect(retry.status).toBe("already-applied");
    expect(retry.applied).toEqual(["beta"]);
    expect(retry.commitSha).toBe(first.commitSha);
    expect(retry.stoodDown.map((s) => s.slug)).toEqual(["alpha"]);
    expect(gh.createdCommits).toBe(1);
  });

  it("recognises a whole batch that an earlier attempt already published", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const batch = [payload("alpha"), payload("beta")];

    const first = await commitRefreshedArticles(batch);
    const retry = await commitRefreshedArticles(batch);

    expect(first.status).toBe("committed");
    expect(retry.status).toBe("already-applied");
    expect(retry.applied.sort()).toEqual(["alpha", "beta"]);
    expect(retry.stoodDown).toEqual([]);
    expect(gh.createdCommits).toBe(1);
  });

  /**
   * THE ORDERING TRAP, and the reason the base SHA is compared BEFORE the output SHA.
   *
   * When a refresh produces bytes identical to the ones it read, the base and output SHAs are the
   * same value and both comparisons match. Testing the output first would label an untouched
   * article "already published by this run" and report a batch of pure no-ops as `already-applied`.
   * The honest answer is `no-changes`: nothing has been published, there is simply nothing to say.
   *
   * Swapping the two arms in githubArticleCommit.ts turns this red and nothing else.
   */
  it("reports an unchanged refresh as no-changes, not as already-applied", async () => {
    const { commitRefreshedArticles, serializeArticle } = await import("@/lib/githubArticleCommit");
    // The file on the branch IS what this refresh would write, and is also what it was generated
    // from, which is what makes both arms match.
    const identical = serializeArticle(frontmatterFor("alpha"), BODY, TODAY);
    const same = createFakeGitHub({ [articlePath("alpha")]: identical });
    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => same.handle(String(url), init)));

    const outcome = await commitRefreshedArticles([
      { slug: "alpha", frontmatter: frontmatterFor("alpha"), body: BODY, baseBlobSha: gitBlobSha(identical) },
    ]);

    expect(outcome.status).toBe("no-changes");
    expect(same.createdCommits).toBe(0);
  });
});

// ─── Reading the tree: the guard whose absence is worse than the bug ──────────

describe("the compare-and-swap reads the tree in the only way that works", () => {
  useGitHubEnv();

  let gh: FakeGitHub;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gh = createFakeGitHub(seedArticles("alpha"));
    fetchMock = vi.fn((url: unknown, init?: RequestInit) => gh.handle(String(url), init));
    vi.stubGlobal("fetch", fetchMock);
  });

  /**
   * `?recursive=1` is load-bearing and its absence is CATASTROPHIC rather than degrading.
   *
   * Without it GitHub returns top-level entries only, so `content` arrives as one `type: "tree"`
   * entry and no article path is in the listing at all. Every article would stand down, forever,
   * while the run reported success and blamed the articles in the summary email: strictly worse
   * than the bug this whole file exists to close.
   *
   * Two assertions, because the first alone is a spelling check. The second proves the flag really
   * decides what comes back, so asserting on it means something.
   */
  it("asks for the tree recursively, and a non-recursive read would see no article at all", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    await commitRefreshedArticles([payload("alpha")]);

    const treeRead = fetchMock.mock.calls.find(
      ([url, init]) => methodOf(init as RequestInit) === "GET" && pathOf(url).includes("/git/trees/"),
    );
    expect(treeRead).toBeDefined();
    expect(String(treeRead![0])).toContain("recursive=1");

    // What the same read returns without the flag, straight from the fake: one directory entry and
    // not a single article path. This is the shape the production code would be handed.
    const url = new URL(String(treeRead![0]));
    url.searchParams.delete("recursive");
    const shallow = await (await gh.handle(url.toString(), { method: "GET" })).json();
    expect(shallow.tree.map((e: { path: string }) => e.path)).toEqual(["content"]);
  });

  /**
   * Fail closed on a truncated listing. A missing path and an omitted path look identical here, and
   * both would read as "this article no longer exists". Standing every article down on that basis
   * is wrong, and trusting the gap is the silent overwrite the whole check exists to prevent.
   */
  it("refuses the batch when GitHub truncates the tree listing", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    gh.setTruncated(true);

    await expect(commitRefreshedArticles([payload("alpha")])).rejects.toThrow(/truncated/);
    expect(gh.createdCommits).toBe(0);
    expect(gh.head).toBe("commit-base");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/git/blobs"))).toBe(false);
  });
});

// ─── The hash itself, checked against git rather than against a frozen digest ─

describe("gitBlobSha agrees with git", () => {
  /**
   * An EXTERNAL ORACLE, not a recorded constant.
   *
   * The value has one job: equal the object ID git computes for the same bytes. A frozen digest
   * would assert only that the function still does what it did when the digest was taken, and the
   * likeliest way to get this wrong is `.length` in place of `byteLength`, which produces a stable,
   * self-consistent, wrong answer for every non-ASCII file. Asking git is the only check that can
   * see that.
   */
  const hashWithGit = (content: string) =>
    execFileSync("git", ["hash-object", "--stdin"], { input: content, encoding: "utf-8" }).trim();

  it.each([
    ["empty", ""],
    ["ascii", "hello\n"],
    ["no trailing newline", "hello"],
    ["an em dash, two bytes in UTF-8", "a — b\n"],
    ["a curly apostrophe", "Bishop’s\n"],
    ["an emoji, four bytes in UTF-8", "\u{1F600}\n"],
    ["mixed multi-byte and a NUL-adjacent header length", "é".repeat(100)],
  ])("matches git hash-object for %s content", (_label, content) => {
    expect(gitBlobSha(content)).toBe(hashWithGit(content));
  });

  it("matches git for every article in content/articles", () => {
    const files = readdirSync(DEFAULT_ARTICLES_DIR).filter((f) => f.endsWith(".md")).sort();
    // A corpus check that silently ran over nothing would be the vacuous pass this repo has already
    // shipped once elsewhere.
    expect(files.length).toBeGreaterThan(40);

    const paths = files.map((f) => join(DEFAULT_ARTICLES_DIR, f));
    const fromGit = execFileSync("git", ["hash-object", ...paths], { encoding: "utf-8" })
      .trim()
      .split("\n");
    const mine = paths.map((p) => gitBlobSha(readFileSync(p, "utf-8")));

    expect(mine).toEqual(fromGit);
  });
});

// ─── Rate limits: the one refusal worth waiting out ──────────────────────────

describe("a rate-limited request is retried; a refusal is not", () => {
  useGitHubEnv();

  let gh: FakeGitHub;
  let slept: number[];
  let sleep: (ms: number) => Promise<void>;

  beforeEach(() => {
    gh = createFakeGitHub(seedArticles("alpha"));
    slept = [];
    sleep = async (ms: number) => { slept.push(ms); };
  });

  /** Refuse the first `times` requests to `pathFragment`, then behave normally. */
  function refuseFirst(
    times: number,
    status: number,
    headers: Record<string, string>,
    pathFragment = "/git/blobs",
  ) {
    let seen = 0;
    return vi.fn(async (url: unknown, init?: RequestInit) => {
      if (pathOf(url).includes(pathFragment) && seen < times) {
        seen += 1;
        return jsonResponse(status, { message: "rate limited" }, headers);
      }
      return gh.handle(String(url), init);
    });
  }

  it.each([
    ["429 with retry-after", 429, { "retry-after": "2" }],
    ["a secondary-limit 403 with retry-after", 403, { "retry-after": "2" }],
  ])("waits and succeeds on %s", async (_label, status, headers) => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    vi.stubGlobal("fetch", refuseFirst(1, status, headers));

    const outcome = await commitRefreshedArticles([payload("alpha")], undefined, { sleep });

    expect(outcome.status).toBe("committed");
    expect(slept).toHaveLength(1);
    // The server's figure, plus jitter, and never less: jitter desynchronises a batch that was all
    // refused in the same tick, so it may only ever delay a retry.
    expect(slept[0]).toBeGreaterThanOrEqual(2000);
    expect(slept[0]).toBeLessThan(2250);
  });

  it("waits out an exhausted quota whose reset is still in the future", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const reset = Math.floor(Date.now() / 1000) + 30;
    vi.stubGlobal("fetch", refuseFirst(1, 403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String(reset),
    }));

    const outcome = await commitRefreshedArticles([payload("alpha")], undefined, { sleep });

    expect(outcome.status).toBe("committed");
    expect(slept[0]).toBeGreaterThanOrEqual(30_000);
  });

  /**
   * THE ONE THAT MUST NOT RETRY, and the reason the evidence rather than the status decides.
   *
   * A ruleset requiring a pull request, a token without `contents: write`, an archived repository:
   * all 403, all permanent. Retrying spends the function's entire budget waiting for an answer that
   * is already final, on the monthly run that most needs to fail fast and say why.
   */
  it("fails immediately on a 403 carrying no rate-limit evidence", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");
    const fetchMock = refuseFirst(99, 403, {}, "/git/refs/heads/");
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      commitRefreshedArticles([payload("alpha")], undefined, { sleep }),
    ).rejects.toThrow(/GitHub API error 403/);

    expect(slept).toEqual([]);
    const patches = fetchMock.mock.calls.filter(([, init]) => methodOf(init as RequestInit) === "PATCH");
    expect(patches).toHaveLength(1);
  });

  it("gives up after a bounded number of attempts rather than waiting forever", async () => {
    const { commitRefreshedArticles, RATE_LIMIT_MAX_ATTEMPTS } =
      await import("@/lib/githubArticleCommit");
    vi.stubGlobal("fetch", refuseFirst(99, 429, { "retry-after": "1" }));

    await expect(
      commitRefreshedArticles([payload("alpha")], undefined, { sleep }),
    ).rejects.toThrow(/after 4 attempts/);

    expect(slept).toHaveLength(RATE_LIMIT_MAX_ATTEMPTS - 1);
  });

  it("caps a single wait however long the server asks for", async () => {
    const { rateLimitDelayMs, RATE_LIMIT_MAX_WAIT_MS } = await import("@/lib/githubArticleCommit");
    const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

    expect(rateLimitDelayMs(429, headers({ "retry-after": "99999" }), Date.now()))
      .toBe(RATE_LIMIT_MAX_WAIT_MS);
  });

  it.each([
    ["a 404", 404, { "retry-after": "5" }],
    ["a 403 with an exhausted quota whose reset has passed", 403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1",
    }],
    ["a 403 with quota remaining", 403, { "x-ratelimit-remaining": "42" }],
    ["a 403 with no headers at all", 403, {}],
  ])("does not retry %s", async (_label, status, h) => {
    const { rateLimitDelayMs } = await import("@/lib/githubArticleCommit");
    const table = h as Record<string, string>;
    const headers = { get: (n: string) => table[n.toLowerCase()] ?? null };

    expect(rateLimitDelayMs(status, headers, Date.now())).toBeNull();
  });
});

// ─── The seed helper is honest ────────────────────────────────────────────────

describe("the fixture itself", () => {
  /**
   * Every test above rests on `baseBlobShaFor` naming the same bytes `seedArticles` writes. If those
   * two ever drift, the whole suite still runs and every commit test fails as a stand-down, which
   * reads like a broken guard rather than a broken fixture. One assertion makes the difference
   * legible.
   */
  it("seeds the branch with exactly the bytes the payloads claim as their base", () => {
    const seeded = seedArticles("alpha");
    expect(gitBlobSha(seeded["content/articles/alpha.md"])).toBe(baseBlobShaFor("alpha"));
    expect(seeded["content/articles/alpha.md"]).toBe(baseArticleFile("alpha"));
  });
});
