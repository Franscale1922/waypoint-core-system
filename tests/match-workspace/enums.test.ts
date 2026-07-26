import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../setup/test-db";
import { makeRun, makeScore, captureError } from "./_helpers";

// The Postgres enums MatchDecisionState / MatchOutcomeType are the DB-level enforcement
// of the frozen decision/outcome vocabularies (C-4). The Prisma client's TS types already
// forbid a bad value at compile time, so to prove the DATABASE rejects it we insert raw SQL.
describe("frozen vocabularies enforced at the DB (C-4)", () => {
  it("rejects a MatchDecision.state outside {shortlist, final_slate, rejected}", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_enum1" });

    const err = await captureError(() =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "MatchDecision" ("id","scoreId","state","actor") VALUES ('${randomUUID()}','${score.id}','not_a_state','tester')`,
      ),
    );
    // Postgres: invalid input value for enum MatchDecisionState: "not_a_state"
    expect(String((err as Error)?.message ?? err)).toMatch(/invalid input value for enum|MatchDecisionState/i);

    // A valid value inserts fine.
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "MatchDecision" ("id","scoreId","state","actor") VALUES ('${randomUUID()}','${score.id}','shortlist','tester')`,
      ),
    ).resolves.toBeTypeOf("number");
  });

  it("rejects a MatchOutcomeEvent.type outside the five outcome types", async () => {
    const { run, candidate } = await makeRun();

    const err = await captureError(() =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "MatchOutcomeEvent" ("id","candidateId","waypointBrandId","originatingRunId","type","actor")
         VALUES ('${randomUUID()}','${candidate.id}','wpb_enum2','${run.id}','not_a_type','tester')`,
      ),
    );
    expect(String((err as Error)?.message ?? err)).toMatch(/invalid input value for enum|MatchOutcomeType/i);

    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "MatchOutcomeEvent" ("id","candidateId","waypointBrandId","originatingRunId","type","actor")
         VALUES ('${randomUUID()}','${candidate.id}','wpb_enum2','${run.id}','placed','tester')`,
      ),
    ).resolves.toBeTypeOf("number");
  });
});
