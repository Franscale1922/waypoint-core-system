/**
 * Import a completed match run: validate, resolve, preview, commit.
 *
 * The endpoints are thin wrappers over this module so the whole decision path is testable without
 * HTTP. Preview and commit run the SAME analysis from the SAME uploaded bytes; commit never trusts
 * anything preview returned, because a preview result is a claim from the client.
 *
 * FAIL-CLOSED, IN ORDER
 * ---------------------
 *   1. Zod validates the package shape and reconciles the arithmetic (package-schema.ts).
 *   2. Every brand name resolves to a `wpb_` id at an exact tier, or the whole package is refused.
 *   3. The declared ScoringConfig must EXIST and be `approved`. [C-14]
 *   4. The candidate must not be redacted. [C-7]
 *   5. The run must not be a slate-only variant of an existing run (see buildRunFingerprint).
 *
 * PRIVACY OF THE UPLOADED INPUTS
 * ------------------------------
 * The candidate input artifacts are hashed in memory and discarded. They are never written to
 * disk, never logged, and never echoed back in a response. Only the digest is stored, which is what
 * [C-6] means by "referenced, not copied".
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { MatchPackageSchema, type MatchPackage } from "./package-schema";
import { buildIdempotencyKey, buildRunFingerprint } from "./idempotency";
import {
  resolvePackageBrands,
  BRAND_MAP_PROVENANCE,
  type BrandRejection,
  type ResolvedBrand,
} from "./brand-resolver";
import { appendDecision, appendInputVersion, currentHead } from "./append";

/** The single run status this domain writes. See the schema comment: transitions would need an UPDATE. */
export const RUN_STATUS = "completed" as const;

/** Vercel's serverless request body ceiling. Refused with a clear message rather than a platform 413. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type ImportErrorCode =
  | "MALFORMED_JSON"
  | "SCHEMA_INVALID"
  | "INPUT_FILE_MISSING"
  | "INPUT_FILE_EMPTY"
  | "UPLOAD_TOO_LARGE"
  | "BRAND_UNRESOLVED"
  | "SCORING_CONFIG_UNKNOWN"
  | "SCORING_CONFIG_NOT_APPROVED"
  | "CANDIDATE_REDACTED"
  | "SLATE_ONLY_CHANGE";

export type ImportError = { code: ImportErrorCode; message: string; detail?: unknown };

/** One uploaded candidate input artifact, paired by index with `pkg.inputVersions`. */
export type ImportInputFile = { filename: string; bytes: Uint8Array };

export type PreviewReport = {
  ok: boolean;
  errors: ImportError[];
  warnings: string[];
  /** Present once the package parses, even if a later check fails, so preview stays informative. */
  summary?: {
    candidateExternalRef: string;
    candidateDisplayName: string;
    scoringConfigVersion: string;
    brandDbVersionRef: string;
    brandCount: number;
    stage4cCount: number;
    stage3cCount: number;
    confirmedSlate: string[];
    inputVersions: { sourceType: string; sourceHash: string }[];
    idempotencyKey: string;
    runFingerprint: string;
  };
  resolvedBrands?: { brandName: string; waypointBrandId: string; via: string; lifecycleState: string }[];
  rejections?: BrandRejection[];
  /** A run with this exact idempotency key already exists: committing is a no-op replay. */
  existingRunId?: string | null;
  candidatePlan?: {
    action: "link" | "create";
    candidateId?: string;
    /** The stored PII differs from the package. Reported, never overwritten. */
    divergentFields?: string[];
  };
};

export type CommitResult = {
  runId: string;
  alreadyImported: boolean;
  created: { scores: number; decisions: number; inputVersions: number; runInputs: number };
};

export class ImportRefused extends Error {
  constructor(readonly errors: ImportError[]) {
    super(errors.map((e) => `${e.code}: ${e.message}`).join("; "));
    this.name = "ImportRefused";
  }
}

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Prisma error narrowing without importing the runtime class (keeps this module import-light). */
function prismaCode(err: unknown): string | null {
  return err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : null;
}
function prismaTargets(err: unknown): string[] {
  const meta = err && typeof err === "object" ? (err as { meta?: { target?: unknown } }).meta : undefined;
  const t = meta?.target;
  return Array.isArray(t) ? t.map(String) : typeof t === "string" ? [t] : [];
}

/**
 * Everything preview and commit both need. Pure apart from the reads it performs.
 * Throws `ImportRefused` only from `commit`; `analyze` collects errors so preview can show them all.
 */
async function analyze(
  db: PrismaClient,
  rawJson: string,
  files: ImportInputFile[],
  explicitBindings: Record<string, string>,
): Promise<{ report: PreviewReport; pkg?: MatchPackage; resolved?: ResolvedBrand[]; inputHashes?: string[] }> {
  const errors: ImportError[] = [];
  const warnings: string[] = [];

  const totalBytes = files.reduce((n, f) => n + f.bytes.byteLength, 0) + Buffer.byteLength(rawJson, "utf8");
  if (totalBytes > MAX_UPLOAD_BYTES) {
    errors.push({
      code: "UPLOAD_TOO_LARGE",
      message: `The upload is ${(totalBytes / 1024 / 1024).toFixed(1)} MB, over the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB request limit. Attach the input documents as plain text or PDF rather than large exports.`,
    });
    return { report: { ok: false, errors, warnings } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    errors.push({ code: "MALFORMED_JSON", message: `The match package is not valid JSON: ${String(err)}` });
    return { report: { ok: false, errors, warnings } };
  }

  const result = MatchPackageSchema.safeParse(parsed);
  if (!result.success) {
    errors.push({
      code: "SCHEMA_INVALID",
      message: "The match package does not satisfy the import contract.",
      detail: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return { report: { ok: false, errors, warnings } };
  }
  const pkg = result.data;

  // One file per declared input version, paired by index. Required so the stored hash is a digest
  // of real bytes rather than an unverified claim from the matcher. [C-6]
  if (files.length !== pkg.inputVersions.length) {
    errors.push({
      code: "INPUT_FILE_MISSING",
      message: `The package declares ${pkg.inputVersions.length} input version(s) (${pkg.inputVersions
        .map((iv) => iv.sourceType)
        .join(", ")}) but ${files.length} file(s) were attached. Attach the documents this run was scored from, in the same order.`,
    });
    return { report: { ok: false, errors, warnings } };
  }
  for (const [i, f] of files.entries()) {
    if (f.bytes.byteLength === 0) {
      errors.push({
        code: "INPUT_FILE_EMPTY",
        message: `The file attached for "${pkg.inputVersions[i].sourceType}" (${f.filename}) is empty.`,
      });
    }
  }
  if (errors.length) return { report: { ok: false, errors, warnings } };

  const inputHashes = files.map((f) => sha256(f.bytes));
  const idempotencyKey = buildIdempotencyKey(pkg, inputHashes);
  const runFingerprint = buildRunFingerprint(pkg, inputHashes);

  const resolution = resolvePackageBrands(pkg, explicitBindings);
  warnings.push(...resolution.warnings);

  const summary: NonNullable<PreviewReport["summary"]> = {
    candidateExternalRef: pkg.candidate.externalRef,
    candidateDisplayName: pkg.candidate.displayName,
    scoringConfigVersion: pkg.scoringConfigVersion,
    brandDbVersionRef: pkg.brandDbVersionRef,
    brandCount: pkg.brands.length,
    stage4cCount: pkg.brands.filter((b) => b.scoringStage === "stage_4c").length,
    stage3cCount: pkg.brands.filter((b) => b.scoringStage === "stage_3c").length,
    confirmedSlate: [...pkg.confirmedSlate],
    inputVersions: pkg.inputVersions.map((iv, i) => ({ sourceType: iv.sourceType, sourceHash: inputHashes[i] })),
    idempotencyKey,
    runFingerprint,
  };

  const report: PreviewReport = {
    ok: false,
    errors,
    warnings,
    summary,
    resolvedBrands: resolution.resolved.map((r) => ({
      brandName: r.brandName,
      waypointBrandId: r.waypointBrandId,
      via: r.via,
      lifecycleState: r.brand.lifecycleState,
    })),
  };

  if (!resolution.ok) {
    report.rejections = resolution.rejections;
    errors.push({
      code: "BRAND_UNRESOLVED",
      message:
        `${resolution.rejections.length} brand name(s) could not be resolved, so the whole package is ` +
        `refused. Importing the rest would renumber the ranked slate.`,
      detail: resolution.rejections,
    });
  }

  const config = await db.scoringConfig.findUnique({ where: { version: pkg.scoringConfigVersion } });
  if (!config) {
    errors.push({
      code: "SCORING_CONFIG_UNKNOWN",
      message: `The package declares scoring configuration "${pkg.scoringConfigVersion}", which is not recorded here. An unknown configuration is never auto-created. [C-14]`,
    });
  } else if (config.approvalState !== "approved") {
    errors.push({
      code: "SCORING_CONFIG_NOT_APPROVED",
      message: `Scoring configuration "${config.version}" exists but its approval state is "${config.approvalState}", not "approved". [C-14]`,
    });
  }

  const existingRun = await db.matchRun.findUnique({ where: { idempotencyKey } });
  report.existingRunId = existingRun?.id ?? null;

  const candidate = await db.candidate.findUnique({ where: { externalRef: pkg.candidate.externalRef } });
  if (candidate) {
    if (candidate.redactedAt) {
      errors.push({
        code: "CANDIDATE_REDACTED",
        message: `Candidate "${pkg.candidate.externalRef}" was redacted on ${candidate.redactedAt.toISOString()} under the right-to-be-forgotten path. Attaching a new run to a redacted person is refused. [C-7]`,
      });
    }
    const divergentFields: string[] = [];
    if (candidate.displayName !== pkg.candidate.displayName) divergentFields.push("displayName");
    const pkgEmail = pkg.candidate.email ?? null;
    if (pkgEmail !== null && candidate.email !== pkgEmail) divergentFields.push("email");
    report.candidatePlan = {
      action: "link",
      candidateId: candidate.id,
      ...(divergentFields.length ? { divergentFields } : {}),
    };
    if (divergentFields.length && !candidate.redactedAt) {
      warnings.push(
        `The stored candidate differs from the package on ${divergentFields.join(", ")}. The stored ` +
          `values are kept: import never overwrites candidate PII.`,
      );
    }
  } else {
    report.candidatePlan = { action: "create" };
  }

  // A re-import whose ONLY difference is the confirmed slate. Not a new run, and not a duplicate.
  if (!existingRun) {
    const slateTwin = await db.matchRun.findFirst({
      where: { runFingerprint, ...(candidate ? { candidateId: candidate.id } : {}) },
    });
    if (slateTwin) {
      errors.push({
        code: "SLATE_ONLY_CHANGE",
        message:
          `This is the same analysis as run ${slateTwin.id} with a different confirmed slate. Importing ` +
          `it would create a second run holding a duplicate copy of the same scores. Change the slate on ` +
          `the existing run in the worksheet instead, where it is recorded as a superseding decision.`,
        detail: { existingRunId: slateTwin.id },
      });
    }
  }

  report.ok = errors.length === 0;
  return { report, pkg, resolved: resolution.resolved, inputHashes };
}

export async function previewImport(
  db: PrismaClient,
  rawJson: string,
  files: ImportInputFile[],
  explicitBindings: Record<string, string> = {},
): Promise<PreviewReport> {
  const { report } = await analyze(db, rawJson, files, explicitBindings);
  return report;
}

export async function commitImport(
  db: PrismaClient,
  rawJson: string,
  files: ImportInputFile[],
  actor: string,
  explicitBindings: Record<string, string> = {},
): Promise<CommitResult> {
  // Re-derive everything from the uploaded bytes. Preview's answer is a client claim.
  const { report, pkg, resolved, inputHashes } = await analyze(db, rawJson, files, explicitBindings);
  if (!report.ok || !pkg || !resolved || !inputHashes) throw new ImportRefused(report.errors);

  const { idempotencyKey, runFingerprint } = report.summary!;

  if (report.existingRunId) {
    return {
      runId: report.existingRunId,
      alreadyImported: true,
      created: { scores: 0, decisions: 0, inputVersions: 0, runInputs: 0 },
    };
  }

  const byName = new Map(resolved.map((r) => [r.brandName, r.waypointBrandId]));

  try {
    return await db.$transaction(
      async (tx) => {
        const config = await tx.scoringConfig.findUniqueOrThrow({
          where: { version: pkg.scoringConfigVersion },
        });

        const candidate = await tx.candidate.upsert({
          where: { externalRef: pkg.candidate.externalRef },
          // Never overwrite stored PII: divergence is reported at preview, not silently applied.
          update: {},
          create: {
            externalRef: pkg.candidate.externalRef,
            displayName: pkg.candidate.displayName,
            email: pkg.candidate.email ?? null,
          },
        });

        // Reuse an identical snapshot, else supersede that source type's current version. Without
        // the supersession the only writer that exists would never build the [C-8] chain.
        let createdInputVersions = 0;
        const inputVersionIds: string[] = [];
        for (const [i, iv] of pkg.inputVersions.entries()) {
          const sourceHash = inputHashes[i];
          const lineage = await tx.candidateInputVersion.findMany({
            where: { candidateId: candidate.id, sourceType: iv.sourceType },
          });
          const identical = lineage.find((r) => r.sourceHash === sourceHash);
          if (identical) {
            inputVersionIds.push(identical.id);
            continue;
          }
          const head = currentHead(lineage);
          const created = await appendInputVersion(tx, {
            candidateId: candidate.id,
            sourceType: iv.sourceType,
            sourceHash,
            sourceRef: iv.sourceRef ?? null,
            capturedAt: iv.capturedAt,
            supersedesId: head?.id ?? null,
          });
          inputVersionIds.push(created.id);
          createdInputVersions += 1;
        }

        const run = await tx.matchRun.create({
          data: {
            candidateId: candidate.id,
            scoringConfigId: config.id,
            brandDbVersionRef: pkg.brandDbVersionRef,
            idempotencyKey,
            runFingerprint,
            status: RUN_STATUS,
            actor,
            brandRegistrySha256: BRAND_MAP_PROVENANCE.registrySha256,
            brandIdentityMapHash: BRAND_MAP_PROVENANCE.contentHash,
          },
        });

        await tx.matchRunInput.createMany({
          data: inputVersionIds.map((inputVersionId) => ({ runId: run.id, inputVersionId })),
        });

        const scores = await tx.matchScore.createManyAndReturn({
          data: pkg.brands.map((b) => ({
            runId: run.id,
            waypointBrandId: byName.get(b.brandName)!,
            rank: b.rank,
            maturity: b.maturity,
            scoringStage: b.scoringStage,
            fitRaw: b.fitRaw ?? null,
            fitScore: b.fitScore,
            i19Score: b.i19Score ?? null,
            i20Score: b.i20Score ?? null,
            i19DisclosureLevel: b.i19DisclosureLevel ?? null,
            preMsaScore: b.preMsaScore ?? null,
            msaModifier: b.msaModifier ?? null,
            finalScore: b.finalScore ?? null,
            scoreCapApplied: b.scoreCapApplied ?? null,
            confidence: b.confidence,
            flags: b.flags,
            exclusions: b.exclusions,
            detail: b.detail as Prisma.InputJsonValue,
          })),
        });

        // The confirmed slate IS a decision, and 2G's projection keys to it structurally. Written
        // through the append service so the same lineage rules apply as from the worksheet.
        const scoreByBrandId = new Map(scores.map((s) => [s.waypointBrandId, s.id]));
        let decisions = 0;
        for (const brandName of pkg.confirmedSlate) {
          const scoreId = scoreByBrandId.get(byName.get(brandName)!)!;
          await appendDecision(tx, { scoreId, state: "final_slate", actor });
          decisions += 1;
        }

        return {
          runId: run.id,
          alreadyImported: false,
          created: {
            scores: scores.length,
            decisions,
            inputVersions: createdInputVersions,
            runInputs: inputVersionIds.length,
          },
        };
      },
      // Defaults are 5s/2s. A few hundred score inserts against a remote database can exceed that,
      // and a loser blocking on the idempotencyKey index would surface as P2028 (transaction
      // timeout) rather than the duplicate-key error the replay path is looking for.
      { timeout: 30_000, maxWait: 10_000 },
    );
  } catch (err) {
    // Caught OUTSIDE the transaction deliberately. Prisma runs READ COMMITTED; catching inside
    // leaves an aborted transaction where every later statement fails with 25P02.
    const code = prismaCode(err);
    const targets = prismaTargets(err);

    if (code === "P2002" && targets.some((t) => t.includes("idempotencyKey"))) {
      // A concurrent commit of the SAME package won. Replay, do not duplicate. [C-11]
      const winner = await db.matchRun.findUnique({ where: { idempotencyKey } });
      if (winner) {
        return {
          runId: winner.id,
          alreadyImported: true,
          created: { scores: 0, decisions: 0, inputVersions: 0, runInputs: 0 },
        };
      }
    }
    if (code === "P2002" && targets.some((t) => t.includes("externalRef"))) {
      // Two concurrent imports created the same candidate. The row now exists, so a single retry
      // takes the upsert's update branch.
      return commitImport(db, rawJson, files, actor, explicitBindings);
    }
    throw err;
  }
}
