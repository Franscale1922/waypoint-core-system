/**
 * Fixture builders for the match-workspace tests. These create the minimal valid
 * ancestor rows (Candidate → CandidateInputVersion → ScoringConfig → MatchRun) so each
 * test can focus on the behavior it exercises.
 */
import { prisma } from "../setup/test-db";

let seq = 0;
/** Deterministic-but-unique suffix so parallel-safe uniqueness holds without Math.random. */
function uniq(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}-${process.pid}`;
}

export async function makeCandidate(overrides: Record<string, unknown> = {}) {
  return prisma.candidate.create({
    data: {
      displayName: "Test Candidate",
      email: "candidate@example.test",
      externalRef: uniq("ext"),
      ...overrides,
    },
  });
}

export async function makeInputVersion(candidateId: string, overrides: Record<string, unknown> = {}) {
  return prisma.candidateInputVersion.create({
    data: {
      candidateId,
      sourceType: "intelligence_summary",
      sourceHash: uniq("hash"),
      capturedAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    },
  });
}

export async function makeScoringConfig(overrides: Record<string, unknown> = {}) {
  return prisma.scoringConfig.create({
    data: {
      version: uniq("cfg"),
      weights: { HIGH: { fit: 0.5, i19: 0.25, i20: 0.25 } },
      thresholds: {},
      caps: {},
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      approvalState: "approved",
      contentHash: uniq("cfghash"),
      ...overrides,
    },
  });
}

/** Create a full valid MatchRun and return { candidate, inputVersion, config, run }. */
export async function makeRun(overrides: Record<string, unknown> = {}) {
  const candidate = await makeCandidate();
  const inputVersion = await makeInputVersion(candidate.id);
  const config = await makeScoringConfig();
  const run = await prisma.matchRun.create({
    data: {
      candidateId: candidate.id,
      candidateInputVersionId: inputVersion.id,
      scoringConfigId: config.id,
      brandDbVersionRef: "branddb-v3",
      idempotencyKey: uniq("idem"),
      status: "completed",
      actor: "advisor@example.test",
      ...overrides,
    },
  });
  return { candidate, inputVersion, config, run };
}

export async function makeScore(runId: string, overrides: Record<string, unknown> = {}) {
  return prisma.matchScore.create({
    data: {
      runId,
      waypointBrandId: overrides.waypointBrandId ?? uniq("wpb"),
      rank: 1,
      maturity: "EST",
      scoringStage: "stage_4c",
      fitRaw: 0.8,
      fitScore: 0.8,
      i19Score: 4,
      i20Score: 5,
      i19DisclosureLevel: "COMPREHENSIVE",
      preMsaScore: 0.85,
      msaModifier: -0.05,
      finalScore: 0.8,
      scoreCapApplied: null,
      confidence: "HIGH",
      flags: [],
      exclusions: [],
      detail: {},
      ...overrides,
    } as never,
  });
}

/** A ranked-only brand: below the top-10 FDD cut, so it has fit and nothing downstream. */
export async function makeStage3cScore(runId: string, overrides: Record<string, unknown> = {}) {
  return makeScore(runId, {
    scoringStage: "stage_3c",
    rank: 12,
    i19Score: null,
    i20Score: null,
    i19DisclosureLevel: null,
    preMsaScore: null,
    msaModifier: null,
    finalScore: null,
    confidence: "MED",
    ...overrides,
  });
}

/** True if a thrown error is a Prisma known-request error with the given code. */
export function isPrismaCode(err: unknown, code: string): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === code);
}

/** Run an async fn expected to reject; return the thrown error (fails if it resolves). */
export async function captureError(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error("Expected the operation to reject, but it resolved.");
}
