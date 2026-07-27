/**
 * The append-only write path for the four supersedable chains. [C-8] [C-12]
 *
 * WHY A SERVICE LAYER AT ALL
 * --------------------------
 * Phase 1 left a documented gap: `supersedesId @unique` guarantees at most one successor per row,
 * but nothing stops a row in one lineage from superseding a row in another. Postgres triggers are
 * ruled out by the roadmap, so the invariant has to live in code, which means it is only real if
 * every writer goes through here. `tests/match-workspace/supersession.test.ts` deliberately keeps
 * an assertion that raw Prisma still permits the cross-lineage write, so the boundary stays visible
 * rather than being mistaken for a database constraint.
 *
 * TWO INVARIANTS, AND WHY THE SECOND ONE MATTERS AS MUCH AS THE FIRST
 * ------------------------------------------------------------------
 *   1. SAME LINEAGE. A superseding row must belong to the same chain as the row it replaces. The
 *      key differs per chain, so this is not one uniform "parent id" (see LINEAGE below).
 *   2. SUPERSEDE THE HEAD. A second row in an existing lineage must supersede that lineage's
 *      current head. Without this, "current" stops being well defined: `schema.prisma` derives it
 *      as "the row no other row's supersedesId points at", so appending a bare `rejected` decision
 *      beside an un-superseded `final_slate` leaves TWO current heads. Every downstream question,
 *      including "is this brand still on the confirmed slate", then has two answers. The
 *      candidate-safe projection in 2G depends directly on this being sound.
 *
 * All functions take a `Prisma.TransactionClient` so the import path and the worksheet enforce
 * identical rules, and so a multi-row import cannot half-apply.
 */
import type { Prisma, MatchDecisionState, MatchOutcomeType } from "@prisma/client";

/** Thrown when a write would break an append-only invariant. Never a 500: callers map it to 409. */
export class LineageError extends Error {
  constructor(
    message: string,
    readonly code:
      | "CROSS_LINEAGE_SUPERSESSION"
      | "SUPERSEDED_ROW_ALREADY_REPLACED"
      | "MUST_SUPERSEDE_CURRENT_HEAD"
      | "SUPERSEDED_ROW_NOT_FOUND",
  ) {
    super(message);
    this.name = "LineageError";
  }
}

/**
 * The tuple that identifies "the same chain", per chain. These are NOT interchangeable, and using
 * one uniform parent id would silently permit real corruption:
 *
 *   decisions/corrections  scoreId            a decision belongs to one brand's score
 *   outcomes               candidateId +      otherwise "placed at Brand A" could supersede
 *                          waypointBrandId    "lost at Brand B" for the same candidate
 *   input versions         candidateId +      otherwise a questionnaire could supersede an
 *                          sourceType         intelligence summary
 */
type LineageKey = Record<string, string>;

const sameLineage = (a: LineageKey, b: LineageKey) =>
  Object.keys(a).every((k) => a[k] === b[k]) && Object.keys(a).length === Object.keys(b).length;

const describe = (k: LineageKey) =>
  Object.entries(k)
    .map(([key, v]) => `${key}=${v}`)
    .join(", ");

/**
 * The shared guard. Loads the superseded row, proves it is in the same lineage, proves it has no
 * successor already, and proves it is the lineage's current head.
 *
 * @param findById      loads the row being superseded (or null)
 * @param findLineage   loads every row in the target lineage, so the head can be derived
 */
async function assertSupersedable<T extends { id: string; supersedesId: string | null }>(opts: {
  supersedesId: string;
  incomingLineage: LineageKey;
  lineageOf: (row: T) => LineageKey;
  findById: (id: string) => Promise<T | null>;
  findLineage: () => Promise<T[]>;
  chain: string;
}): Promise<void> {
  const prior = await opts.findById(opts.supersedesId);
  if (!prior) {
    throw new LineageError(
      `${opts.chain}: cannot supersede ${opts.supersedesId}, no such row.`,
      "SUPERSEDED_ROW_NOT_FOUND",
    );
  }

  const priorLineage = opts.lineageOf(prior);
  if (!sameLineage(priorLineage, opts.incomingLineage)) {
    throw new LineageError(
      `${opts.chain}: refusing a cross-lineage supersession. The new row belongs to ` +
        `(${describe(opts.incomingLineage)}) but ${opts.supersedesId} belongs to ` +
        `(${describe(priorLineage)}). A supersession replaces a row in its OWN chain.`,
      "CROSS_LINEAGE_SUPERSESSION",
    );
  }

  const lineage = await opts.findLineage();
  const superseded = new Set(lineage.map((r) => r.supersedesId).filter(Boolean) as string[]);

  if (superseded.has(prior.id)) {
    throw new LineageError(
      `${opts.chain}: ${prior.id} has already been superseded. Supersede the current head instead.`,
      "SUPERSEDED_ROW_ALREADY_REPLACED",
    );
  }

  const heads = lineage.filter((r) => !superseded.has(r.id));
  if (heads.length > 0 && !heads.some((h) => h.id === prior.id)) {
    throw new LineageError(
      `${opts.chain}: ${prior.id} is not the current head of its chain (head is ` +
        `${heads.map((h) => h.id).join(", ")}).`,
      "MUST_SUPERSEDE_CURRENT_HEAD",
    );
  }
}

/**
 * The other half of invariant 2: an append with NO `supersedesId` is only legal when the lineage is
 * empty. Otherwise it would create a second head beside the existing one.
 */
function assertNoExistingHead<T extends { id: string; supersedesId: string | null }>(
  lineage: T[],
  chain: string,
  key: LineageKey,
): void {
  if (lineage.length === 0) return;
  const superseded = new Set(lineage.map((r) => r.supersedesId).filter(Boolean) as string[]);
  const heads = lineage.filter((r) => !superseded.has(r.id));
  if (heads.length > 0) {
    throw new LineageError(
      `${chain}: (${describe(key)}) already has a current row (${heads
        .map((h) => h.id)
        .join(", ")}). A change is a supersession of it, not a second independent row. ` +
        `Pass supersedesId.`,
      "MUST_SUPERSEDE_CURRENT_HEAD",
    );
  }
}

// ── MatchDecision ────────────────────────────────────────────────────────────────────────────

export async function appendDecision(
  tx: Prisma.TransactionClient,
  input: {
    scoreId: string;
    state: MatchDecisionState;
    actor: string;
    reason?: string | null;
    effectiveAt?: Date;
    supersedesId?: string | null;
  },
) {
  const key = { scoreId: input.scoreId };
  const findLineage = () => tx.matchDecision.findMany({ where: { scoreId: input.scoreId } });

  if (input.supersedesId) {
    await assertSupersedable({
      supersedesId: input.supersedesId,
      incomingLineage: key,
      lineageOf: (r) => ({ scoreId: r.scoreId }),
      findById: (id) => tx.matchDecision.findUnique({ where: { id } }),
      findLineage,
      chain: "MatchDecision",
    });
  } else {
    assertNoExistingHead(await findLineage(), "MatchDecision", key);
  }

  return tx.matchDecision.create({
    data: {
      scoreId: input.scoreId,
      state: input.state,
      actor: input.actor,
      reason: input.reason ?? null,
      ...(input.effectiveAt ? { effectiveAt: input.effectiveAt } : {}),
      supersedesId: input.supersedesId ?? null,
    },
  });
}

// ── MatchCorrection ──────────────────────────────────────────────────────────────────────────

export async function appendCorrection(
  tx: Prisma.TransactionClient,
  input: {
    scoreId: string;
    field: string;
    beforeValue: Prisma.InputJsonValue;
    afterValue: Prisma.InputJsonValue;
    reason: string;
    source: string;
    actor: string;
    effectiveAt?: Date;
    supersedesId?: string | null;
  },
) {
  // Corrections are per FIELD: two different fields on one score are independent chains, so the
  // lineage key includes the field. Without it, correcting `msaModifier` would be refused because
  // a `fitScore` correction already existed.
  const key = { scoreId: input.scoreId, field: input.field };
  const findLineage = () =>
    tx.matchCorrection.findMany({ where: { scoreId: input.scoreId, field: input.field } });

  if (input.supersedesId) {
    await assertSupersedable({
      supersedesId: input.supersedesId,
      incomingLineage: key,
      lineageOf: (r) => ({ scoreId: r.scoreId, field: r.field }),
      findById: (id) => tx.matchCorrection.findUnique({ where: { id } }),
      findLineage,
      chain: "MatchCorrection",
    });
  } else {
    assertNoExistingHead(await findLineage(), "MatchCorrection", key);
  }

  return tx.matchCorrection.create({
    data: {
      scoreId: input.scoreId,
      field: input.field,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      reason: input.reason,
      source: input.source,
      actor: input.actor,
      ...(input.effectiveAt ? { effectiveAt: input.effectiveAt } : {}),
      supersedesId: input.supersedesId ?? null,
    },
  });
}

// ── MatchOutcomeEvent ────────────────────────────────────────────────────────────────────────

export async function appendOutcome(
  tx: Prisma.TransactionClient,
  input: {
    candidateId: string;
    waypointBrandId: string;
    originatingRunId: string;
    type: MatchOutcomeType;
    actor: string;
    reason?: string | null;
    effectiveAt?: Date;
    supersedesId?: string | null;
  },
) {
  // Keyed on candidate AND brand. On candidateId alone, "placed at Brand A" could supersede
  // "lost at Brand B", silently rewriting one brand's outcome with another's.
  const key = { candidateId: input.candidateId, waypointBrandId: input.waypointBrandId };
  const findLineage = () => tx.matchOutcomeEvent.findMany({ where: key });

  if (input.supersedesId) {
    await assertSupersedable({
      supersedesId: input.supersedesId,
      incomingLineage: key,
      lineageOf: (r) => ({ candidateId: r.candidateId, waypointBrandId: r.waypointBrandId }),
      findById: (id) => tx.matchOutcomeEvent.findUnique({ where: { id } }),
      findLineage,
      chain: "MatchOutcomeEvent",
    });
  } else {
    // Deliberately NOT assertNoExistingHead. Outcomes are a real-world TIMELINE: `introduced` then
    // `advanced` then `placed` are separate events, not corrections of each other. Supersession
    // here means "that event was recorded wrongly", which is the exception rather than the rule.
  }

  return tx.matchOutcomeEvent.create({
    data: {
      candidateId: input.candidateId,
      waypointBrandId: input.waypointBrandId,
      originatingRunId: input.originatingRunId,
      type: input.type,
      actor: input.actor,
      reason: input.reason ?? null,
      ...(input.effectiveAt ? { effectiveAt: input.effectiveAt } : {}),
      supersedesId: input.supersedesId ?? null,
    },
  });
}

// ── CandidateInputVersion ────────────────────────────────────────────────────────────────────

export async function appendInputVersion(
  tx: Prisma.TransactionClient,
  input: {
    candidateId: string;
    sourceType: string;
    sourceHash: string;
    sourceRef?: string | null;
    capturedAt: Date;
    approvedAt?: Date | null;
    supersedesId?: string | null;
  },
) {
  // Keyed on candidate AND sourceType, so a questionnaire cannot supersede an intelligence summary.
  const key = { candidateId: input.candidateId, sourceType: input.sourceType };
  const findLineage = () => tx.candidateInputVersion.findMany({ where: key });

  if (input.supersedesId) {
    await assertSupersedable({
      supersedesId: input.supersedesId,
      incomingLineage: key,
      lineageOf: (r) => ({ candidateId: r.candidateId, sourceType: r.sourceType }),
      findById: (id) => tx.candidateInputVersion.findUnique({ where: { id } }),
      findLineage,
      chain: "CandidateInputVersion",
    });
  } else {
    assertNoExistingHead(await findLineage(), "CandidateInputVersion", key);
  }

  return tx.candidateInputVersion.create({
    data: {
      candidateId: input.candidateId,
      sourceType: input.sourceType,
      sourceHash: input.sourceHash,
      sourceRef: input.sourceRef ?? null,
      capturedAt: input.capturedAt,
      approvedAt: input.approvedAt ?? null,
      supersedesId: input.supersedesId ?? null,
    },
  });
}

// ── Derivation helper ────────────────────────────────────────────────────────────────────────

/**
 * The current head of a chain: the row nothing else supersedes. "Current" is derived, never stored,
 * so there is no flag that can drift out of step with the rows. Sound only because the appends
 * above refuse to create a second head.
 */
export function currentHead<T extends { id: string; supersedesId: string | null }>(rows: T[]): T | null {
  const superseded = new Set(rows.map((r) => r.supersedesId).filter(Boolean) as string[]);
  const heads = rows.filter((r) => !superseded.has(r.id));
  return heads.length === 1 ? heads[0] : null;
}
