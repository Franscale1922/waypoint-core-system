/**
 * Read-side slug containment in src/lib/articles.ts.
 *
 * The WRITE path (which file the AI refresh commits to) is guarded separately
 * by SLUG_PATTERN and validateArticlePayload in src/lib/githubArticleCommit.ts,
 * covered by tests/unit/write-path-fields.test.ts. This file is the READ side:
 * which file a request is allowed to make the site open.
 *
 * Probed against production before this guard existed (17 encodings: raw,
 * single- and double-encoded ../, backslash, ....//, across both the HTML route
 * and its .md markdown-negotiation variant): none reached the filesystem,
 * because Next.js normalizes the slug segment before either route runs. So this
 * is defense in depth, and these tests exercise the LIBRARY function directly
 * rather than re-probing routing, which is not this test's job.
 *
 * Both real callers matter, because `dynamicParams = false` on the page route
 * cannot protect the second one: articleMarkdown() is reached through a
 * catch-all ROUTE HANDLER (src/app/api/md/[...path]/route.ts), and route
 * handlers ignore dynamicParams entirely.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { getArticleBySlug, getRelatedArticles, isArticleSlug } from "@/lib/articles";
import { articleMarkdown } from "@/lib/markdown-views";
// The write-path grammar. Imported so the read and write sides cannot drift.
import { SLUG_PATTERN } from "@/lib/githubArticleCommit";

const REAL_SLUG = "fdd-decoded-what-actually-matters";

const TRAVERSAL_PAYLOADS = [
  "../CONTENT-CALENDAR",
  "../../package",
  "..%2FCONTENT-CALENDAR",
  "..\\CONTENT-CALENDAR",
  "content/articles/fdd-decoded-what-actually-matters", // separator, not a slug
  "/etc/passwd",
  "fdd-decoded-what-actually-matters/../../../CONTENT-CALENDAR",
];

describe("isArticleSlug", () => {
  it("accepts the real slug grammar and rejects everything else", () => {
    expect(isArticleSlug(REAL_SLUG)).toBe(true);
    expect(isArticleSlug("new_guide")).toBe(false); // underscore
    expect(isArticleSlug("New-Guide")).toBe(false); // uppercase
    expect(isArticleSlug("../CONTENT-CALENDAR")).toBe(false);
  });

  it("agrees with the write path's SLUG_PATTERN", () => {
    const cases = [
      REAL_SLUG, "a", "a-b-c", "abc123", "new_guide", "New-Guide", "-leading",
      "trailing-", "double--hyphen", "../CONTENT-CALENDAR", "with space", "",
      "with.dot", "with/slash",
    ];
    for (const value of cases) {
      expect(
        isArticleSlug(value),
        `read-side grammar disagreed with githubArticleCommit SLUG_PATTERN on ${JSON.stringify(value)}`,
      ).toBe(SLUG_PATTERN.test(value));
    }
  });
});

describe("getArticleBySlug", () => {
  it("reads a real article", () => {
    expect(getArticleBySlug(REAL_SLUG)?.meta.slug).toBe(REAL_SLUG);
  });

  it.each(TRAVERSAL_PAYLOADS)("rejects %s rather than reading outside content/articles", (payload) => {
    expect(getArticleBySlug(payload)).toBeNull();
  });

  it("rejects a slug resolving to a real, non-article file one level up", () => {
    // content/CONTENT-CALENDAR.md exists as a sibling of content/articles/.
    // This is the exact file the original traversal finding targeted.
    expect(getArticleBySlug("../CONTENT-CALENDAR")).toBeNull();
  });
});

describe("getRelatedArticles", () => {
  it("resolves real related slugs and silently drops a traversal-shaped one", () => {
    expect(getRelatedArticles([REAL_SLUG, "../CONTENT-CALENDAR"]).map((a) => a.slug))
      .toEqual([REAL_SLUG]);
  });

  it.each(TRAVERSAL_PAYLOADS)("never resolves %s", (payload) => {
    expect(getRelatedArticles([payload])).toEqual([]);
  });
});

describe("articleMarkdown (the caller dynamicParams cannot protect)", () => {
  it("renders a real article", () => {
    expect(articleMarkdown(REAL_SLUG)).toContain("FDD Decoded");
  });

  it.each(TRAVERSAL_PAYLOADS)("returns null for %s", (payload) => {
    expect(articleMarkdown(payload)).toBeNull();
  });
});

// ── Filesystem-level guards, against a temp content dir ──────────────────────
// articlesDir is computed once at module load from process.cwd(), so these mock
// cwd and reset modules per test rather than touching tracked content.

describe("filesystem-level guards", () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "articles-containment-"));
    mkdirSync(join(tmpDir, "content", "articles"), { recursive: true });
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.resetModules();
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(dir: string, name: string, fm: Record<string, unknown>) {
    writeFileSync(join(dir, name), matter.stringify("body", fm));
  }

  const FM = { title: "T", date: "2026-01-01", category: "Getting Started", tier: 1, excerpt: "E" };

  it("discovery skips a filename resolution would refuse", async () => {
    const dir = join(tmpDir, "content", "articles");
    write(dir, "valid-slug.md", FM);
    // Before this filter, getAllArticles indexed this into every list, feed and
    // sitemap while getArticleBySlug("new_guide") returned null: every
    // advertised link 404'd.
    write(dir, "new_guide.md", { ...FM, title: "Bad Filename" });

    const mod = await import("@/lib/articles");
    const slugs = mod.getAllArticles().map((a) => a.slug);

    expect(slugs).toEqual(["valid-slug"]);
    expect(mod.getArticleBySlug("new_guide")).toBeNull();
    expect(mod.getArticleBySlug("valid-slug")).not.toBeNull();
  });

  it("refuses to read through a symlink whose own name and location are valid", async () => {
    const dir = join(tmpDir, "content", "articles");
    write(dir, "real-article.md", { ...FM, title: "Real" });
    const outside = join(tmpDir, "SECRET.md");
    writeFileSync(outside, "leaked content");
    // Name is a valid slug shape and location is correctly under
    // content/articles, so a format-and-containment-only guard passes it, but
    // readFileSync follows the link out of the directory.
    symlinkSync(outside, join(dir, "sneaky-symlink.md"));

    const mod = await import("@/lib/articles");
    expect(mod.getArticleBySlug("sneaky-symlink")).toBeNull();
    expect(mod.getArticleBySlug("real-article")?.meta.slug).toBe("real-article");
  });

  it("groups a prototype-colliding category without crashing", async () => {
    const dir = join(tmpDir, "content", "articles");
    // A truthy check resolves grouped["constructor"] to the inherited Object
    // constructor and .push() throws, taking down every category index.
    write(dir, "weird-category.md", { ...FM, title: "Weird", category: "constructor" });

    const mod = await import("@/lib/articles");
    expect(() => mod.getArticlesByCategory()).not.toThrow();
    const grouped = mod.getArticlesByCategory();
    expect(Array.isArray(grouped["constructor"])).toBe(true);
    expect(grouped["constructor"]).toHaveLength(1);
    // Must stay a PLAIN object: this result crosses a Server to Client
    // Component boundary and Next's RSC serialization rejects a null prototype.
    expect(Object.getPrototypeOf(grouped)).toBe(Object.prototype);
  });
});
