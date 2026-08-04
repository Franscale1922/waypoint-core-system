/**
 * Slug containment on the article-reading path.
 *
 * getArticleBySlug and getRelatedArticles previously did
 * `nodePath.join(articlesDir, slug + ".md")` with no validation, so a
 * frontmatter-supplied relatedSlugs entry or a route param reached the
 * filesystem unchecked.
 *
 * Probed against production before this change (10+ traversal encodings:
 * raw, single- and double-encoded ../, backslash, ....//): none reached the
 * filesystem, because Next.js normalizes the slug segment before either
 * route handler runs. This is therefore defense in depth, and these tests
 * exercise the LIBRARY function directly rather than re-probing routing,
 * which is not this test's job.
 *
 * Both real callers are exercised, because dynamicParams = false on the page
 * route cannot protect the second one: articleMarkdown() is reached through
 * a catch-all ROUTE HANDLER (src/app/api/md/[...path]/route.ts), and route
 * handlers ignore dynamicParams entirely.
 */

import { describe, it, expect } from "vitest";
import { getArticleBySlug, getRelatedArticles } from "@/lib/articles";
import { articleMarkdown } from "@/lib/markdown-views";

// A real slug known to exist in content/articles, used as a positive control
// so a containment bug that also breaks legitimate reads is not mistaken for
// a working guard.
const REAL_SLUG = "fdd-decoded-what-actually-matters";

const TRAVERSAL_PAYLOADS = [
  "../CONTENT-CALENDAR",
  "../../package",
  "..%2FCONTENT-CALENDAR",
  "..\\CONTENT-CALENDAR",
  "content/articles/fdd-decoded-what-actually-matters", // path separator, not a slug
  "/etc/passwd",
  "fdd-decoded-what-actually-matters/../../../CONTENT-CALENDAR",
];

describe("getArticleBySlug", () => {
  it("reads a real article", () => {
    expect(getArticleBySlug(REAL_SLUG)?.meta.slug).toBe(REAL_SLUG);
  });

  it.each(TRAVERSAL_PAYLOADS)("rejects %s rather than reading outside content/articles", (payload) => {
    expect(getArticleBySlug(payload)).toBeNull();
  });

  it("rejects a slug that resolves to a real, non-article file", () => {
    // CONTENT-CALENDAR.md exists as a sibling of content/articles/, one level
    // up. This is the exact file Codex's briefed traversal targeted.
    expect(getArticleBySlug("../CONTENT-CALENDAR")).toBeNull();
  });
});

describe("getRelatedArticles", () => {
  it("resolves real related slugs and silently drops a traversal-shaped one", () => {
    const result = getRelatedArticles([REAL_SLUG, "../CONTENT-CALENDAR"]);
    expect(result.map((a) => a.slug)).toEqual([REAL_SLUG]);
  });

  it.each(TRAVERSAL_PAYLOADS)("never resolves %s", (payload) => {
    expect(getRelatedArticles([payload])).toEqual([]);
  });
});

describe("articleMarkdown (the second caller, unprotected by dynamicParams)", () => {
  it("renders a real article", () => {
    expect(articleMarkdown(REAL_SLUG)).toContain("FDD Decoded");
  });

  it.each(TRAVERSAL_PAYLOADS)("returns null for %s rather than reading outside content/articles", (payload) => {
    expect(articleMarkdown(payload)).toBeNull();
  });
});
