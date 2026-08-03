import { describe, it, expect } from "vitest";
import {
  resolveSite,
  sitemapUrlFor,
  normalizeProperty,
  hostOf,
  canSubmitSitemap,
} from "../../scripts/lib/gsc-property.mjs";

/**
 * Search Console property matching, which is fiddlier than it looks and has
 * already produced two real failures in this repo.
 *
 * A DOMAIN property (`sc-domain:example.com`) and a URL-PREFIX property
 * (`https://example.com/`) are not two spellings of one thing. They hold
 * different data, carry different permissions, and accept different sitemap
 * paths. Both bugs below came from blurring that line:
 *
 *  1. A configured URL prefix without its trailing slash missed the exact match
 *     and fell through to a candidate list that tried `sc-domain:` FIRST, so the
 *     job silently acted on a different property than the one configured.
 *  2. The sitemap URL was hardcoded to the www host while the resolved property
 *     was the non-www prefix. Google rejected it with 400 invalidParameter on
 *     `feedpath`, observed on run 30839225508.
 */

const OPTS = { fallbackHost: "www.waypointfranchise.com" };
const CANON = { canonicalHost: "www.waypointfranchise.com" };

const prefix = (url: string, permission = "siteFullUser") => ({ url, permission });

describe("resolveSite", () => {
  it("prefers an exact match on the configured identifier", () => {
    const available = [
      prefix("sc-domain:waypointfranchise.com"),
      prefix("https://waypointfranchise.com/"),
    ];
    expect(resolveSite("https://waypointfranchise.com/", available, OPTS)?.url).toBe(
      "https://waypointfranchise.com/",
    );
  });

  it("treats a missing trailing slash as the same property", () => {
    const available = [prefix("https://www.waypointfranchise.com/")];
    expect(resolveSite("https://www.waypointfranchise.com", available, OPTS)?.url).toBe(
      "https://www.waypointfranchise.com/",
    );
  });

  it("never resolves a configured URL prefix to the domain property", () => {
    // The exact regression. Both exist, the configured value lacks its trailing
    // slash, and the domain property is the one the account has least access to.
    const available = [
      { url: "sc-domain:waypointfranchise.com", permission: "siteRestrictedUser" },
      { url: "https://www.waypointfranchise.com/", permission: "siteOwner" },
    ];
    const got = resolveSite("https://www.waypointfranchise.com", available, OPTS);
    expect(got?.url).toBe("https://www.waypointfranchise.com/");
    expect(got?.permission).toBe("siteOwner");
  });

  it("resolves a configured domain property to the domain property", () => {
    const available = [
      prefix("https://www.waypointfranchise.com/"),
      prefix("sc-domain:waypointfranchise.com"),
    ];
    expect(resolveSite("sc-domain:waypointfranchise.com", available, OPTS)?.url).toBe(
      "sc-domain:waypointfranchise.com",
    );
  });

  it("falls back across www when the configured host is not present", () => {
    const available = [prefix("https://www.waypointfranchise.com/")];
    expect(resolveSite("https://waypointfranchise.com/", available, OPTS)?.url).toBe(
      "https://www.waypointfranchise.com/",
    );
  });

  it("falls back to the domain property only when no prefix matches", () => {
    const available = [prefix("sc-domain:waypointfranchise.com")];
    expect(resolveSite("https://www.waypointfranchise.com", available, OPTS)?.url).toBe(
      "sc-domain:waypointfranchise.com",
    );
  });

  it("uses the fallback host when nothing is configured", () => {
    const available = [prefix("https://www.waypointfranchise.com/")];
    expect(resolveSite(undefined, available, OPTS)?.url).toBe(
      "https://www.waypointfranchise.com/",
    );
  });

  it("returns null rather than guessing at an unrelated property", () => {
    const available = [prefix("https://someone-elses-site.com/")];
    expect(resolveSite("https://www.waypointfranchise.com", available, OPTS)).toBeNull();
  });

  it("returns null for an empty property list", () => {
    expect(resolveSite("https://www.waypointfranchise.com", [], OPTS)).toBeNull();
  });

  it("does not throw on a malformed configured value", () => {
    const available = [prefix("https://www.waypointfranchise.com/")];
    expect(() => resolveSite("not a url", available, OPTS)).not.toThrow();
  });
});

describe("sitemapUrlFor", () => {
  it("keeps a URL-prefix property on its own origin", () => {
    // Submitting the www sitemap to the non-www prefix is the 400 we hit live.
    expect(sitemapUrlFor("https://waypointfranchise.com/", CANON)).toBe(
      "https://waypointfranchise.com/sitemap.xml",
    );
    expect(sitemapUrlFor("https://www.waypointfranchise.com/", CANON)).toBe(
      "https://www.waypointfranchise.com/sitemap.xml",
    );
  });

  it("uses the canonical host for a domain property", () => {
    expect(sitemapUrlFor("sc-domain:waypointfranchise.com", CANON)).toBe(
      "https://www.waypointfranchise.com/sitemap.xml",
    );
  });

  it("preserves a non-https prefix rather than upgrading it", () => {
    expect(sitemapUrlFor("http://waypointfranchise.com/", CANON)).toBe(
      "http://waypointfranchise.com/sitemap.xml",
    );
  });
});

describe("normalizeProperty and hostOf", () => {
  it("normalizes prefixes and passes domain properties through", () => {
    expect(normalizeProperty("https://a.com")).toBe("https://a.com/");
    expect(normalizeProperty("sc-domain:a.com")).toBe("sc-domain:a.com");
    expect(normalizeProperty("nonsense")).toBeNull();
    expect(normalizeProperty("")).toBeNull();
    expect(normalizeProperty(undefined)).toBeNull();
  });

  it("extracts the host from either form", () => {
    expect(hostOf("https://www.a.com/x")).toBe("www.a.com");
    expect(hostOf("sc-domain:a.com")).toBe("a.com");
    expect(hostOf("nonsense")).toBeNull();
    expect(hostOf(undefined)).toBeNull();
  });
});

describe("canSubmitSitemap", () => {
  it("allows Full and Owner, rejects Restricted and Unverified", () => {
    // Google's permissions table lists Submit Sitemap for Owner and Full only.
    expect(canSubmitSitemap("siteOwner")).toBe(true);
    expect(canSubmitSitemap("siteFullUser")).toBe(true);
    expect(canSubmitSitemap("siteRestrictedUser")).toBe(false);
    expect(canSubmitSitemap("siteUnverifiedUser")).toBe(false);
  });

  it("denies an unrecognised level rather than assuming it is permissive", () => {
    // It was a denylist, so any level Google adds or renames would have been waved
    // through into an opaque 403 instead of a clear refusal.
    expect(canSubmitSitemap("siteSomethingNew")).toBe(false);
    expect(canSubmitSitemap("")).toBe(false);
    expect(canSubmitSitemap(undefined)).toBe(false);
  });
});
