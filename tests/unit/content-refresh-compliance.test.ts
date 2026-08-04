import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import matter from "gray-matter";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  findProfitabilityViolations,
  findBrandNameViolations,
  passesComplianceCheck,
} from "@/lib/contentRefresh";
import identityMap from "@/lib/match-workspace/brand-identity-map.json";

/**
 * The content-refresh gate is the only thing between a GPT-4o rewrite and a commit to
 * main, and main auto-deploys. CONTENT-STANDARDS.md Sections 1 and 2 are the two hard
 * rules it enforces.
 *
 * The corpus assertions at the bottom are the ones that matter most: they hold the gate
 * to the 45 articles already published on main. A rule that fails those is a rule that
 * would block every future refresh of a compliant article.
 */

const ARTICLES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "content",
  "articles"
);

describe("profitability: literal terms", () => {
  it.each([
    "Most owners break even within 18 months.",
    "This is a lucrative category for the right operator.",
    "Net profit lands where the royalty structure lets it.",
    "The payback period is shorter than most expect.",
    "EBITDA is the number lenders ask about.",
  ])("flags %j", (text) => {
    expect(findProfitabilityViolations(text)).not.toHaveLength(0);
  });

  it("matches on alphanumeric boundaries, not raw substrings", () => {
    // The old unbounded `includes()` matched "roi" inside Detroit.
    expect(findProfitabilityViolations("Operators in Detroit see the same pattern.")).toEqual([]);
    expect(findProfitabilityViolations("ROI is not something we publish.")).toContain("roi");
  });

  it("no longer flags ordinary prose on 'makes a' and 'earns a'", () => {
    // Both ship on main today, in FAQ questions the gate now reads.
    expect(findProfitabilityViolations("What makes a franchise harder to sell?")).toEqual([]);
    expect(findProfitabilityViolations("What makes a franchise recession-proof?")).toEqual([]);
  });
});

describe("profitability: earnings claims that name a figure", () => {
  it.each([
    "Typical owners can expect annual earnings of $150,000.",
    "Most owners take home six figures within three years.",
    "Owners typically earn between $80,000 and $120,000.",
    "A well-run location makes $250,000 a year.",
    "A strong operator nets $180,000 after royalties.",
    "Expect a six-figure income by year two.",
    "Franchises in this category return 30% on invested capital.",
    "Owners see a 25% return on the money they put in.",
  ])("flags %j", (text) => {
    expect(findProfitabilityViolations(text)).not.toHaveLength(0);
  });

  it.each([
    // Section 1 permits all of these explicitly.
    "A category's initial investment typically runs $150K to $350K.",
    "Item 19 disclosures show average unit revenue between $400,000 and $900,000.",
    "Watch for royalty structures above 8% in this category, the margin math stops working there.",
    "The minimum profile is $250,000 net worth and $100,000 in liquid capital.",
    "ROBS makes financial sense with $50,000 or more in eligible accounts.",
    "The franchise fee is $45,000 and the royalty is 6 percent.",
    "Royalties run 6% to 8% of gross sales in most systems.",
  ])("permits %j", (text) => {
    expect(findProfitabilityViolations(text)).toEqual([]);
  });

  it("does not pair a figure in one sentence with an earnings word in the next", () => {
    expect(
      findProfitabilityViolations("The investment is $200,000. Profitability is never promised.")
    ).toEqual([]);
  });
});

describe("brand names", () => {
  it("flags a registry brand in prose", () => {
    expect(findBrandNameViolations("Consider a system like Molly Maid.")).toContain("molly maid");
  });

  it("flags names whose edges are punctuation", () => {
    expect(findBrandNameViolations("Brands such as Blingle! run this model.")).toContain("blingle!");
    expect(findBrandNameViolations("1-800-Striper is one example.")).toContain("1-800-striper");
  });

  it("does not match a brand name embedded in a longer word", () => {
    expect(findBrandNameViolations("hotworxing is not a word")).toEqual([]);
    expect(findBrandNameViolations("a spengalike model")).toEqual([]);
  });

  it("holds out ordinary English that happens to be a registry name", () => {
    expect(findBrandNameViolations("You cannot squeeze two more people into the room.")).toEqual([]);
    expect(findBrandNameViolations("A good franchisor makes you feel right at home.")).toEqual([]);
  });

  it("draws its names from the committed registry, not a second hand-written list", () => {
    const registryNames = Object.keys(identityMap.nameKeys);
    expect(registryNames.length).toBeGreaterThan(200);
    // A name picked out of the registry at a fixed index, so this fails if the gate ever
    // stops reading the artifact.
    const sample = registryNames.filter((n) => n.length > 8 && /^[a-z ]+$/.test(n))[0];
    expect(findBrandNameViolations(`We often see ${sample} in this category.`)).toContain(sample);
  });
});

describe("passesComplianceCheck: every field the model writes", () => {
  const clean = {
    title: "How to Evaluate a Home Services Category",
    excerpt: "What to look for before you commit.",
    faqs: [{ q: "What makes a franchise harder to sell?", a: "Owner dependence, mostly." }],
    body: "The initial investment typically runs $150K to $350K.",
  };

  it("passes a compliant article", () => {
    expect(passesComplianceCheck(clean)).toEqual({ passes: true, violations: [] });
  });

  it("catches a violation in the excerpt", () => {
    const result = passesComplianceCheck({ ...clean, excerpt: "A lucrative category." });
    expect(result.passes).toBe(false);
    expect(result.violations.some((v) => v.startsWith("excerpt:"))).toBe(true);
  });

  it("catches a violation in the title", () => {
    const result = passesComplianceCheck({ ...clean, title: "The Payback Period, Explained" });
    expect(result.passes).toBe(false);
    expect(result.violations.some((v) => v.startsWith("title:"))).toBe(true);
  });

  it("catches a brand name in an FAQ answer", () => {
    const result = passesComplianceCheck({
      ...clean,
      faqs: [{ q: "Which systems fit?", a: "Molly Maid is one example." }],
    });
    expect(result.passes).toBe(false);
    expect(result.violations).toContain('faq[0].a: brand name "molly maid"');
  });

  it("still catches a violation in the body", () => {
    const result = passesComplianceCheck({ ...clean, body: "Most owners break even in 18 months." });
    expect(result.passes).toBe(false);
    expect(result.violations.some((v) => v.startsWith("body:"))).toBe(true);
  });

  it("tolerates a malformed faqs value from the model", () => {
    for (const faqs of [undefined, null, "four questions", [null], [{ q: 7 }]]) {
      expect(() => passesComplianceCheck({ ...clean, faqs })).not.toThrow();
    }
  });
});

describe("the articles on main", () => {
  // Checked the way the refresh function checks them: the model's own fields, never the
  // slug or relatedSlugs. Scanning the raw file instead flags six extra articles, all of
  // them for the string "roi" inside a related-slug reference to the ROI article.
  const articles = readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(readFileSync(join(ARTICLES_DIR, f), "utf-8"));
      return {
        file: f,
        result: passesComplianceCheck({
          title: data.title,
          excerpt: data.excerpt,
          faqs: data.faqs,
          body: content,
        }),
      };
    });

  it("has a corpus to check", () => {
    expect(articles.length).toBeGreaterThan(40);
  });

  it("clears every article but the two known exceptions", () => {
    // 1. sba-loan-vs-robs: "a fund manager invested it hoping for 6 to 8% annual returns."
    //    A 401k return rather than a franchise one, but it is the shape Section 1 bans and
    //    the gate is deliberately not clever enough to tell the two apart.
    // 2. what-is-your-time-worth: "ROI" is in its own title. It is a STRATEGIC_SLUGS entry,
    //    so getRefreshCadenceDays returns null and the refresh never reaches it.
    //
    // Held as an exact list so a future rule that adds noise to the corpus fails loudly
    // instead of quietly blocking refreshes of compliant articles.
    expect(articles.filter((a) => !a.result.passes).map((a) => a.file)).toEqual([
      "sba-loan-vs-robs-franchise-funding-comparison.md",
      "what-is-your-time-worth-the-roi-math-of-franchise-ownership.md",
    ]);
  });

  it("names no registry brand anywhere, including the raw file", () => {
    const hits = readdirSync(ARTICLES_DIR)
      .filter((f) => f.endsWith(".md"))
      .flatMap((f) =>
        findBrandNameViolations(readFileSync(join(ARTICLES_DIR, f), "utf-8")).map(
          (b) => `${f}: ${b}`
        )
      );
    expect(hits).toEqual([]);
  });
});
