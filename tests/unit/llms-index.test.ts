/**
 * /llms.txt: the generated agent index, and the gate that keeps it honest.
 *
 * Two distinct things are under test and they fail for different reasons:
 *
 *   1. The GENERATOR (src/lib/llms-index.ts) actually derives from content. The
 *      file it replaced was hand-typed and drifted 13 routes behind the site
 *      while linking none of the 45 articles. "Derives" is proved by injecting
 *      content the real corpus does not contain and watching the output change -
 *      a hardcoded list cannot pass that.
 *
 *   2. The GATE (scripts/lib/route-inventory.mjs) discriminates. Every check
 *      below is paired with a seeded defect proving it FAILS when it should,
 *      because - as tests/unit/faq-visibility.test.ts puts it - a gate that has
 *      only ever been observed passing is not known to work. This repo has
 *      shipped that exact bug twice (verify-links.mjs reported green while
 *      checking zero slugs).
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectStaticRoutes,
  checkRouteInventory,
  extractSiteLinks,
} from "../../scripts/lib/route-inventory.mjs";

import {
  staticPages,
  buildLlmsIndex,
  defaultLlmsContent,
  llmsIndexText,
  type LlmsContent,
} from "@/lib/llms-index";
import { isMarkdownNegotiable } from "@/lib/markdown-negotiable";
import { SITE_URL, categoryNameFromSlug } from "@/lib/markdown-views";
import {
  getAllArticles,
  getArticleBySlug,
  getArticlesByCategory,
  type Article,
} from "@/lib/articles";
import { getIndustry, getIndustryCost } from "@/data/industries";
import { getFinancingGuide } from "@/data/financing";
import { allGlossaryEntries } from "@/data/glossary";

const APP_DIR = "src/app";

function seedApp(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "route-inventory-"));
  for (const rel of files) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, "export default function Page() { return null; }\n");
  }
  return root;
}

function article(over: Partial<Article> = {}): Article {
  return {
    slug: "synthetic-probe-article",
    title: "Synthetic Probe Article",
    date: "2026-01-01",
    category: "Getting Started",
    tier: 1,
    excerpt: "A probe article that exists only in this test.",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// 1. The scanner discriminates (seeded temp trees, not the real repo)
// ---------------------------------------------------------------------------
describe("collectStaticRoutes", () => {
  it("keeps static pages, strips route groups, drops dynamic and admin routes", () => {
    const root = seedApp([
      "(marketing)/page.tsx",                    // -> "/"
      "(marketing)/fake-page/page.tsx",          // -> "/fake-page"
      "(marketing)/nested/deep/page.tsx",        // -> "/nested/deep"
      "(marketing)/resources/[slug]/page.tsx",   // dynamic -> dropped
      "(marketing)/x/[...rest]/page.tsx",        // catch-all -> dropped
      "(marketing)/y/[[...opt]]/page.tsx",       // optional catch-all -> dropped
      "admin/thing/page.tsx",                    // ignored
      "(marketing)/some/layout.tsx",             // not a page
    ]);
    try {
      expect(collectStaticRoutes({ appDir: root })).toEqual([
        "/",
        "/fake-page",
        "/nested/deep",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("excludes Next private folders, which serve no URL", () => {
    const root = seedApp([
      "(marketing)/real/page.tsx",
      "(marketing)/_draft/page.tsx",          // private: not routable
      "(marketing)/_lib/nested/page.tsx",     // descendants excluded too
    ]);
    try {
      expect(collectStaticRoutes({ appDir: root })).toEqual(["/real"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed on segment shapes it cannot resolve, rather than guessing", () => {
    // An intercepting route looks like a route group and would be silently
    // stripped to the wrong URL. Refusing is the point.
    for (const seg of ["(.)photo", "(..)feed", "@modal"]) {
      const root = seedApp([`(marketing)/${seg}/page.tsx`]);
      try {
        expect(() => collectStaticRoutes({ appDir: root })).toThrow(/unsupported/);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });
});

describe("checkRouteInventory", () => {
  it("reports a page that exists but is undeclared", () => {
    const root = seedApp(["(marketing)/a/page.tsx", "(marketing)/b/page.tsx"]);
    try {
      const { errors } = checkRouteInventory({ appDir: root, declared: ["/a"] });
      expect(errors.join("\n")).toMatch(/not described in staticPages: \/b/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a declared page that does not exist", () => {
    const root = seedApp(["(marketing)/a/page.tsx"]);
    try {
      const { errors } = checkRouteInventory({ appDir: root, declared: ["/a", "/ghost"] });
      expect(errors.join("\n")).toMatch(/does not exist: \/ghost/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a vacuous pass when the scan finds no pages at all", () => {
    const root = mkdtempSync(join(tmpdir(), "route-inventory-empty-"));
    try {
      const { errors, checked } = checkRouteInventory({ appDir: root, declared: [] });
      // An empty declared list against an empty tree is trivially "consistent".
      // Passing there is how a broken walk reports green.
      expect(checked).toBe(0);
      expect(errors.join("\n")).toMatch(/found nothing/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 2. The real repo agrees with the declared list
// ---------------------------------------------------------------------------
describe("staticPages matches the real route tree", () => {
  it("declares every static page, and no page that does not exist", () => {
    const { errors, checked } = checkRouteInventory({
      appDir: APP_DIR,
      declared: staticPages.map((p) => p.path),
    });
    expect(errors).toEqual([]);
    expect(checked).toBeGreaterThan(20);
  });

  it("gives every article category an index page", () => {
    // Categories come from article front matter, so a new `category:` value
    // creates a section with no /resources/<slug> page behind it. Discovery must
    // never advertise a link resolution would refuse.
    const declaredFor = new Set(
      staticPages.filter((p) => p.categoryFor).map((p) => p.categoryFor),
    );
    for (const name of Object.keys(getArticlesByCategory())) {
      expect(declaredFor.has(name), `no category index page declared for "${name}"`).toBe(true);
    }
  });

  it("has no duplicate paths", () => {
    const paths = staticPages.map((p) => p.path);
    expect(paths.length).toBe(new Set(paths).size);
  });

  it("gives every page a non-empty title and blurb", () => {
    for (const p of staticPages) {
      expect(p.title.trim(), `empty title for ${p.path}`).not.toBe("");
      expect(p.blurb.trim(), `empty blurb for ${p.path}`).not.toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// 3. The output is DERIVED, not enumerated
// ---------------------------------------------------------------------------
describe("buildLlmsIndex derives from its content", () => {
  it("links a synthetic article that the real corpus does not contain", () => {
    const base = defaultLlmsContent();
    const probe = article();
    const injected: LlmsContent = {
      ...base,
      articlesByCategory: {
        ...base.articlesByCategory,
        "Getting Started": [...base.articlesByCategory["Getting Started"], probe],
      },
    };

    const withProbe = buildLlmsIndex(injected);
    const real = llmsIndexText();

    // Derived: the injected article appears...
    expect(withProbe).toContain(`/resources/${probe.slug}.md`);
    expect(withProbe).toContain(probe.title);
    // ...and exactly one line was added to that section.
    expect(withProbe.split("\n").length).toBe(buildLlmsIndex(base).split("\n").length + 1);
    // Not enumerated: the real file does NOT contain it. If the builder ignored
    // its argument and read the modules directly, the first assertion would fail;
    // if it echoed a hardcoded list, this one would.
    expect(real).not.toContain(probe.slug);
  });

  it("derives the article count in the resources blurb", () => {
    const base = defaultLlmsContent();
    const injected: LlmsContent = {
      ...base,
      articlesByCategory: {
        ...base.articlesByCategory,
        "Getting Started": [...base.articlesByCategory["Getting Started"], article()],
      },
    };
    const realTotal = getAllArticles().length;
    expect(buildLlmsIndex(base)).toContain(`${realTotal} articles.`);
    expect(buildLlmsIndex(injected)).toContain(`${realTotal + 1} articles.`);
  });

  it("derives the glossary, industry and financing counts", () => {
    const base = defaultLlmsContent();
    expect(buildLlmsIndex(base)).toContain(`${allGlossaryEntries.length} terms.`);
    expect(buildLlmsIndex({ ...base, glossaryCount: 7 })).toContain("7 terms.");

    const six = base.industries.slice(0, 6).map((i) => i.slug);
    // Phrasing switches on the comparison, so a gap is conspicuous rather than
    // reading as a redundant repeat of the same number.
    expect(buildLlmsIndex(base)).toContain(
      `${base.industries.length} categories, each with a cost guide.`,
    );
    expect(buildLlmsIndex({ ...base, industryCostSlugs: six })).toContain(
      `${base.industries.length} categories, 6 with a cost guide.`,
    );
  });

  it("links a synthetic financing guide, industry and cost guide", () => {
    // Counts alone let a new guide move a number while linking nothing, leaving
    // the page undiscoverable from this index. One probe per family.
    const base = defaultLlmsContent();

    const withFin = buildLlmsIndex({
      ...base,
      financingGuides: [...base.financingGuides,
        { slug: "probe-financing", name: "Probe Financing", tagline: "A probe." }],
    });
    expect(withFin).toContain("/franchise-financing/probe-financing.md");
    expect(withFin).toContain(`${base.financingGuides.length + 1} in-depth method guides.`);

    const withInd = buildLlmsIndex({
      ...base,
      industries: [...base.industries,
        { slug: "probe-industry", name: "Probe Industry", tagline: "A probe." }],
    });
    expect(withInd).toContain("/industries/probe-industry.md");

    const withCost = buildLlmsIndex({
      ...base,
      industries: [...base.industries,
        { slug: "probe-industry", name: "Probe Industry", tagline: "A probe." }],
      industryCostSlugs: [...base.industryCostSlugs, "probe-industry"],
      industryCostBands: { ...base.industryCostBands, "probe-industry": "Probe band sentence." },
    });
    expect(withCost).toContain("/industries/probe-industry/cost.md");
    expect(withCost).toContain("Probe band sentence.");

    // And none of them leak into the real document.
    const real = llmsIndexText();
    expect(real).not.toContain("probe-financing");
    expect(real).not.toContain("probe-industry");
  });

  it("emits a new section for a category it has never seen", () => {
    const base = defaultLlmsContent();
    const probe = article({ slug: "probe-in-new-category", category: "Field Notes" });
    const out = buildLlmsIndex({
      ...base,
      articlesByCategory: { ...base.articlesByCategory, "Field Notes": [probe] },
    });
    expect(out).toContain("## Articles: Field Notes");
    expect(out).toContain("/resources/probe-in-new-category.md");
  });

  it("refuses to look complete when handed no content", () => {
    // The vacuous shape: an empty corpus must not still render article links.
    const empty: LlmsContent = {
      articlesByCategory: {},
      glossaryCount: 0,
      industries: [],
      industryCostSlugs: [],
      industryCostBands: {},
      financingGuides: [],
      staticPages: [],
    };
    const out = buildLlmsIndex(empty);
    // No content in, no article links out. The count clause lives on the
    // /resources bullet, which an empty staticPages removes, so the summary line
    // is what carries the tally in this case.
    expect(extractSiteLinks(out, SITE_URL).filter((u) => u.includes("/resources/"))).toEqual([]);
    expect(out).toContain("This index covers 0 articles across 0 categories.");
    expect(out).not.toMatch(/^## Articles:/m);
  });
});

// ---------------------------------------------------------------------------
// 4. Every link the index advertises actually resolves
// ---------------------------------------------------------------------------
describe("llmsIndexText link integrity", () => {
  const body = llmsIndexText();
  const links = extractSiteLinks(body, SITE_URL);

  it("links something at all (vacuous-pass guard)", () => {
    expect(links.length).toBeGreaterThan(50);
  });

  it("appends .md only where /api/md actually RENDERS markdown", () => {
    // Checked against the renderer's own resolution, not against
    // isMarkdownNegotiable. That predicate is the middleware's PREFIX rewrite
    // rule and says yes to every path under /resources/, so testing against it
    // would only compare the generator to itself. This mirrors the closed set in
    // src/app/api/md/[...path]/route.ts.
    const renders = (path: string): boolean => {
      const seg = path.split("/").filter(Boolean);
      if (seg.length === 1) {
        return ["resources", "glossary", "faq", "franchise-financing", "industries"].includes(seg[0]);
      }
      if (seg.length === 2 && seg[0] === "resources") {
        return categoryNameFromSlug(seg[1]) !== null || getArticleBySlug(seg[1]) !== null;
      }
      if (seg.length === 2 && seg[0] === "industries") return Boolean(getIndustry(seg[1]));
      if (seg.length === 2 && seg[0] === "franchise-financing") {
        return Boolean(getFinancingGuide(seg[1]));
      }
      if (seg.length === 3 && seg[0] === "industries" && seg[2] === "cost") {
        return Boolean(getIndustryCost(seg[1]));
      }
      return false;
    };

    const bad = links
      .map((u) => u.slice(SITE_URL.length))
      .filter((p) => p.endsWith(".md"))
      .filter((p) => !renders(p.slice(0, -3)));
    expect(bad).toEqual([]);

    // The resolver must reject, or it proves nothing.
    expect(renders("/resources/archive")).toBe(false);
    expect(renders("/glossary/absentee-ownership")).toBe(false);
  });

  it("does not advertise .md for a static page under a negotiable prefix", () => {
    // The seeded defect: a real page at /resources/archive is NOT an article and
    // NOT a category, so /api/md 404s it - but isMarkdownNegotiable("/resources/
    // archive") is true, so a prefix-based link builder would publish a dead
    // .md link and the route-inventory gate would demand the entry that mints it.
    expect(isMarkdownNegotiable("/resources/archive")).toBe(true);

    const base = defaultLlmsContent();
    const out = buildLlmsIndex({
      ...base,
      staticPages: [
        ...base.staticPages,
        { path: "/resources/archive", title: "Archive", blurb: "Older material.", section: "guides" },
      ],
    });
    expect(out).toContain(`${SITE_URL}/resources/archive)`);
    expect(out).not.toContain("/resources/archive.md");
  });

  it("strips a trailing slash from the configured origin", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/);
  });

  it("never advertises a .md glossary term page, which would 404", () => {
    // /glossary is negotiable; /glossary/<term> is NOT. Appending .md to the
    // term pages would break 99 links at once with no error anywhere: the
    // middleware would not rewrite and the request would 404.
    expect(isMarkdownNegotiable("/glossary/absentee-ownership")).toBe(false);
    expect(body).not.toMatch(/\/glossary\/[a-z0-9-]+\.md/);
  });

  it("links every article, as .md", () => {
    for (const a of getAllArticles()) {
      expect(body, `article not linked: ${a.slug}`).toContain(`/resources/${a.slug}.md)`);
    }
  });

  it("links every industry, cost guide and financing guide", () => {
    const c = defaultLlmsContent();
    for (const i of c.industries) {
      expect(body, `industry not linked: ${i.slug}`).toContain(`/industries/${i.slug}.md)`);
    }
    for (const slug of c.industryCostSlugs) {
      expect(body, `cost guide not linked: ${slug}`).toContain(`/industries/${slug}/cost.md)`);
    }
    for (const g of c.financingGuides) {
      expect(body, `financing guide not linked: ${g.slug}`).toContain(
        `/franchise-financing/${g.slug}.md)`,
      );
    }
  });

  it("gives each cost guide its real investment band, not one generic line", () => {
    const c = defaultLlmsContent();
    const bands = c.industryCostSlugs.map((s) => c.industryCostBands[s]);
    for (const b of bands) expect(body).toContain(b);
    // Derived, not decorative: the bands must not all be the same sentence.
    expect(new Set(bands).size).toBe(bands.length);
  });

  it("links every declared static page", () => {
    for (const p of staticPages) {
      const expected = `${SITE_URL}${p.path}${isMarkdownNegotiable(p.path) ? ".md" : ""}`;
      expect(links, `static page not linked: ${p.path}`).toContain(expected);
    }
  });

  it("never emits a doubled slash, whatever NEXT_PUBLIC_SITE_URL carries", () => {
    // The old assertions took SITE_URL as their expectation too, so a trailing
    // slash on the env var produced ".com//about" in every link and the suite
    // still passed. Assert the SHAPE, which no shared value can satisfy by
    // accident.
    for (const url of links) {
      expect(url.slice("https://".length), `doubled slash in ${url}`).not.toContain("//");
    }
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("uses the canonical www origin everywhere", () => {
    // The defect this replaces: a literal non-www /book link, which cost a 301
    // hop on the URL an agent is most likely to follow. Assert the pattern
    // matches the old bad line, so weakening the regex is itself caught.
    const nonWww = /https:\/\/waypointfranchise\.com/;
    expect(nonWww.test("https://waypointfranchise.com/book")).toBe(true);
    expect(nonWww.test(body)).toBe(false);
  });

  it("has no article slug that a /resources/* page would shadow", () => {
    // /api/md/[...path] resolves a /resources/<seg> segment by asking
    // categoryNameFromSlug FIRST and only then falling back to the article. An
    // article slugged "getting-started" would therefore be advertised here as an
    // article and served as the category index: a link that resolves to the
    // wrong document rather than 404ing, which is harder to notice.
    const reservedLeaves = new Set(
      staticPages
        .map((p) => p.path)
        .filter((p) => p.startsWith("/resources/"))
        .map((p) => p.slice("/resources/".length)),
    );
    for (const a of getAllArticles()) {
      expect(
        reservedLeaves.has(a.slug),
        `article slug "${a.slug}" collides with the /resources/${a.slug} page`,
      ).toBe(false);
    }
    expect(reservedLeaves.size).toBeGreaterThan(0);
  });

  it("resolves every internal link to a known page, article or feed", () => {
    const c = defaultLlmsContent();
    const articleSlugs = new Set(getAllArticles().map((a) => a.slug));
    const pagePaths = new Set(staticPages.map((p) => p.path));
    const industrySlugs = new Set(c.industries.map((i) => i.slug));
    const costSlugs = new Set(c.industryCostSlugs);
    const financingSlugs = new Set(c.financingGuides.map((g) => g.slug));
    const wellKnown = new Set(["/llms-full.txt", "/sitemap.xml", "/feed.xml"]);

    // Every dynamic family is resolved against the module that generates its
    // pages, so a link to a slug no generateStaticParams produces is caught.
    const resolves = (path: string): boolean => {
      if (pagePaths.has(path) || wellKnown.has(path)) return true;
      const seg = path.split("/").filter(Boolean);
      if (seg[0] === "resources" && seg.length === 2) return articleSlugs.has(seg[1]);
      if (seg[0] === "industries" && seg.length === 2) return industrySlugs.has(seg[1]);
      if (seg[0] === "industries" && seg.length === 3 && seg[2] === "cost") {
        return costSlugs.has(seg[1]);
      }
      if (seg[0] === "franchise-financing" && seg.length === 2) {
        return financingSlugs.has(seg[1]);
      }
      return false;
    };

    for (const url of links) {
      const raw = url.slice(SITE_URL.length) || "/";
      const path = raw.endsWith(".md") ? raw.slice(0, -3) : raw;
      expect(resolves(path), `link resolves to nothing known: ${url}`).toBe(true);
    }
    // The resolver must actually reject something, or it proves nothing.
    expect(resolves("/industries/not-a-real-industry")).toBe(false);
    expect(resolves("/resources/not-a-real-article")).toBe(false);
    expect(resolves("/franchise-financing/not-a-real-method")).toBe(false);
  });
});
