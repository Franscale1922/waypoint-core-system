import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SITE_URL,
  toWww,
  localBusinessSchema,
  personSchema,
  webSiteSchema,
  franchiseConsultingServiceSchema,
  jsonLdGraph,
  webPageSchema,
  schemaDate,
} from "@/app/lib/structured-data";

/**
 * Guards for the JSON-LD entity graph. scripts/verify-schema.mjs is a static
 * TEXT scan of the source; this file exercises the actual emitted objects, which
 * is the only way to catch an @id that no longer resolves or two entities that
 * have drifted back into claiming the same identity.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toWww", () => {
  it("rewrites the bare apex to the canonical www host", () => {
    expect(toWww("https://waypointfranchise.com/investment")).toBe(`${SITE_URL}/investment`);
  });

  it("leaves an already-canonical URL untouched", () => {
    expect(toWww(`${SITE_URL}/investment`)).toBe(`${SITE_URL}/investment`);
  });

  it("upgrades http to https on our own host", () => {
    expect(toWww("http://waypointfranchise.com/x")).toBe(`${SITE_URL}/x`);
  });

  /**
   * The regression this function exists to prevent. An unbounded host match
   * rewrote any host merely PREFIXED by ours, emitting a lookalike domain as a
   * first-party URL in JSON-LD. Each entry is a distinct evasion class.
   */
  it.each([
    ["subdomain suffix", "https://waypointfranchise.com.evil.example/a"],
    ["userinfo separator", "https://waypointfranchise.com@evil.example/a"],
    ["longer TLD-ish label", "https://waypointfranchise.competitor.com/x"],
    ["explicit port", "https://waypointfranchise.com:8443/x"],
    ["unicode lookalike host", "https://wаypointfranchise.com/x"],
  ])("does not rewrite a lookalike host (%s)", (_label, hostile) => {
    expect(toWww(hostile)).toBe(hostile);
    expect(toWww(hostile)).not.toContain(`${SITE_URL}/`);
  });

  it("proves the lookalike guard is not vacuous by sharing a prefix with a real rewrite", () => {
    // Both strings start with the same 29 characters. One is ours, one is not.
    const ours = "https://waypointfranchise.com/a";
    const theirs = "https://waypointfranchise.com.evil.example/a";
    expect(ours.slice(0, 29)).toBe(theirs.slice(0, 29));
    expect(toWww(ours)).not.toBe(ours); // rewritten
    expect(toWww(theirs)).toBe(theirs); // left alone
  });

  it("preserves the exact shape of the bare origin, adding no trailing slash", () => {
    // fragmentId() special-cases `canonical === SITE_URL`, so a normalizing
    // rewrite here would silently change the homepage node's @id and url.
    expect(toWww(SITE_URL)).toBe(SITE_URL);
    expect(toWww("https://waypointfranchise.com")).toBe(SITE_URL);
  });

  it("returns relative, empty and malformed input unchanged", () => {
    for (const input of ["/investment", "", "not a url", "mailto:kelsey@waypointfranchise.com"]) {
      expect(toWww(input)).toBe(input);
    }
  });
});

describe("sitewide entity graph", () => {
  // The exact call from src/app/layout.tsx, so this tests what actually ships.
  const graph = jsonLdGraph(
    localBusinessSchema,
    webSiteSchema,
    personSchema,
    franchiseConsultingServiceSchema,
  ) as { "@graph": Record<string, unknown>[] };

  const declaredIds = new Set(
    graph["@graph"].map((node) => node["@id"]).filter((id): id is string => typeof id === "string"),
  );

  /** Every nested `{"@id": ...}` that is a REFERENCE to another node, not a node itself. */
  function referencedIds(): string[] {
    const found: string[] = [];
    const visit = (value: unknown, isTopLevelNode = false) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) return value.forEach((entry) => visit(entry));
      const record = value as Record<string, unknown>;
      if (!isTopLevelNode && typeof record["@id"] === "string") found.push(record["@id"]);
      for (const [key, nested] of Object.entries(record)) {
        if (key !== "@id") visit(nested);
      }
    };
    graph["@graph"].forEach((node) => visit(node, true));
    return [...new Set(found)];
  }

  it("declares the four site-level nodes", () => {
    expect([...declaredIds].sort()).toEqual(
      [
        `${SITE_URL}/#business`,
        `${SITE_URL}/#service`,
        `${SITE_URL}/#website`,
        `${SITE_URL}/about#kelsey`,
      ].sort(),
    );
  });

  it("resolves every @id reference to a node declared in the same graph", () => {
    const references = referencedIds();
    // Non-vacuous: if the walker stopped finding references, this test would
    // otherwise pass by finding nothing to check.
    expect(references.length).toBeGreaterThanOrEqual(2);
    expect(references.filter((id) => !declaredIds.has(id))).toEqual([]);
  });

  it("points founder at the authoritative Person rather than inlining a second one", () => {
    // The original defect: founder was an inline anonymous Person carrying only
    // a `url`, which does not establish identity, so the relationship never
    // resolved to the Person holding worksFor, sameAs and knowsAbout.
    expect(localBusinessSchema.founder).toEqual({ "@id": personSchema["@id"] });
    expect(personSchema["@id"]).toBe(`${SITE_URL}/about#kelsey`);
  });
});

describe("sameAs identity evidence", () => {
  it("keeps the business and the Person profile sets disjoint", () => {
    const business = new Set<string>(localBusinessSchema.sameAs);
    const overlap = personSchema.sameAs.filter((url) => business.has(url));
    expect(overlap).toEqual([]);
  });

  it("is not disjoint merely because a list is empty", () => {
    expect(localBusinessSchema.sameAs.length).toBeGreaterThan(0);
    expect(personSchema.sameAs.length).toBeGreaterThan(0);
  });

  it("routes personal profiles to the Person and branded channels to the business", () => {
    expect(personSchema.sameAs).toContain("https://www.linkedin.com/in/kelsey-stuart-014b7b50/");
    expect(personSchema.sameAs).toContain("https://www.facebook.com/kelsey.stuart.94");
    expect(localBusinessSchema.sameAs).toContain("https://www.youtube.com/@Waypoint-Franchise");
    expect(localBusinessSchema.sameAs).toContain("https://x.com/__Waypoint");
  });
});

describe("webPageSchema dateModified", () => {
  const base = { url: `${SITE_URL}/investment`, name: "Investment", description: "d" };

  it("emits a valid ISO date", () => {
    expect(webPageSchema({ ...base, dateModified: "2026-08-03" })).toMatchObject({
      dateModified: "2026-08-03",
    });
  });

  it("emits a valid ISO datetime, including one with a UTC offset", () => {
    // The offset case would be wrongly rejected by a naive UTC round-trip check:
    // 20:00-07:00 lands on the NEXT UTC calendar day.
    expect(webPageSchema({ ...base, dateModified: "2026-08-03T20:00:00-07:00" })).toMatchObject({
      dateModified: "2026-08-03T20:00:00-07:00",
    });
  });

  it("omits the property entirely when no date is passed", () => {
    expect(webPageSchema(base)).not.toHaveProperty("dateModified");
  });

  /**
   * The first three parse happily via `new Date()` but are not ISO 8601; the
   * last two are the silent-rollover cases where JS returns a VALID date for an
   * impossible day, so neither a shape check nor an isNaN check alone suffices.
   */
  it.each([
    ["loose numeric", "2026-8-3"],
    ["prose", "August 3, 2026"],
    ["year only", "2026"],
    ["rollover: day out of range", "2026-02-30"],
    ["rollover: Feb 29 in a non-leap year", "2026-02-29"],
    ["not a date at all", "sometime last spring"],
    ["empty", ""],
  ])("drops a malformed date and warns (%s)", (_label, bad) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = webPageSchema({ ...base, dateModified: bad });
    expect(node).not.toHaveProperty("dateModified");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain(base.url);
  });

  /**
   * Regression: an earlier version skipped the calendar round-trip for the
   * datetime form, reasoning that a UTC offset legitimately lands on another
   * day. That confused the INSTANT with the day named in the string, so an
   * impossible datetime rolled over and shipped.
   */
  it.each([
    ["date-only rollover", "2026-02-30"],
    ["datetime rollover", "2026-02-30T12:00:00Z"],
    ["datetime rollover with offset", "2026-02-30T12:00:00-05:00"],
    ["Feb 29 non-leap datetime", "2026-02-29T12:00:00Z"],
  ])("rejects an impossible calendar day in either form (%s)", (_label, bad) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(webPageSchema({ ...base, dateModified: bad })).not.toHaveProperty("dateModified");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("still accepts a real leap day, so the rollover check is not over-broad", () => {
    expect(webPageSchema({ ...base, dateModified: "2024-02-29" })).toMatchObject({
      dateModified: "2024-02-29",
    });
  });

  it("accepts a Date object, which unquoted frontmatter yields at runtime", () => {
    // articles.ts casts frontmatter with `as string`, but gray-matter returns a
    // Date for an UNQUOTED YAML date. Dropping that would be a regression.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = webPageSchema({
      ...base,
      dateModified: new Date("2026-08-03T00:00:00Z") as unknown as string,
    });
    expect(node).toMatchObject({ dateModified: "2026-08-03T00:00:00.000Z" });
    expect(warn).not.toHaveBeenCalled();
  });
});

/**
 * schemaDate is exported because most date-bearing nodes are hand-rolled at the
 * page, not built by the factories here. resources/[slug] assembles its own
 * Article and is the ONLY path fed by unvalidated input (markdown frontmatter),
 * so a validator confined to webPageSchema would miss the case that matters.
 */
describe("schemaDate (used by the hand-rolled Article nodes)", () => {
  it("returns a valid date unchanged", () => {
    expect(schemaDate("2026-05-29", "ctx")).toBe("2026-05-29");
  });

  it("returns undefined for a malformed date so the caller omits the property", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schemaDate("not-a-date", "ctx")).toBeUndefined();
    expect(schemaDate("2026-02-30", "ctx")).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("returns undefined without warning when there is simply no date", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schemaDate(undefined, "ctx")).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("names the context in the warning so the offending page is identifiable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    schemaDate("nope", `${SITE_URL}/resources/some-article`);
    expect(warn.mock.calls[0][0]).toContain("/resources/some-article");
  });
});
