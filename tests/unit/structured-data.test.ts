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
  videoObjectSchema,
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

  /**
   * A Date means the frontmatter date was UNQUOTED, and YAML has already
   * silently rolled over any impossible day before this code runs: unquoted
   * `2026-02-30` arrives as March 2. The authored value is unrecoverable, so
   * accepting it would launder a corrupted date into published metadata. An
   * earlier version of this file did exactly that.
   */
  it("rejects a Date object rather than laundering an unrecoverable value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const node = webPageSchema({
      ...base,
      dateModified: new Date("2026-08-03T00:00:00Z") as unknown as string,
    });
    expect(node).not.toHaveProperty("dateModified");
    expect(warn).toHaveBeenCalledOnce();
    // The warning must name the cause and the fix, not just report a drop.
    expect(warn.mock.calls[0][0]).toContain("UNQUOTED");
  });

  it("rejects a Date even when it looks valid, because rollover is undetectable here", () => {
    // This is the corrupted case: `date: 2026-02-30` unquoted reaches us as a
    // perfectly valid Date for March 2, indistinguishable from an authored one.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rolledOver = new Date("2026-02-30");
    expect(rolledOver.getUTCMonth()).toBe(2); // March: YAML already rolled it
    expect(schemaDate(rolledOver, "ctx")).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
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

  it("stays silent for an absent OPTIONAL date, so the build log stays usable", () => {
    // Most pages are evergreen and carry no dateModified. Warning on each would
    // bury the warnings that matter.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schemaDate(undefined, "ctx")).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns for an absent REQUIRED date, which is a defect rather than a default", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schemaDate(undefined, "ctx", { required: true })).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("REQUIRED");
  });

  it("does not treat an empty string as absent, since that is a malformed value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schemaDate("", "ctx")).toBeUndefined();
    expect(warn.mock.calls[0][0]).toContain("Dropped invalid date");
  });

  it("names the context in the warning so the offending page is identifiable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    schemaDate("nope", `${SITE_URL}/resources/some-article`);
    expect(warn.mock.calls[0][0]).toContain("/resources/some-article");
  });
});

/**
 * videoObjectSchema has two callers with very different trust levels. The about
 * page builds its object from the Vimeo oEmbed API; the article route gets one
 * out of markdown frontmatter through an `as ArticleVideo` cast that enforces
 * nothing at runtime, so its declared `string` types are a fiction. These tests
 * exercise the untrusted path, and pin the trusted one against regression.
 */
describe("videoObjectSchema", () => {
  /**
   * The REAL values the live about page receives, captured from the Vimeo oEmbed
   * response for video 1174270863 on 2026-08-04: `upload_date` "2026-03-17
   * 01:57:41" and `duration` 204, as normalized by that page's own
   * toVideoUploadDate/secondsToISO8601 helpers. This is the regression fixture
   * for the only VideoObject actually on the site.
   */
  const LIVE = {
    name: "Kelsey Stuart on what honest franchise consulting actually looks like",
    description: "What honest, no-pitch franchise consulting actually looks like.",
    thumbnailUrl:
      "https://i.vimeocdn.com/video/2134803942-aaf25817575a9a51d5162ec0b3de4af5986faedf1bfb3597e853e15e9d09f1bb-d_1280?region=us",
    uploadDate: "2026-03-17T01:57:41Z",
    duration: "PT3M24S",
    embedUrl: "https://player.vimeo.com/video/1174270863",
    contentUrl: "https://vimeo.com/1174270863",
  };

  type VideoInput = Parameters<typeof videoObjectSchema>[0];
  const silenceWarn = () => vi.spyOn(console, "warn").mockImplementation(() => {});

  it("emits a complete node for the values the live about page actually receives", () => {
    const warn = silenceWarn();
    const node = videoObjectSchema(LIVE, "ctx");
    expect(node).toMatchObject({
      "@type": "VideoObject",
      name: LIVE.name,
      uploadDate: LIVE.uploadDate,
      duration: LIVE.duration,
      embedUrl: LIVE.embedUrl,
      contentUrl: LIVE.contentUrl,
    });
    // thumbnailUrl is emitted as an ARRAY, and the query string survives intact.
    expect(node?.thumbnailUrl).toEqual([LIVE.thumbnailUrl]);
    expect(node?.publisher["@id"]).toBe(`${SITE_URL}/#business`);
    expect(warn).not.toHaveBeenCalled();
  });

  it("accepts a thumbnail URL carrying a query string, because the live one has one", () => {
    // Not hypothetical: the Vimeo CDN thumbnail ends in "?region=us". A URL check
    // pattern-matched tightly enough to be meaningful rejects this, which would
    // silently remove the only VideoObject on the site. Asserting the fixture
    // really contains a query string keeps this from passing vacuously.
    expect(LIVE.thumbnailUrl).toContain("?");
    expect(videoObjectSchema(LIVE, "ctx")).toBeDefined();
  });

  it("keeps its own @context for standalone use, and jsonLdGraph still strips it", () => {
    expect(videoObjectSchema(LIVE, "ctx")).toMatchObject({ "@context": "https://schema.org" });
    const graph = jsonLdGraph(videoObjectSchema(LIVE, "ctx")!) as {
      "@graph": Record<string, unknown>[];
    };
    expect(graph["@graph"][0]).not.toHaveProperty("@context");
  });

  it("throws if an undefined node reaches jsonLdGraph, which is why the caller filters", () => {
    // resources/[slug] builds the node into a variable and spreads it only when
    // defined. This is the crash that guard prevents, pinned here so a refactor
    // back to an inline call fails in the suite rather than at build time.
    expect(() => jsonLdGraph(undefined as never)).toThrow();
  });

  /**
   * The single most important row is the date-only one. schemaDate accepts a
   * bare YYYY-MM-DD, which is why it is NOT reused here: Google reads uploadDate
   * as an instant and flags a value with no time and no timezone.
   */
  it.each([
    ["date-only, the schemaDate divergence", "2026-08-03"],
    ["datetime with no timezone", "2026-08-03T12:00:00"],
    ["prose", "next Tuesday"],
    ["year only", "2026"],
    ["loose numeric", "2026-8-3"],
    ["impossible day, silently rolled over by JS", "2026-02-30T12:00:00Z"],
    ["Feb 29 in a non-leap year", "2026-02-29T12:00:00Z"],
    ["out-of-range time", "2026-08-03T25:00:00Z"],
    ["empty", ""],
  ])("drops the WHOLE node for a bad uploadDate (%s)", (_label, bad) => {
    const warn = silenceWarn();
    expect(videoObjectSchema({ ...LIVE, uploadDate: bad }, "ctx")).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("uploadDate");
  });

  it.each([
    ["UTC Z", "2026-08-03T12:00:00Z"],
    ["negative offset", "2026-08-03T20:00:00-07:00"],
    ["positive offset", "2026-08-03T04:00:00+02:00"],
    ["no seconds", "2026-08-03T12:00Z"],
    ["fractional seconds", "2026-08-03T12:00:00.500Z"],
    ["a real leap day, so the rollover check is not over-broad", "2024-02-29T00:00:00Z"],
  ])("accepts a timezone-qualified uploadDate (%s)", (_label, good) => {
    const warn = silenceWarn();
    expect(videoObjectSchema({ ...LIVE, uploadDate: good }, "ctx")).toMatchObject({
      uploadDate: good,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("rejects a Date, since an unquoted uploadDate has already rolled over in YAML", () => {
    // Round 3 of the Codex review added this detail: an unquoted uploadDate rolls
    // over exactly as a frontmatter `date` does, so by the time it reaches here
    // the authored value is unrecoverable and cannot be checked.
    const warn = silenceWarn();
    const rolledOver = new Date("2026-02-30T12:00:00Z");
    expect(rolledOver.getUTCMonth()).toBe(2); // March: YAML already rolled it
    expect(
      videoObjectSchema({ ...LIVE, uploadDate: rolledOver as unknown as string }, "ctx"),
    ).toBeUndefined();
    expect(warn.mock.calls[0][0]).toContain("UNQUOTED");
  });

  it.each([
    ["prose", "not a url"],
    ["site-relative path", "/images/thumb.jpg"],
    ["protocol-relative", "//example.com/thumb.jpg"],
    ["script scheme", "javascript:alert(1)"],
    ["data URI", "data:image/png;base64,iVBORw0KGgo="],
    ["empty", ""],
  ])("drops the WHOLE node for a bad thumbnailUrl (%s)", (_label, bad) => {
    const warn = silenceWarn();
    expect(videoObjectSchema({ ...LIVE, thumbnailUrl: bad }, "ctx")).toBeUndefined();
    expect(warn.mock.calls[0][0]).toContain("thumbnailUrl");
  });

  it.each([
    ["name empty", { name: "" }],
    ["name whitespace only", { name: "   " }],
    ["name non-string", { name: 42 as unknown as string }],
    ["name missing", { name: undefined as unknown as string }],
    ["description empty", { description: "" }],
    ["description whitespace only", { description: "\n\t " }],
    ["description missing", { description: undefined as unknown as string }],
  ])("drops the WHOLE node for invalid required text (%s)", (_label, override) => {
    const warn = silenceWarn();
    expect(videoObjectSchema({ ...LIVE, ...override }, "ctx")).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("warns ONCE naming every failed field, not once per field", () => {
    const warn = silenceWarn();
    expect(
      videoObjectSchema(
        { ...LIVE, name: "", thumbnailUrl: "nope", uploadDate: "2026-08-03" },
        "ctx",
      ),
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    const message = warn.mock.calls[0][0] as string;
    for (const field of ["name", "thumbnailUrl", "uploadDate"]) {
      expect(message).toContain(field);
    }
  });

  it("names the context so the offending page is identifiable", () => {
    const warn = silenceWarn();
    videoObjectSchema({ ...LIVE, uploadDate: "nope" }, `${SITE_URL}/resources/some-article`);
    expect(warn.mock.calls[0][0]).toContain("/resources/some-article");
  });

  /**
   * An invalid OPTIONAL field costs only that property. The rest of the node is
   * still rich-result eligible, so dropping all of it over a cosmetic value
   * Google does not require would be the worse trade.
   */
  it.each([
    ["duration", "three minutes"],
    ["embedUrl", "not a url"],
    ["contentUrl", "/relative"],
    ["transcript", "   "],
  ])("drops ONLY the invalid optional property %s, keeping the node", (field, bad) => {
    const warn = silenceWarn();
    const node = videoObjectSchema({ ...LIVE, [field]: bad } as VideoInput, "ctx");
    expect(node).toBeDefined();
    expect(node).not.toHaveProperty(field);
    // Everything else is untouched, so the node stays eligible.
    expect(node).toMatchObject({ name: LIVE.name, uploadDate: LIVE.uploadDate });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain(field);
  });

  it("stays silent when an optional property is simply absent", () => {
    const warn = silenceWarn();
    const node = videoObjectSchema(
      {
        name: LIVE.name,
        description: LIVE.description,
        thumbnailUrl: LIVE.thumbnailUrl,
        uploadDate: LIVE.uploadDate,
      },
      "ctx",
    );
    expect(node).toBeDefined();
    expect(node).not.toHaveProperty("duration");
    expect(node).not.toHaveProperty("transcript");
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ["minutes and seconds", "PT3M30S"],
    ["hours", "PT1H2M3S"],
    ["zero length", "PT0M0S"],
    ["over 60 minutes, which is legal ISO 8601", "PT90M0S"],
    ["days", "P1D"],
    ["fractional seconds", "PT1.5S"],
  ])("accepts a valid ISO 8601 duration (%s)", (_label, good) => {
    const warn = silenceWarn();
    expect(videoObjectSchema({ ...LIVE, duration: good }, "ctx")).toMatchObject({
      duration: good,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  /**
   * "P" and "PT" are the cases the two (?!$) lookaheads exist for: every
   * component group is optional, so without them a duration with no duration in
   * it matches and ships.
   */
  it.each([
    ["bare designator", "P"],
    ["time designator with no time", "PT"],
    ["missing leading P", "3M30S"],
    ["lowercase", "pt3m30s"],
    ["prose", "three minutes"],
    ["bare seconds count", "204"],
  ])("rejects a malformed duration (%s)", (_label, bad) => {
    silenceWarn();
    expect(videoObjectSchema({ ...LIVE, duration: bad }, "ctx")).not.toHaveProperty("duration");
  });
});
