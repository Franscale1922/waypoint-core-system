import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../setup/test-db";
import { MATCH_WORKSPACE_TABLES } from "../setup/test-db";
import { makeRun, makeScore, isPrismaCode, captureError } from "./_helpers";

describe("candidate privacy & config governance (C-7, C-14 partial)", () => {
  it("C-7: redaction nulls Candidate PII but leaves immutable runs/scores intact", async () => {
    const { candidate, run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_priv" });

    // Right-to-be-forgotten = anonymize the Candidate row in place (it is the mutable row).
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { displayName: "[redacted]", email: null, redactedAt: new Date() },
    });

    const c = await prisma.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(c.email).toBeNull();
    expect(c.displayName).toBe("[redacted]");
    expect(c.redactedAt).not.toBeNull();

    // The immutable history (which keys on the opaque candidate id, carrying no PII) survives.
    const runAfter = await prisma.matchRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(runAfter.candidateId).toBe(candidate.id);
    const scoreAfter = await prisma.matchScore.findUniqueOrThrow({ where: { id: score.id } });
    expect(scoreAfter.finalScore).toBe(score.finalScore);
    expect(scoreAfter.waypointBrandId).toBe("wpb_priv");
  });

  it("C-14 (partial): a MatchRun referencing a nonexistent ScoringConfig is rejected (FK)", async () => {
    const candidate = await prisma.candidate.create({ data: { displayName: "FK Test" } });
    const iv = await prisma.candidateInputVersion.create({
      data: { candidateId: candidate.id, sourceType: "questionnaire", sourceHash: "fk", capturedAt: new Date() },
    });

    // The required scoringConfigId FK means the DB refuses a run whose config version doesn't
    // exist — the enforceable half of C-14 before the import adapter (Phase 2) adds the
    // "must be an APPROVED config" fail-closed check.
    const err = await captureError(() =>
      prisma.matchRun.create({
        data: {
          candidateId: candidate.id,
          candidateInputVersionId: iv.id,
          scoringConfigId: randomUUID(), // no such config
          brandDbVersionRef: "branddb-v3",
          idempotencyKey: "fk-test-key",
          status: "completed",
          actor: "advisor@example.test",
          brandRegistrySha256: "0".repeat(64),
          brandIdentityMapHash: "0".repeat(64),
        },
      }),
    );
    expect(isPrismaCode(err, "P2003")).toBe(true); // foreign key constraint failed
  });

  it("C-2: no match-workspace table has a foreign key to the cold-lead Lead model", async () => {
    // C-2 is enforced structurally (no relation to Lead exists). This introspection test
    // guards against a future edit silently adding one, coupling placement outcomes to
    // cold-outreach leads.
    // Table names are our own trusted constants (no injection surface).
    const inList = MATCH_WORKSPACE_TABLES.map((t) => `'${t}'`).join(", ");
    const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT tc.table_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'Lead'
          AND tc.table_name IN (${inList})`,
    );
    expect(rows).toHaveLength(0);
  });
});
