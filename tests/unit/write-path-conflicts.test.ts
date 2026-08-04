import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFileSync } from "child_process";

/**
 * The third way an article's content can be wrong when it reaches production: it can be RIGHT, and
 * still be the wrong thing to write.
 *
 * tests/unit/write-path-dates.test.ts and write-path-fields.test.ts both ask "are these bytes
 * valid?". This file asks the question neither of them can: "is the file we are about to replace
 * still the file this content was derived from?"
 *
 * The refresh generates from `process.cwd()/content/articles` (src/lib/contentRefresh.ts,
 * getAllArticles), which in a deployed function is the last deploy's copy — not the branch. The
 * commit then replaces that path wholesale on whatever HEAD happens to be. Nothing in between
 * compared the two, and GitHub does not do it for us: the PATCH omits `force`, which defaults to
 * false and refuses a non-fast-forward, but that protects the branch POINTER. Overwriting a file
 * while still descending from the commit that changed it is a perfectly good fast-forward.
 *
 * The retry is what turned that from loud into silent. The commit runs inside a `step.run` on a
 * function configured `retries: 1`, so an editor's commit landing mid-run gets the PATCH refused,
 * the step throws, and the retry rebuilds on their commit and re-applies the same stale bytes —
 * which now IS a fast-forward. Attempt one fails; attempt two overwrites them and reports success.
 *
 * So these tests are about the CAS, and the assertions are deliberately about CONSEQUENCE — whether
 * a blob was created, whether the ref moved — rather than about the shape of the return value, since
 * a return value is easy to satisfy without actually protecting anything.
 */

const BODY = "Refreshed body copy.\n";
const BASE_SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);

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

const payload = (slug: string, baseBlobSha = BASE_SHA) => ({
  slug,
  frontmatter: modelFrontmatter(),
  body: BODY,
  baseBlobSha,
});

/** See the identical helper in write-path-dates.test.ts for why this routes on method, not URL. */
function githubApiMock(
  options: { entries?: { path: string; sha: string; type: string }[]; truncated?: boolean } = {},
) {
  const entries = options.entries ?? ["alpha", "beta"].map((slug) => ({
    path: `content/articles/${slug}.md`,
    sha: BASE_SHA,
    type: "blob",
  }));

  return vi.fn(async (url: unknown, init?: { method?: string }) => {
    const target = String(url);
    const method = init?.method ?? "GET";
    let body: unknown = {};

    if (method === "GET" && target.includes("/git/ref/heads/")) {
      body = { object: { sha: "refsha" } };
    } else if (method === "GET" && target.includes("/git/commits/")) {
      body = { tree: { sha: "treesha" } };
    } else if (method === "GET" && target.includes("/git/trees/")) {
      body = { tree: entries, truncated: options.truncated ?? false };
    } else if (target.endsWith("/git/blobs")) {
      body = { sha: "blobsha" };
    } else if (target.endsWith("/git/trees")) {
      body = { sha: "newtreesha" };
    } else if (target.endsWith("/git/commits")) {
      body = { sha: "newsha" };
    }

    return { ok: true, json: async () => body, text: async () => "" } as unknown as Response;
  });
}

/** Did this run actually write? Blob creation and the ref PATCH are the two observable effects. */
const wrote = (mock: ReturnType<typeof vi.fn>) => ({
  blobs: mock.mock.calls.filter(([url]) => String(url).endsWith("/git/blobs")).length,
  patched: mock.mock.calls.some(([, init]) => (init as { method?: string })?.method === "PATCH"),
});

describe("gitBlobSha: it must be git's object ID, not merely a hash", () => {
  /**
   * Cross-checked against git itself rather than against a hard-coded digest.
   *
   * A frozen expected value would pass just as happily if the implementation and the fixture were
   * wrong in the same way, and the failure mode this guards is subtle: drop the `blob <len>\0`
   * header, or measure the length in characters instead of bytes, and you still get a stable
   * 40-character hex string that is simply never equal to anything in the repository. Asking
   * `git hash-object` is the only check that can tell those apart.
   */
  it.each([
    ["plain ascii", "hello\n"],
    ["empty", ""],
    ["no trailing newline", "no newline"],
    // The case a character-length implementation gets wrong. Every em dash, curly quote and accented
    // brand name in the corpus is multi-byte, so this is the common case here, not an exotic one.
    ["multi-byte characters", "an em dash — and a curly quote ’ and café\n"],
    ["emoji beyond the BMP", "🚀\n"],
    ["crlf line endings", "a\r\nb\r\n"],
  ])("matches `git hash-object` for %s", async (_label, content) => {
    const { gitBlobSha } = await import("@/lib/githubArticleCommit");

    const expected = execFileSync("git", ["hash-object", "--stdin"], {
      input: Buffer.from(content, "utf-8"),
      encoding: "utf-8",
    }).trim();

    expect(gitBlobSha(content)).toBe(expected);
  });
});

describe("commitRefreshedArticles: a file that moved underneath the run is not overwritten", () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = "Franscale1922";
    process.env.GITHUB_REPO_NAME = "waypoint-core-system";
    process.env.GITHUB_BRANCH = "main";
    fetchMock = githubApiMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("commits an article whose blob on the branch is still the one it read", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    const outcome = await commitRefreshedArticles([payload("alpha")]);

    expect(outcome.committed).toEqual(["alpha"]);
    expect(outcome.conflicted).toEqual([]);
    expect(outcome.commitSha).toBe("newsha");
    expect(wrote(fetchMock)).toEqual({ blobs: 1, patched: true });
  });

  /**
   * The core case. The article is entirely valid; somebody simply edited it after this run read it.
   */
  it("skips an article whose blob changed, and never creates a blob for it", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    // The run was built on BASE_SHA; the branch now holds something else.
    const outcome = await commitRefreshedArticles([payload("alpha", OTHER_SHA)]);

    expect(outcome.committed).toEqual([]);
    expect(outcome.conflicted).toHaveLength(1);
    expect(outcome.conflicted[0].slug).toBe("alpha");
    expect(outcome.conflicted[0].reason).toMatch(/changed on main after this refresh read it/);
    // The consequence, which is the part that matters: nothing was written at all.
    expect(wrote(fetchMock)).toEqual({ blobs: 0, patched: false });
    expect(outcome.commitSha).toBeNull();
  });

  it("commits the untouched articles and skips only the conflicted one", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    const outcome = await commitRefreshedArticles([
      payload("alpha"),
      payload("beta", OTHER_SHA),
    ]);

    // One conflict does not take the month's other refreshes down with it — the same reasoning that
    // makes the per-article validation in src/inngest/functions.ts drop rather than throw.
    expect(outcome.committed).toEqual(["alpha"]);
    expect(outcome.conflicted.map((c) => c.slug)).toEqual(["beta"]);
    expect(wrote(fetchMock)).toEqual({ blobs: 1, patched: true });

    // And the tree it built names only the survivor, so `beta` is not silently carried along.
    const treeCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/git/trees") && (init as { method?: string })?.method === "POST",
    );
    const paths = JSON.parse((treeCall![1] as { body: string }).body).tree.map(
      (entry: { path: string }) => entry.path,
    );
    expect(paths).toEqual(["content/articles/alpha.md"]);
  });

  it("treats a file that no longer exists on the branch as a conflict, not as a new file", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    // `alpha` was deleted or renamed after the refresh read it. Re-creating it here would silently
    // revert that deletion, so it is declined for the same reason an edit is.
    fetchMock = githubApiMock({ entries: [] });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await commitRefreshedArticles([payload("alpha")]);

    expect(outcome.committed).toEqual([]);
    expect(outcome.conflicted[0].reason).toMatch(/no longer exists on main/);
    expect(wrote(fetchMock)).toEqual({ blobs: 0, patched: false });
  });

  /**
   * The duplicate-commit case, which this fixes without a second mechanism.
   *
   * If the ref PATCH succeeded but its response was lost, Inngest retries the step. The retry reads
   * the NEW head, whose tree already holds this run's own bytes on every path it was going to write.
   * None of them match the recorded base SHAs any more, so every article conflicts and nothing is
   * committed. Before the CAS, that retry produced a second commit with an identical tree.
   */
  it("creates no commit at all when every article conflicts", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    fetchMock = githubApiMock({
      entries: [
        { path: "content/articles/alpha.md", sha: OTHER_SHA, type: "blob" },
        { path: "content/articles/beta.md", sha: OTHER_SHA, type: "blob" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await commitRefreshedArticles([payload("alpha"), payload("beta")]);

    expect(outcome.committed).toEqual([]);
    expect(outcome.conflicted).toHaveLength(2);
    expect(outcome.commitSha).toBeNull();
    expect(wrote(fetchMock)).toEqual({ blobs: 0, patched: false });
    // Not even an empty tree or commit object was created — the run stops before any of that.
    const posts = fetchMock.mock.calls.filter(
      ([, init]) => (init as { method?: string })?.method === "POST",
    );
    expect(posts).toEqual([]);
  });

  /**
   * Fail closed. A truncated listing is missing paths, and a missing path is indistinguishable from
   * a deleted file — which would make every affected article look like a conflict, or, if the
   * default went the other way, make an unverified overwrite look approved.
   */
  it("refuses the batch rather than guessing when GitHub truncates the tree", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    fetchMock = githubApiMock({ truncated: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(commitRefreshedArticles([payload("alpha")])).rejects.toThrow(/truncated the tree/);
    expect(wrote(fetchMock)).toEqual({ blobs: 0, patched: false });
  });

  /**
   * Ordering, asserted directly because it is the whole design.
   *
   * The check is worth having only if it happens as late as possible — after HEAD is read, so it
   * sees the branch as it is at write time. Move it earlier (say, at generation) and it reopens
   * exactly the window it was built to close, while still passing every other test in this file.
   */
  it("reads the branch's current tree before it creates the first blob", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await commitRefreshedArticles([payload("alpha")]);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    const treeRead = urls.findIndex((url) => url.includes("/git/trees/treesha"));
    const firstBlob = urls.findIndex((url) => url.endsWith("/git/blobs"));

    expect(treeRead).toBeGreaterThanOrEqual(0);
    expect(firstBlob).toBeGreaterThanOrEqual(0);
    expect(treeRead).toBeLessThan(firstBlob);
  });

  it("does not consult the branch at all for an empty batch", async () => {
    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    const outcome = await commitRefreshedArticles([]);

    expect(outcome).toEqual({ committed: [], conflicted: [], commitSha: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
