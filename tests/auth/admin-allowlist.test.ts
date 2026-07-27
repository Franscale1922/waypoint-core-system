import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAllowedAdmin, allowedAdminEmails } from "@/lib/admin-allowlist";

const OWNER = "kelsey@waypointfranchise.com";

describe("isAllowedAdmin", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  it("allows the compiled-in owner even when ADMIN_EMAILS is unset (no lockout)", () => {
    expect(process.env.ADMIN_EMAILS).toBeUndefined();
    expect(isAllowedAdmin(OWNER)).toBe(true);
  });

  it("denies everyone else when ADMIN_EMAILS is unset", () => {
    expect(isAllowedAdmin("stranger@gmail.com")).toBe(false);
    expect(isAllowedAdmin("someone@waypointfranchise.com")).toBe(false);
  });

  it("denies null/undefined/empty", () => {
    expect(isAllowedAdmin(null)).toBe(false);
    expect(isAllowedAdmin(undefined)).toBe(false);
    expect(isAllowedAdmin("")).toBe(false);
    expect(isAllowedAdmin("   ")).toBe(false);
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(isAllowedAdmin("  KELSEY@WaypointFranchise.COM ")).toBe(true);
  });

  it("adds addresses from ADMIN_EMAILS without dropping the owner", () => {
    process.env.ADMIN_EMAILS = "teammate@example.com, other@example.com";
    expect(isAllowedAdmin("teammate@example.com")).toBe(true);
    expect(isAllowedAdmin("other@example.com")).toBe(true);
    expect(isAllowedAdmin(OWNER)).toBe(true); // union, never replacement
  });

  it("tolerates messy ADMIN_EMAILS (empty segments, trailing commas, spacing)", () => {
    process.env.ADMIN_EMAILS = " ,, teammate@example.com ,,";
    const allowed = allowedAdminEmails();
    expect(allowed.has("teammate@example.com")).toBe(true);
    expect(allowed.has("")).toBe(false); // empty segments must not become a wildcard
    expect(isAllowedAdmin("")).toBe(false);
  });

  it("matches exactly — no substring, prefix, or suffix escapes", () => {
    // The classic near-miss attacks against a sloppy `includes`/`endsWith` check.
    expect(isAllowedAdmin("notkelsey@waypointfranchise.com")).toBe(false);
    expect(isAllowedAdmin("kelsey@waypointfranchise.com.evil.com")).toBe(false);
    expect(isAllowedAdmin("evil.com?kelsey@waypointfranchise.com")).toBe(false);
    expect(isAllowedAdmin("@waypointfranchise.com")).toBe(false);
    expect(isAllowedAdmin("kelsey@waypointfranchise.co")).toBe(false);
  });
});
