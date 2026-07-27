import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MATCH_WORKSPACE_TABLES } from "../setup/assert-test-db";

/**
 * Three lists must name the same set of models, and until now nothing enforced that but a comment:
 *
 *   prisma/schema.prisma            the models themselves
 *   PROTECTED_TABLES                what the deploy guard refuses to destroy
 *   MATCH_WORKSPACE_TABLES          what the test suite truncates and [C-2] scans for Lead FKs
 *
 * A model added to the schema but missed in either constant is silently unprotected: the guard
 * would let a destructive migration through, and the truncation would leave rows behind that leak
 * between tests. That is precisely the failure mode this domain cannot tolerate, so it gets a test
 * rather than a comment.
 *
 * Domain models are identified by position: everything declared after the match-workspace banner in
 * schema.prisma. The file also holds Lead, Reply, SuppressionList and others that must NOT be in
 * these lists.
 */

const ROOT = process.cwd();
const SCHEMA = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
const GUARD = readFileSync(join(ROOT, "scripts", "guard-immutable-tables.mjs"), "utf8");

/**
 * The banner that opens the domain section. Its absence is itself a failure.
 * The rule accepts both ASCII "=" and the box-drawing "═" the file actually uses, so running
 * `prisma format` cannot quietly break the locator and make every comparison vacuous.
 */
const BANNER = /\n\s*\/\/\s*[=═]+\s*\n\s*\/\/\s*MATCH WORKSPACE/i;

function domainModelsFromSchema(): string[] {
  const m = BANNER.exec(SCHEMA);
  expect(
    m,
    "Could not find the match-workspace banner comment in schema.prisma. This test locates domain " +
      "models by position, so the banner is load-bearing. Restore it rather than deleting this test.",
  ).not.toBeNull();
  const section = SCHEMA.slice(m!.index);
  return [...section.matchAll(/^model\s+(\w+)\s*\{/gm)].map((x) => x[1]).sort();
}

function listFromGuard(name: string): string[] {
  const block = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(GUARD);
  expect(block, `${name} not found in guard-immutable-tables.mjs`).not.toBeNull();
  return [...block![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort();
}

describe("schema / guard / test-setup lockstep", () => {
  const domain = domainModelsFromSchema();

  it("finds a plausible set of domain models", () => {
    // Guards against the locator silently matching nothing and every comparison passing vacuously.
    expect(domain.length).toBeGreaterThanOrEqual(9);
    expect(domain).toContain("MatchRun");
    expect(domain).toContain("MatchRunInput");
    // And proves the locator is not simply picking up the whole file.
    expect(domain).not.toContain("Lead");
  });

  it("PROTECTED_TABLES in the deploy guard matches the domain models exactly", () => {
    expect(listFromGuard("PROTECTED_TABLES")).toEqual(domain);
  });

  it("MATCH_WORKSPACE_TABLES in the test setup matches the domain models exactly", () => {
    expect([...MATCH_WORKSPACE_TABLES].sort()).toEqual(domain);
  });

  it("the frozen enums are protected too", () => {
    const types = listFromGuard("PROTECTED_TYPES");
    const declared = [...SCHEMA.matchAll(/^enum\s+(Match\w+)\s*\{/gm)].map((x) => x[1]).sort();
    expect(types).toEqual(declared);
  });
});
