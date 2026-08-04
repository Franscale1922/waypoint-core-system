/**
 * Regression tests for findings from the round-1 Codex adversarial review of
 * this branch's diff (articles.ts, articleDate.ts, contentRefresh.ts,
 * githubArticleCommit.ts). Each finding below was verified against the real
 * code before being fixed; this file is the proof the fix does something.
 *
 * The articles.ts tests use a temp directory rather than real content/, so
 * they can create a malformed filename and a symlink without ever touching
 * tracked content. process.cwd() is mocked and modules are reset per test
 * because articlesDir is computed ONCE at module load from process.cwd().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";

let tmpDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

function writeArticle(articlesDir: string, filename: string, frontmatter: Record<string, unknown>) {
  writeFileSync(join(articlesDir, filename), matter.stringify("body", frontmatter));
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "articles-adv-review-"));
  mkdirSync(join(tmpDir, "content", "articles"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
  vi.resetModules();
});

afterEach(() => {
  cwdSpy.mockRestore();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("isArticleSlug", () => {
  it("accepts the real slug grammar and rejects everything else", async () => {
    const { isArticleSlug } = await import("@/lib/articles");
    expect(isArticleSlug("fdd-decoded-what-actually-matters")).toBe(true);
    expect(isArticleSlug("new_guide")).toBe(false); // underscore
    expect(isArticleSlug("New-Guide")).toBe(false); // uppercase
    expect(isArticleSlug("../CONTENT-CALENDAR")).toBe(false);
  });
});

describe("getAllArticles: discovery/resolution grammar consistency", () => {
  it("skips a filename discovery previously advertised but resolution would 404", async () => {
    const articlesDir = join(tmpDir, "content", "articles");
    writeArticle(articlesDir, "valid-slug.md", {
      title: "Valid", date: "2026-01-01", category: "Getting Started", tier: 1, excerpt: "E",
    });
    // The bug: getAllArticles filtered only on ".md", with no slug-grammar
    // check, so this filename was indexed everywhere while
    // getArticleBySlug("new_guide"), gated by the stricter grammar added for
    // slug containment, returned null. Every advertised link 404'd.
    writeArticle(articlesDir, "new_guide.md", {
      title: "Bad Filename", date: "2026-01-01", category: "Getting Started", tier: 1, excerpt: "E",
    });

    const { getAllArticles, getArticleBySlug } = await import("@/lib/articles");
    const slugs = getAllArticles().map((a) => a.slug);

    expect(slugs).toEqual(["valid-slug"]);
    expect(slugs).not.toContain("new_guide");
    // The article getAllArticles skipped must ALSO not be readable directly:
    // discovery and resolution must agree in both directions.
    expect(getArticleBySlug("new_guide")).toBeNull();
    expect(getArticleBySlug("valid-slug")).not.toBeNull();
  });
});

describe("getArticleBySlug: symlink rejection", () => {
  it("refuses to read through a symlink even when its own name and location are a valid slug", async () => {
    const articlesDir = join(tmpDir, "content", "articles");
    writeArticle(articlesDir, "real-article.md", {
      title: "Real", date: "2026-01-01", category: "Getting Started", tier: 1, excerpt: "E",
    });
    // A file OUTSIDE content/articles that a symlink will point to.
    const outsideTarget = join(tmpDir, "SECRET.md");
    writeFileSync(outsideTarget, "leaked content");

    // The symlink's own name is a perfectly valid slug shape, and its own
    // location is correctly under content/articles: both checks a
    // format-and-containment-only guard would pass, but readFileSync
    // follows the link to a file this function was never meant to expose.
    symlinkSync(outsideTarget, join(articlesDir, "sneaky-symlink.md"));

    const { getArticleBySlug } = await import("@/lib/articles");
    expect(getArticleBySlug("sneaky-symlink")).toBeNull();
    // Positive control: a real, non-symlinked article in the same directory
    // still reads fine, proving the guard isn't blocking everything.
    expect(getArticleBySlug("real-article")?.meta.slug).toBe("real-article");
  });
});

describe("getArticlesByCategory: prototype-safe grouping", () => {
  it("does not crash or leak an inherited method for a colliding category value", async () => {
    const articlesDir = join(tmpDir, "content", "articles");
    // A plain `{}` accumulator resolves `grouped["constructor"]` to the
    // inherited Object constructor function rather than undefined, so
    // `.push()` on it throws and takes the whole index down with it.
    writeArticle(articlesDir, "weird-category.md", {
      title: "Weird", date: "2026-01-01", category: "constructor", tier: 1, excerpt: "E",
    });

    const { getArticlesByCategory } = await import("@/lib/articles");
    expect(() => getArticlesByCategory()).not.toThrow();
    const grouped = getArticlesByCategory();
    expect(Array.isArray(grouped["constructor"])).toBe(true);
    expect(grouped["constructor"]).toHaveLength(1);
  });
});

// ─── articleDate.ts ───────────────────────────────────────────────────────

describe("revisionUpdatedAt", () => {
  it("does not echo back a syntactically-shaped but impossible date", async () => {
    const { revisionUpdatedAt } = await import("@/lib/articleDate");
    // Reproduced directly: "2026-08-04" < "2026-13-01" is TRUE as a plain
    // string comparison, so the pre-fix code returned the malformed value
    // unchanged instead of falling back to today.
    expect("2026-08-04" < "2026-13-01").toBe(true);
    expect(revisionUpdatedAt("2026-13-01", "2026-08-04")).toBe("2026-08-04");
  });

  it("falls back to today for a non-string or missing publication date", async () => {
    const { revisionUpdatedAt } = await import("@/lib/articleDate");
    expect(revisionUpdatedAt(undefined, "2026-08-04")).toBe("2026-08-04");
    expect(revisionUpdatedAt(new Date("2026-01-01"), "2026-08-04")).toBe("2026-08-04");
  });

  it("still clamps updatedAt to a real, past-or-present publication date", async () => {
    const { revisionUpdatedAt } = await import("@/lib/articleDate");
    expect(revisionUpdatedAt("2026-01-15", "2026-08-04")).toBe("2026-08-04");
  });
});

describe("daysSinceArticleDate: calendar-day arithmetic, not local-noon elapsed time", () => {
  it("counts a full calendar year as exactly 365 days regardless of time-of-day", async () => {
    const { daysSinceArticleDate } = await import("@/lib/articleDate");
    // The exact scenario Codex reproduced: an article touched 2025-08-01,
    // cadence check running early on the anniversary date. A local-noon
    // millisecond comparison in a negative-offset zone reads this as 364.83
    // days old, short of a 365-day cadence, and defers the refresh a full
    // month. Calendar-day arithmetic reads it as exactly 365 regardless of
    // what hour the check runs.
    const now = new Date("2026-08-01T08:00:00Z");
    expect(daysSinceArticleDate("2025-08-01", now)).toBe(365);
  });

  it("is independent of the process's local timezone", async () => {
    const { daysSinceArticleDate } = await import("@/lib/articleDate");
    const now = new Date("2026-08-01T23:00:00Z");
    // Same UTC calendar-date difference regardless of what TZ this process
    // happens to run under: the whole point of using UTC.getUTCFullYear()
    // etc. instead of local-time Date arithmetic.
    expect(daysSinceArticleDate("2025-08-01", now)).toBe(365);
  });

  it("returns null for an unvalidatable date instead of NaN", async () => {
    const { daysSinceArticleDate } = await import("@/lib/articleDate");
    expect(daysSinceArticleDate("2026-02-30", new Date())).toBeNull();
  });
});

describe("isStale: boundary correctness using the fixed calendar-day math", () => {
  it("flags an article exactly at its cadence boundary, at any hour", async () => {
    const { isStale } = await import("@/lib/contentRefresh");
    const article = {
      slug: "test-article",
      frontmatter: {
        title: "T", slug: "test-article", date: "2025-08-01", category: "Getting Started",
        tier: 1, excerpt: "E", relatedSlugs: [],
      },
      body: "body",
      filePath: "/tmp/test-article.md",
    };

    vi.useFakeTimers();
    // Early in the day, UTC, on the exact 365-day anniversary. The pre-fix
    // local-noon millisecond comparison could read this as just under 365
    // days and defer to next month; calendar-day arithmetic does not.
    vi.setSystemTime(new Date("2026-08-01T01:00:00Z"));
    try {
      expect(isStale(article)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── githubArticleCommit.ts ─────────────────────────────────────────────────

describe("commitRefreshedArticles: rejects a malformed commit-payload slug", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = "test-owner";
    process.env.GITHUB_REPO_NAME = "test-repo";
  });

  it("refuses to build a Tree API path from a traversal-shaped slug", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      // Only the ref/commit-lookup GETs before the blob loop need a response;
      // a malformed slug must throw before any blob POST is attempted.
      if (url.includes("/git/ref/heads/")) {
        return new Response(JSON.stringify({ object: { sha: "abc123" } }), { status: 200 });
      }
      if (url.includes("/git/commits/abc123")) {
        return new Response(JSON.stringify({ tree: { sha: "tree123" } }), { status: 200 });
      }
      throw new Error(`Unexpected fetch during rejection test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { commitRefreshedArticles } = await import("@/lib/githubArticleCommit");

    await expect(
      commitRefreshedArticles([
        {
          slug: "../../CONTENT-CALENDAR",
          frontmatter: {
            title: "T", slug: "../../CONTENT-CALENDAR", date: "2026-01-01",
            category: "Getting Started", tier: 1, excerpt: "E", relatedSlugs: [],
          },
          body: "body",
        },
      ]),
    ).rejects.toThrow(/not a valid article slug/);

    // The rejection happens inside the blob-creation loop, before any POST
    // to /git/blobs, confirming no blob request was ever attempted.
    const blobCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/git/blobs"));
    expect(blobCalls).toHaveLength(0);

    vi.unstubAllGlobals();
  });
});
