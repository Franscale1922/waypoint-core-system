import { describe, it, expect } from "vitest";
import {
  byImpressions,
  pathFor,
  splitPages,
  selectOpportunities,
  selectLowCtr,
  selectPoorlyRanked,
} from "../../scripts/lib/gsc-report-data.mjs";

/**
 * Row shaping for the monthly GSC report.
 *
 * Every case here comes from a real defect in the 2026-08 report, the first one
 * this pipeline produced against a correctly configured property:
 *
 *  1. The query table called itself "Top Queries (by Impressions)" and was not.
 *     The v3 searchAnalytics API has no orderBy; it returns rows by clicks
 *     descending, ties broken by key. With 8 site-wide clicks only two queries
 *     had any, so the rest arrived alphabetically and `rowLimit: 50` cut the
 *     list off at "bonkers corner franchise cost". Everything after "b" was
 *     invisible, including whatever sends 299 impressions to /glossary.
 *  2. slug() stripped a hardcoded non-www origin. Once the property moved to
 *     www it matched nothing and every row printed as a full URL.
 *  3. Thresholds were absolutes written for a site with traffic. Against 985
 *     monthly impressions the opportunity filter matched nothing, and the
 *     low-CTR filter had no position gate, so /investment at position 66.6 was
 *     reported as a page that needed a better title.
 */

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

const row = (key: string, clicks: number, impressions: number, position: number): Row => ({
  keys: [key],
  clicks,
  impressions,
  ctr: impressions === 0 ? 0 : clicks / impressions,
  position,
});

const SITE = "https://www.waypointfranchise.com/";

describe("byImpressions", () => {
  it("surfaces the high-impression row that alphabetical truncation hid", () => {
    // Exactly the August shape: the only rows with clicks sort first, and the
    // rest arrive in key order. `auv franchise` survived only because "a" sorts
    // early; a genuinely important "s" query would have been cut.
    const asDelivered = [
      row("fran consult group reviews", 1, 1, 1.0),
      row("lawson franchise fee", 1, 2, 1.0),
      row("aadhaar franchise cost", 0, 1, 2.0),
      row("auv franchise", 0, 30, 43.7),
      row("bonkers corner franchise cost", 0, 8, 1.0),
      row("semi absentee franchise", 0, 240, 12.0),
    ];

    const ordered = byImpressions(asDelivered);

    expect(ordered[0].keys[0]).toBe("semi absentee franchise");
    expect(ordered[1].keys[0]).toBe("auv franchise");
    // The click-bearing rows led the table as delivered, on 1 and 2 impressions.
    // They are real but tiny, and ordering by impressions must demote them.
    expect(ordered.slice(0, 2).map((r) => r.keys[0])).not.toContain(
      "fran consult group reviews",
    );
    expect(ordered.at(-1)!.keys[0]).toBe("fran consult group reviews");
  });

  it("does not mutate the caller's array", () => {
    const rows = [row("b", 0, 1, 5), row("a", 0, 99, 5)];
    const snapshot = [...rows];
    byImpressions(rows);
    expect(rows).toEqual(snapshot);
  });

  it("breaks impression ties on key so output is stable between runs", () => {
    const tied = [row("zebra", 0, 10, 5), row("alpha", 0, 10, 5)];
    expect(byImpressions(tied).map((r) => r.keys[0])).toEqual(["alpha", "zebra"]);
  });
});

describe("pathFor", () => {
  const slug = pathFor(SITE);

  it("strips the property's own origin", () => {
    expect(slug("https://www.waypointfranchise.com/glossary")).toBe("/glossary");
    expect(slug("https://www.waypointfranchise.com/resources/staffing-franchises")).toBe(
      "/resources/staffing-franchises",
    );
  });

  it("renders the property root as /", () => {
    expect(slug("https://www.waypointfranchise.com/")).toBe("/");
  });

  it("keeps a foreign host visible instead of collapsing it", () => {
    // A domain property covers www and apex both. Collapsing them to the same
    // path would silently merge two different rows in the table.
    expect(slug("https://waypointfranchise.com/glossary")).toBe(
      "https://waypointfranchise.com/glossary",
    );
  });

  it("passes through anything that is not a URL", () => {
    expect(slug("not a url")).toBe("not a url");
  });

  it("works for a domain property, where hostOf has no scheme to parse", () => {
    const domainSlug = pathFor("sc-domain:waypointfranchise.com");
    expect(domainSlug("https://waypointfranchise.com/about")).toBe("/about");
  });
});

describe("splitPages", () => {
  it("treats the /resources/ index as a core page, not an article", () => {
    const { articles, corePages } = splitPages([
      row("https://www.waypointfranchise.com/resources/", 0, 26, 3.6),
      row("https://www.waypointfranchise.com/resources/staffing-franchises", 0, 1, 7.0),
      row("https://www.waypointfranchise.com/glossary", 1, 299, 4.8),
    ]);

    expect(articles.map((r) => r.keys[0])).toEqual([
      "https://www.waypointfranchise.com/resources/staffing-franchises",
    ]);
    expect(corePages.map((r) => r.keys[0])).toEqual([
      "https://www.waypointfranchise.com/glossary",
      "https://www.waypointfranchise.com/resources/",
    ]);
  });

  it("returns both groups ordered by impressions", () => {
    const { corePages } = splitPages([
      row("https://www.waypointfranchise.com/about", 0, 15, 6.5),
      row("https://www.waypointfranchise.com/investment", 0, 163, 66.6),
    ]);
    expect(corePages[0].keys[0]).toBe("https://www.waypointfranchise.com/investment");
  });
});

describe("selectOpportunities", () => {
  it("finds page-two pages that the old >=50 impression floor missed entirely", () => {
    // /franchise-financing: 14 impressions at position 12.5. Real, actionable,
    // and invisible under the previous threshold.
    const found = selectOpportunities([
      row("https://www.waypointfranchise.com/franchise-financing", 0, 14, 12.5),
      row("https://www.waypointfranchise.com/industries", 0, 21, 21.0),
    ]);
    expect(found.map((r) => r.keys[0])).toEqual([
      "https://www.waypointfranchise.com/franchise-financing",
    ]);
  });

  it("excludes anything outside positions 8 to 20", () => {
    const found = selectOpportunities([
      row("/top", 0, 500, 3.0),
      row("/deep", 0, 500, 55.0),
      row("/edge-low", 0, 500, 8.0),
      row("/edge-high", 0, 500, 20.0),
    ]);
    // Equal impressions, so the tie breaks alphabetically on key.
    expect(found.map((r) => r.keys[0])).toEqual(["/edge-high", "/edge-low"]);
  });

  it("drops single-impression noise", () => {
    expect(selectOpportunities([row("/noise", 0, 1, 12.0)])).toEqual([]);
  });
});

describe("selectLowCtr", () => {
  it("catches a well-ranked page that is not earning the click", () => {
    // /glossary: position 4.8, 299 impressions, 1 click.
    const found = selectLowCtr([
      row("https://www.waypointfranchise.com/glossary", 1, 299, 4.8),
    ]);
    expect(found).toHaveLength(1);
  });

  it("does not file a position-66 page as a CTR problem", () => {
    // The defect this gate exists for. /investment has 163 impressions and 0
    // clicks, and the old filter told us to rewrite its title.
    const investment = row("https://www.waypointfranchise.com/investment", 0, 163, 66.6);
    expect(selectLowCtr([investment])).toEqual([]);
    expect(selectPoorlyRanked([investment])).toHaveLength(1);
  });

  it("ignores pages that are already converting", () => {
    expect(selectLowCtr([row("/home", 3, 28, 2.4)])).toEqual([]);
  });
});

describe("selectPoorlyRanked", () => {
  it("orders by impressions and caps the list", () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      row(`/p${i}`, 0, 100 + i, 50),
    );
    const found = selectPoorlyRanked(rows);
    expect(found).toHaveLength(10);
    expect(found[0].keys[0]).toBe("/p14");
  });

  it("leaves page-one pages alone", () => {
    expect(selectPoorlyRanked([row("/good", 0, 300, 4.8)])).toEqual([]);
  });
});
