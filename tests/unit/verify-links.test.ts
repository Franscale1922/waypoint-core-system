import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  slugFromFilename,
  extractRelatedSlugs,
  verifyArticleLinks,
  DEFAULT_ARTICLES_DIR,
} from "../../scripts/verify-links.mjs";

/**
 * verify-links.mjs guards a silent production failure: src/lib/articles.ts reads
 * relatedSlugs through gray-matter and DROPS entries whose file is missing, so a
 * typo'd slug degrades the related-articles rail with no error anywhere.
 *
 * The bug these tests exist to prevent is not "a broken slug slipped through" —
 * it is "the checker silently stopped extracting anything and kept reporting
 * success." The previous implementation matched relatedSlugs with a regex that
 * only understood single-line flow arrays; every article uses YAML block-list
 * style, so it extracted zero slugs from all 45 files and printed a green pass
 * for months.
 *
 * So the load-bearing assertion throughout is `checkedSlugs > 0`, not merely
 * `errors` being empty. A checker that extracts nothing must FAIL these tests,
 * not pass them — which is also why the fixtures below are written in the same
 * block-list style the real articles use, rather than whatever style happens to
 * be convenient.
 */

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "verify-links-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Write an article fixture. `slugs` as an array emits YAML block-list style
 * (what every real article uses); as a string it is emitted verbatim so a test
 * can supply raw YAML; omitted means no relatedSlugs key at all.
 */
function writeArticle(
  filename: string,
  { slugs, body = "Body text.\n" }: { slugs?: string[] | string; body?: string } = {},
): void {
  const lines = ["---", `title: "${filename}"`];
  if (Array.isArray(slugs)) {
    lines.push("relatedSlugs:");
    for (const slug of slugs) lines.push(`  - "${slug}"`);
  } else if (typeof slugs === "string") {
    lines.push(`relatedSlugs: ${slugs}`);
  }
  lines.push("---", "");
  writeFileSync(join(dir, filename), lines.join("\n") + body);
}

describe("verifyArticleLinks: the repo's real block-list front-matter format", () => {
  it("passes when every slug resolves AND proves it actually checked them", () => {
    writeArticle("alpha.md", { slugs: ["beta", "gamma"] });
    writeArticle("beta.md", { slugs: ["alpha"] });
    writeArticle("gamma.md", { slugs: ["alpha", "beta"] });

    const { fileCount, checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toEqual([]);
    expect(fileCount).toBe(3);
    // The regression guard. The ORIGINAL bug also produced errors === [], but
    // with checkedSlugs === 0. Asserting the count is what separates the two.
    expect(checkedSlugs).toBe(5);
  });

  it("reports a dangling slug", () => {
    writeArticle("alpha.md", { slugs: ["beta", "does-not-exist"] });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(checkedSlugs).toBe(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("alpha.md");
    expect(errors[0]).toContain("does-not-exist");
  });

  it("still understands inline flow-array style, since YAML accepts both", () => {
    writeArticle("alpha.md", { slugs: '["beta", "missing-one"]' });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(checkedSlugs).toBe(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("missing-one");
  });

  it("treats an article with no relatedSlugs key as contributing nothing", () => {
    writeArticle("alpha.md", { slugs: ["beta"] });
    writeArticle("beta.md");

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toEqual([]);
    expect(checkedSlugs).toBe(1);
  });
});

describe("verifyArticleLinks: front matter is the only source of truth", () => {
  it("ignores a relatedSlugs line inside a fenced code block in the body", () => {
    // The old implementation regex-scanned the whole document, so an article
    // documenting the front-matter format would have had its code sample
    // checked as if it were real metadata.
    const fence = "```";
    const body = [
      "Here is how the front matter looks:",
      "",
      `${fence}yaml`,
      'relatedSlugs: ["ghost-slug-from-a-code-sample"]',
      fence,
      "",
    ].join("\n");

    writeArticle("alpha.md", { slugs: ["beta"], body });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toEqual([]);
    expect(checkedSlugs).toBe(2);
  });

  it("does not let a body mention supply slugs for a file that declares none", () => {
    // The body slug deliberately does NOT resolve: a whole-document scanner
    // would pick it up and report it broken, so this test distinguishes the two
    // implementations. With a resolvable body slug it would pass either way.
    writeArticle("alpha.md", { body: 'relatedSlugs: ["ghost-from-body"]\n' });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toEqual([]);
    expect(checkedSlugs).toBe(1);
  });
});

describe("verifyArticleLinks: malformed relatedSlugs values", () => {
  it("rejects a relatedSlugs that is not an array", () => {
    writeArticle("alpha.md", { slugs: '"beta"' });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { errors } = verifyArticleLinks(dir);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("must be an array");
  });

  it("rejects non-string entries while still checking their valid siblings", () => {
    writeArticle("alpha.md", { slugs: '[42, "beta"]' });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("relatedSlugs[0] must be a non-empty string, got number");
    expect(checkedSlugs).toBe(2);
  });

  it("reports malformed YAML front matter instead of throwing", () => {
    writeFileSync(
      join(dir, "broken.md"),
      ["---", 'title: "x"', "relatedSlugs: [unclosed", "---", "", "Body.\n"].join("\n"),
    );
    // A second, well-formed pair so the anti-vacuity guard cannot fire. With
    // broken.md alone this directory yields zero slugs, so that guard adds a
    // second error and the assertions below could no longer tell a real YAML
    // failure from a merely-empty extraction.
    writeArticle("alpha.md", { slugs: ["beta"] });
    writeArticle("beta.md", { slugs: ["alpha"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(checkedSlugs).toBe(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("broken.md");
    expect(errors[0]).toContain("not valid YAML");
  });
});

describe("slugFromFilename: trailing extension only", () => {
  it("strips only the trailing .md", () => {
    // `"guide.md.v2.md".replace(".md", "")` yields "guide.v2.md" — the old bug.
    expect(slugFromFilename("guide.md.v2.md")).toBe("guide.md.v2");
    expect(slugFromFilename("plain.md")).toBe("plain");
    expect(slugFromFilename("dots.in.name.md")).toBe("dots.in.name");
  });

  it("lets a file whose name embeds .md resolve as a link target", () => {
    writeArticle("guide.md.v2.md", { slugs: ["alpha"] });
    writeArticle("alpha.md", { slugs: ["guide.md.v2"] });

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toEqual([]);
    expect(checkedSlugs).toBe(2);
  });
});

describe("verifyArticleLinks: the anti-vacuity guard", () => {
  it("fails when a non-empty article set yields zero slugs", () => {
    // The original bug's exact shape. A checker that stops matching the repo's
    // front-matter format lands here, and must go red rather than green.
    writeArticle("alpha.md");
    writeArticle("beta.md");

    const { checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(checkedSlugs).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Extracted 0 relatedSlugs");
  });

  it("does not fire on an empty article directory", () => {
    const { fileCount, checkedSlugs, errors } = verifyArticleLinks(dir);

    expect(errors).toEqual([]);
    expect(fileCount).toBe(0);
    expect(checkedSlugs).toBe(0);
  });
});

describe("extractRelatedSlugs", () => {
  it("returns slugs verbatim so padded values fail exactly as production does", () => {
    // src/lib/articles.ts looks up `${slug}.md` with no trimming, so a padded
    // slug is silently dropped there. Trimming here would hide that.
    const raw = ["---", "relatedSlugs:", '  - " padded "', "---", "", "Body.\n"].join("\n");
    const { slugs, errors } = extractRelatedSlugs(raw, "x.md");

    expect(errors).toEqual([]);
    expect(slugs).toEqual([" padded "]);
  });
});

describe("the real content/articles directory", () => {
  it("has every relatedSlug resolving, over a non-zero number of slugs", () => {
    // Same assertion the CLI makes, but as a test: if this repo's front-matter
    // style ever drifts from what the parser understands, this goes red here
    // rather than quietly passing in CI.
    const { fileCount, checkedSlugs, errors } = verifyArticleLinks(DEFAULT_ARTICLES_DIR);

    expect(errors).toEqual([]);
    expect(fileCount).toBeGreaterThan(0);

    // Deliberately stronger than `> 0`, because the script's own anti-vacuity
    // guard only fires at EXACTLY zero: a drift that broke extraction for 44 of
    // 45 articles would still report green. Every article declares at least one
    // relatedSlug (the real ratio is ~3 each), so per-file coverage is the honest
    // floor — and it stays true as articles are added, unlike a hard-coded 135.
    expect(checkedSlugs).toBeGreaterThanOrEqual(fileCount);
  });
});
