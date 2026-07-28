import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeScoringConfig } from "./_helpers";
import { previewImport, commitImport, ImportRefused, RUN_STATUS } from "@/lib/match-workspace/import";
import { currentHead } from "@/lib/match-workspace/append";

/**
 * These drive the real import logic against a real database. Brand names are real registry names,
 * so the fail-closed resolver is genuinely exercised rather than stubbed.
 */
const TIERRA = "wpb_00386311e1b551e6a9baa54a383985aa";
const POOLWERX = "wpb_d29e95335ccc5f4798806c44de600076";

const file = (name: string, body: string) => ({ filename: name, bytes: new TextEncoder().encode(body) });

let seq = 0;
const nextRef = () => `ext-${++seq}-${process.pid}`;

type PkgOverrides = {
  externalRef?: string;
  configVersion?: string;
  brands?: unknown[];
  confirmedSlate?: string[];
  inputVersions?: unknown[];
};

function pkg(o: PkgOverrides = {}) {
  return JSON.stringify({
    packageVersion: "1.0",
    scoringConfigVersion: o.configVersion ?? "test-cfg",
    brandDbVersionRef: "branddb-v3",
    candidate: { externalRef: o.externalRef ?? nextRef(), displayName: "Test Candidate" },
    inputVersions: o.inputVersions ?? [
      { sourceType: "intelligence_summary", capturedAt: "2026-07-01T00:00:00Z" },
      { sourceType: "questionnaire", capturedAt: "2026-07-01T00:00:00Z" },
    ],
    brands: o.brands ?? [
      {
        brandName: "Tierra Encantada",
        rank: 1,
        maturity: "EST",
        scoringStage: "stage_4c",
        fitScore: 0.8,
        i19Score: 4,
        i20Score: 5,
        i19DisclosureLevel: "COMPREHENSIVE",
        // 0.8*0.50 + (4/5)*0.25 + (5/5)*0.25 = 0.85
        preMsaScore: 0.85,
        msaModifier: -0.05,
        finalScore: 0.8,
        confidence: "HIGH",
      },
      {
        brandName: "Poolwerx",
        rank: 2,
        maturity: "GROW",
        scoringStage: "stage_3c",
        fitScore: 0.6,
        confidence: "MED",
      },
    ],
    confirmedSlate: o.confirmedSlate ?? ["Tierra Encantada"],
  });
}

const twoFiles = (a = "intel-body", b = "quiz-body") => [file("intel.txt", a), file("quiz.txt", b)];

async function approvedConfig(version = "test-cfg") {
  return makeScoringConfig({ version, approvalState: "approved" });
}

describe("previewImport: writes nothing, reports everything", () => {
  it("accepts a well-formed package and plans a new candidate", async () => {
    await approvedConfig();
    const before = await prisma.matchRun.count();

    const r = await previewImport(prisma, pkg(), twoFiles());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.candidatePlan?.action).toBe("create");
    expect(r.summary?.brandCount).toBe(2);
    expect(r.summary?.stage4cCount).toBe(1);
    expect(r.resolvedBrands?.map((b) => b.waypointBrandId)).toEqual([TIERRA, POOLWERX]);

    expect(await prisma.matchRun.count()).toBe(before); // wrote nothing
  });

  it("hashes the UPLOADED bytes, and never echoes their contents", async () => {
    await approvedConfig();
    const r1 = await previewImport(prisma, pkg({ externalRef: "fixed-a" }), twoFiles("body-one"));
    const r2 = await previewImport(prisma, pkg({ externalRef: "fixed-a" }), twoFiles("body-two"));

    expect(r1.summary?.inputVersions[0].sourceHash).not.toBe(r2.summary?.inputVersions[0].sourceHash);
    expect(r1.summary?.idempotencyKey).not.toBe(r2.summary?.idempotencyKey);
    // The digest is stored; the document body is not, anywhere in the response. [C-6]
    expect(JSON.stringify(r1)).not.toContain("body-one");
  });

  it("REFUSES an unknown scoring config and one that is not approved [C-14]", async () => {
    const unknown = await previewImport(prisma, pkg({ configVersion: "no-such-cfg" }), twoFiles());
    expect(unknown.errors.map((e) => e.code)).toContain("SCORING_CONFIG_UNKNOWN");

    await makeScoringConfig({ version: "draft-cfg", approvalState: "draft" });
    const draft = await previewImport(prisma, pkg({ configVersion: "draft-cfg" }), twoFiles());
    expect(draft.errors.map((e) => e.code)).toContain("SCORING_CONFIG_NOT_APPROVED");
  });

  it("REFUSES the whole package when one brand cannot be resolved", async () => {
    await approvedConfig();
    const brands = [
      { brandName: "Tierra Encantada", rank: 1, maturity: "EST", scoringStage: "stage_3c", fitScore: 0.8, confidence: "HIGH" },
      { brandName: "Not A Real Brand", rank: 2, maturity: "EST", scoringStage: "stage_3c", fitScore: 0.7, confidence: "HIGH" },
    ];
    const r = await previewImport(prisma, pkg({ brands, confirmedSlate: [] }), twoFiles());
    expect(r.ok).toBe(false);
    expect(r.errors.map((e) => e.code)).toContain("BRAND_UNRESOLVED");
    expect(r.rejections?.[0].brandName).toBe("Not A Real Brand");
  });

  it("an explicit wpb_ binding unblocks an unknown brand name", async () => {
    await approvedConfig();
    const brands = [
      { brandName: "Brand Not In The Map", rank: 1, maturity: "EST", scoringStage: "stage_3c", fitScore: 0.8, confidence: "HIGH" },
    ];
    const blocked = await previewImport(prisma, pkg({ brands, confirmedSlate: [] }), twoFiles());
    expect(blocked.ok).toBe(false);

    const bound = await previewImport(prisma, pkg({ brands, confirmedSlate: [] }), twoFiles(), {
      "Brand Not In The Map": POOLWERX,
    });
    expect(bound.errors).toEqual([]);
    expect(bound.resolvedBrands?.[0]).toMatchObject({ waypointBrandId: POOLWERX, via: "explicit_waypoint_id" });
  });

  it("REFUSES when the attached files do not match the declared input versions", async () => {
    await approvedConfig();
    const one = await previewImport(prisma, pkg(), [file("intel.txt", "only-one")]);
    expect(one.errors.map((e) => e.code)).toContain("INPUT_FILE_MISSING");

    const empty = await previewImport(prisma, pkg(), [file("intel.txt", ""), file("quiz.txt", "x")]);
    expect(empty.errors.map((e) => e.code)).toContain("INPUT_FILE_EMPTY");
  });

  it("REFUSES malformed JSON and a package that fails the contract", async () => {
    expect((await previewImport(prisma, "{not json", twoFiles())).errors[0].code).toBe("MALFORMED_JSON");

    // finalScore that does not reconcile with preMsa + msaMod, and declares no cap.
    const brands = [
      {
        brandName: "Tierra Encantada", rank: 1, maturity: "EST", scoringStage: "stage_4c",
        fitScore: 0.8, i19Score: 4, i20Score: 5, i19DisclosureLevel: "COMPREHENSIVE",
        preMsaScore: 0.85, msaModifier: -0.05, finalScore: 0.99, confidence: "HIGH",
      },
    ];
    const bad = await previewImport(prisma, pkg({ brands, confirmedSlate: [] }), twoFiles());
    expect(bad.errors[0].code).toBe("SCHEMA_INVALID");
  });
});

describe("commitImport: the ordered write set", () => {
  it("creates candidate, input versions, run, scores, slate decisions and run inputs", async () => {
    const cfg = await approvedConfig();
    const ref = nextRef();
    const result = await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");

    expect(result.alreadyImported).toBe(false);
    expect(result.created).toMatchObject({ scores: 2, decisions: 1, inputVersions: 2, runInputs: 2 });

    const run = await prisma.matchRun.findUniqueOrThrow({
      where: { id: result.runId },
      include: { scores: true, inputs: true, candidate: true },
    });
    expect(run.status).toBe(RUN_STATUS);
    expect(run.actor).toBe("advisor@test");
    expect(run.scoringConfigId).toBe(cfg.id);
    expect(run.candidate.externalRef).toBe(ref);
    expect(run.inputs).toHaveLength(2);
    // Provenance of how names became ids is recorded, at full length.
    expect(run.brandRegistrySha256).toMatch(/^[0-9a-f]{64}$/);
    expect(run.brandIdentityMapHash).toMatch(/^[0-9a-f]{64}$/);

    const stage3c = run.scores.find((s) => s.scoringStage === "stage_3c")!;
    expect(stage3c.waypointBrandId).toBe(POOLWERX);
    expect(stage3c.finalScore).toBeNull(); // absent, not zeroed

    // The confirmed slate became a real decision, which is what 2G's projection keys to.
    const decisions = await prisma.matchDecision.findMany({
      where: { score: { runId: run.id } },
      include: { score: true },
    });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].state).toBe("final_slate");
    expect(decisions[0].score.waypointBrandId).toBe(TIERRA);
  });

  it("[C-11] re-importing the same package creates nothing and returns the same run", async () => {
    await approvedConfig();
    const ref = nextRef();
    const first = await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");
    const scoresAfterFirst = await prisma.matchScore.count({ where: { runId: first.runId } });

    const again = await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");
    expect(again.runId).toBe(first.runId);
    expect(again.alreadyImported).toBe(true);
    expect(again.created).toMatchObject({ scores: 0, decisions: 0 });

    expect(await prisma.matchRun.count({ where: { candidate: { externalRef: ref } } })).toBe(1);
    expect(await prisma.matchScore.count({ where: { runId: first.runId } })).toBe(scoresAfterFirst);
    expect(await prisma.matchDecision.count({ where: { score: { runId: first.runId } } })).toBe(1);
  });

  it("a concurrent double commit leaves exactly one run and replays the loser", async () => {
    await approvedConfig();
    const ref = nextRef();
    const body = pkg({ externalRef: ref });
    const results = await Promise.all([
      commitImport(prisma, body, twoFiles(), "advisor@test"),
      commitImport(prisma, body, twoFiles(), "advisor@test"),
    ]);
    expect(new Set(results.map((r) => r.runId)).size).toBe(1);
    expect(results.filter((r) => r.alreadyImported)).toHaveLength(1);
    expect(await prisma.matchRun.count({ where: { candidate: { externalRef: ref } } })).toBe(1);
  });

  it("recovers from a genuine unique-key race on idempotencyKey", async () => {
    // The plain concurrent test above does NOT reach this branch: the two commits serialize far
    // enough that the loser's pre-flight read already sees the winner's run and returns early.
    // Confirmed by deleting the P2002 handler and watching that test still pass. So this one
    // simulates the real race directly, by blinding the pre-flight reads exactly as a concurrent
    // transaction would (neither read can see the other's uncommitted row). The insert then hits
    // the unique index for real, and the handler must replay rather than throw.
    //
    // The catch is deliberately OUTSIDE the transaction: Prisma runs READ COMMITTED, and catching
    // inside would leave an aborted transaction where every later statement fails with 25P02.
    await approvedConfig();
    const ref = nextRef();
    const body = pkg({ externalRef: ref });
    const first = await commitImport(prisma, body, twoFiles(), "advisor@test");

    let blindUnique = true;
    let blindFirst = true;
    const racing = new Proxy(prisma, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (prop !== "matchRun") return typeof value === "function" ? value.bind(target) : value;
        return new Proxy(value as object, {
          get(inner, key, r2) {
            const fn = Reflect.get(inner, key, r2);
            if (key === "findUnique" && blindUnique) {
              return async () => {
                blindUnique = false;
                return null;
              };
            }
            if (key === "findFirst" && blindFirst) {
              return async () => {
                blindFirst = false;
                return null;
              };
            }
            return typeof fn === "function" ? (fn as (...a: unknown[]) => unknown).bind(inner) : fn;
          },
        });
      },
    }) as typeof prisma;

    const replayed = await commitImport(racing, body, twoFiles(), "advisor@test");
    expect(replayed.runId).toBe(first.runId);
    expect(replayed.alreadyImported).toBe(true);
    expect(replayed.created).toMatchObject({ scores: 0, decisions: 0 });
    expect(await prisma.matchRun.count({ where: { candidate: { externalRef: ref } } })).toBe(1);
  });

  it("gives up after ONE retry on a persistent externalRef collision", async () => {
    // The externalRef retry originally had no depth counter, only a comment claiming "a single
    // retry". Under a persistent collision it recursed about 18,000 times in 30 seconds, re-running
    // the entire analysis each pass (JSON parse, Zod, SHA-256 over every file, brand resolution,
    // four database round trips). On a serverless function that is an unbounded database-hammering
    // loop until the platform kills it.
    await approvedConfig();
    const ref = nextRef();

    let upsertCalls = 0;
    // The upsert happens on the TRANSACTION client, so the collision has to be injected there.
    // Proxying only the base client silently intercepts nothing, and the test passes for the wrong
    // reason. (It did, on the first attempt.)
    const collideOnUpsert = (client: object) =>
      new Proxy(client, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          if (prop !== "candidate") return typeof value === "function" ? value.bind(target) : value;
          return new Proxy(value as object, {
            get(inner, key, r2) {
              const fn = Reflect.get(inner, key, r2);
              if (key !== "upsert") {
                return typeof fn === "function" ? (fn as (...a: unknown[]) => unknown).bind(inner) : fn;
              }
              return async () => {
                upsertCalls++;
                throw Object.assign(new Error("Unique constraint failed"), {
                  code: "P2002",
                  meta: { target: ["externalRef"] },
                });
              };
            },
          });
        },
      });

    const alwaysColliding = new Proxy(prisma, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (prop !== "$transaction") return typeof value === "function" ? value.bind(target) : value;
        return (cb: (tx: unknown) => unknown, opts?: unknown) =>
          (value as (c: unknown, o?: unknown) => unknown).call(
            target,
            (tx: object) => cb(collideOnUpsert(tx)),
            opts,
          );
      },
    }) as typeof prisma;

    await expect(
      commitImport(alwaysColliding, pkg({ externalRef: ref }), twoFiles(), "advisor@test"),
    ).rejects.toMatchObject({ code: "P2002" });

    // Exactly two attempts: the original and one retry. Not thousands.
    expect(upsertCalls).toBe(2);
    expect(await prisma.matchRun.count({ where: { candidate: { externalRef: ref } } })).toBe(0);
  });

  it("REFUSES a re-import whose only difference is the confirmed slate", async () => {
    await approvedConfig();
    const ref = nextRef();
    await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");

    // Same analysis, different Top 3. The idempotency key differs, so without the fingerprint check
    // this would mint a second run holding a duplicate copy of the same scores.
    const err = await commitImport(prisma, pkg({ externalRef: ref, confirmedSlate: [] }), twoFiles(), "advisor@test")
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ImportRefused);
    expect((err as ImportRefused).errors[0].code).toBe("SLATE_ONLY_CHANGE");
    expect(await prisma.matchRun.count({ where: { candidate: { externalRef: ref } } })).toBe(1);
  });

  it("a genuine re-run with different scores becomes a NEW run on the same candidate [C-5]", async () => {
    await approvedConfig();
    const ref = nextRef();
    const first = await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");

    const rescored = [
      {
        brandName: "Tierra Encantada", rank: 1, maturity: "EST", scoringStage: "stage_4c",
        fitScore: 0.9, i19Score: 4, i20Score: 5, i19DisclosureLevel: "COMPREHENSIVE",
        // 0.9*0.50 + 0.8*0.25 + 1.0*0.25 = 0.90
        preMsaScore: 0.9, msaModifier: 0.05, finalScore: 0.95, confidence: "HIGH",
      },
      { brandName: "Poolwerx", rank: 2, maturity: "GROW", scoringStage: "stage_3c", fitScore: 0.6, confidence: "MED" },
    ];
    const second = await commitImport(
      prisma,
      pkg({ externalRef: ref, brands: rescored }),
      twoFiles("intel-v2", "quiz-v2"),
      "advisor@test",
    );
    expect(second.runId).not.toBe(first.runId);
    expect(await prisma.matchRun.count({ where: { candidate: { externalRef: ref } } })).toBe(2);
  });

  it("[C-8] re-importing with a changed input document supersedes that source type, not another", async () => {
    await approvedConfig();
    const ref = nextRef();
    await commitImport(prisma, pkg({ externalRef: ref }), twoFiles("intel-v1", "quiz-v1"), "advisor@test");

    const rescored = [
      {
        brandName: "Tierra Encantada", rank: 1, maturity: "EST", scoringStage: "stage_4c",
        fitScore: 0.7, i19Score: 4, i20Score: 5, i19DisclosureLevel: "COMPREHENSIVE",
        preMsaScore: 0.8, msaModifier: 0, finalScore: 0.8, confidence: "HIGH",
      },
    ];
    await commitImport(
      prisma,
      pkg({ externalRef: ref, brands: rescored, confirmedSlate: [] }),
      twoFiles("intel-v2", "quiz-v1"), // only the intelligence summary changed
      "advisor@test",
    );

    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { externalRef: ref } });
    const intel = await prisma.candidateInputVersion.findMany({
      where: { candidateId: candidate.id, sourceType: "intelligence_summary" },
    });
    const quiz = await prisma.candidateInputVersion.findMany({
      where: { candidateId: candidate.id, sourceType: "questionnaire" },
    });
    expect(intel).toHaveLength(2);
    expect(currentHead(intel)?.supersedesId).not.toBeNull(); // v2 supersedes v1, same source type
    expect(quiz).toHaveLength(1); // the unchanged document is reused, not duplicated
  });

  it("[C-7] REFUSES to attach a run to a redacted candidate", async () => {
    await approvedConfig();
    const ref = nextRef();
    await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");
    await prisma.candidate.update({
      where: { externalRef: ref },
      data: { displayName: "[redacted]", email: null, redactedAt: new Date() },
    });

    const rescored = [
      { brandName: "Poolwerx", rank: 1, maturity: "EST", scoringStage: "stage_3c", fitScore: 0.5, confidence: "LOW" },
    ];
    const err = await commitImport(
      prisma,
      pkg({ externalRef: ref, brands: rescored, confirmedSlate: [] }),
      twoFiles("new-intel", "new-quiz"),
      "advisor@test",
    )
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ImportRefused);
    expect((err as ImportRefused).errors.map((e) => e.code)).toContain("CANDIDATE_REDACTED");
  });

  it("never overwrites stored candidate PII, and says so at preview", async () => {
    await approvedConfig();
    const ref = nextRef();
    await commitImport(prisma, pkg({ externalRef: ref }), twoFiles(), "advisor@test");
    await prisma.candidate.update({ where: { externalRef: ref }, data: { displayName: "Corrected Name" } });

    const r = await previewImport(prisma, pkg({ externalRef: ref }), twoFiles());
    expect(r.candidatePlan?.divergentFields).toContain("displayName");

    const after = await prisma.candidate.findUniqueOrThrow({ where: { externalRef: ref } });
    expect(after.displayName).toBe("Corrected Name");
  });

  it("refuses to commit anything a preview refused, and leaves no partial rows", async () => {
    const ref = nextRef();
    const before = {
      runs: await prisma.matchRun.count(),
      candidates: await prisma.candidate.count(),
      scores: await prisma.matchScore.count(),
    };
    const err = await commitImport(prisma, pkg({ externalRef: ref, configVersion: "missing-cfg" }), twoFiles(), "a@test")
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ImportRefused);
    expect(await prisma.matchRun.count()).toBe(before.runs);
    expect(await prisma.candidate.count()).toBe(before.candidates);
    expect(await prisma.matchScore.count()).toBe(before.scores);
  });
});
