import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../setup/test-db";
import { makeRun, makeScore } from "./_helpers";
import { appendDecision, appendOutcome } from "@/lib/match-workspace/append";
import { unlabeledSlateBrands, outcomesForRun, DEFAULT_STALE_AFTER_DAYS } from "@/lib/match-workspace/outcomes";

const tx = prisma as unknown as Parameters<typeof appendOutcome>[0];
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** A run with one brand confirmed onto the slate, confirmed `age` days ago. */
async function confirmedBrand(age: number, brandId: string) {
  const { run, candidate } = await makeRun();
  const score = await makeScore(run.id, { waypointBrandId: brandId });
  await appendDecision(tx, {
    scoreId: score.id,
    state: "final_slate",
    actor: "a@test",
    effectiveAt: daysAgo(age),
  });
  return { run, candidate, score };
}

describe("outcome capture", () => {
  it("records a timeline of distinct events for one candidate and brand", async () => {
    const { run, candidate } = await confirmedBrand(1, "wpb_outcome_timeline");
    const base = {
      candidateId: candidate.id,
      waypointBrandId: "wpb_outcome_timeline",
      originatingRunId: run.id,
      actor: "a@test",
    };
    await appendOutcome(tx, { ...base, type: "introduced", effectiveAt: daysAgo(20) });
    await appendOutcome(tx, { ...base, type: "advanced", effectiveAt: daysAgo(10) });
    await appendOutcome(tx, { ...base, type: "placed", effectiveAt: daysAgo(2) });

    const events = await outcomesForRun(prisma, run.id);
    expect(events.map((e) => e.type)).toEqual(["placed", "advanced", "introduced"]);
    // Every event carries who recorded it and when it actually happened.
    expect(events.every((e) => e.actor === "a@test")).toBe(true);
  });

  it("a correction is a superseding event; the mistaken one is kept", async () => {
    const { run, candidate } = await confirmedBrand(1, "wpb_outcome_fix");
    const wrong = await appendOutcome(tx, {
      candidateId: candidate.id,
      waypointBrandId: "wpb_outcome_fix",
      originatingRunId: run.id,
      type: "placed",
      actor: "a@test",
    });
    const fixed = await appendOutcome(tx, {
      candidateId: candidate.id,
      waypointBrandId: "wpb_outcome_fix",
      originatingRunId: run.id,
      type: "withdrawn",
      reason: "recorded against the wrong stage",
      actor: "a@test",
      supersedesId: wrong.id,
    });
    expect(fixed.supersedesId).toBe(wrong.id);
    expect((await prisma.matchOutcomeEvent.findUniqueOrThrow({ where: { id: wrong.id } })).type).toBe("placed");
  });
});

describe("the unlabeled queue is DERIVED, never stored", () => {
  it("surfaces a confirmed brand that has sat without an outcome", async () => {
    const { candidate } = await confirmedBrand(DEFAULT_STALE_AFTER_DAYS + 5, "wpb_unlabeled_old");
    const queue = await unlabeledSlateBrands(prisma);
    const mine = queue.find((q) => q.candidateId === candidate.id);
    expect(mine).toBeDefined();
    expect(mine!.waypointBrandId).toBe("wpb_unlabeled_old");
    expect(mine!.daysSinceConfirmed).toBeGreaterThanOrEqual(DEFAULT_STALE_AFTER_DAYS);
  });

  it("does not surface a brand confirmed recently", async () => {
    const { candidate } = await confirmedBrand(2, "wpb_unlabeled_fresh");
    const queue = await unlabeledSlateBrands(prisma);
    expect(queue.find((q) => q.candidateId === candidate.id)).toBeUndefined();
  });

  it("drops out of the queue as soon as any outcome is recorded", async () => {
    const { run, candidate } = await confirmedBrand(DEFAULT_STALE_AFTER_DAYS + 5, "wpb_unlabeled_then_labeled");
    expect((await unlabeledSlateBrands(prisma)).some((q) => q.candidateId === candidate.id)).toBe(true);

    await appendOutcome(tx, {
      candidateId: candidate.id,
      waypointBrandId: "wpb_unlabeled_then_labeled",
      originatingRunId: run.id,
      type: "introduced",
      actor: "a@test",
    });
    expect((await unlabeledSlateBrands(prisma)).some((q) => q.candidateId === candidate.id)).toBe(false);
  });

  it("ignores a brand that was shortlisted or later rejected, not confirmed", async () => {
    const { run } = await makeRun();
    const shortlisted = await makeScore(run.id, { waypointBrandId: "wpb_never_confirmed" });
    await appendDecision(tx, {
      scoreId: shortlisted.id,
      state: "shortlist",
      actor: "a@test",
      effectiveAt: daysAgo(90),
    });

    const rejectedLater = await makeScore(run.id, { waypointBrandId: "wpb_confirmed_then_rejected" });
    const head = await appendDecision(tx, {
      scoreId: rejectedLater.id,
      state: "final_slate",
      actor: "a@test",
      effectiveAt: daysAgo(90),
    });
    await appendDecision(tx, {
      scoreId: rejectedLater.id,
      state: "rejected",
      actor: "a@test",
      effectiveAt: daysAgo(60),
      supersedesId: head.id,
    });

    const queue = await unlabeledSlateBrands(prisma);
    expect(queue.some((q) => q.waypointBrandId === "wpb_never_confirmed")).toBe(false);
    expect(queue.some((q) => q.waypointBrandId === "wpb_confirmed_then_rejected")).toBe(false);
  });

  it("the threshold is a parameter, not stored state", async () => {
    const { candidate } = await confirmedBrand(10, "wpb_threshold_probe");
    expect((await unlabeledSlateBrands(prisma)).some((q) => q.candidateId === candidate.id)).toBe(false);
    expect(
      (await unlabeledSlateBrands(prisma, { staleAfterDays: 5 })).some((q) => q.candidateId === candidate.id),
    ).toBe(true);
  });
});

describe("[C-1] the queue never becomes a task list", () => {
  const SCHEMA = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  const domain = SCHEMA.slice(SCHEMA.search(/\/\/\s*[=═]+\s*\n\s*\/\/\s*MATCH WORKSPACE/i));

  it("no match-workspace model carries a task, assignment or reminder field", () => {
    // The exclusion in [C-1] is permanent, and the realistic way it erodes is one convenience
    // column at a time on exactly this queue. Asserted structurally rather than trusted.
    const forbidden = [
      "assignee",
      "assignedTo",
      "dueAt",
      "dueDate",
      "snoozedUntil",
      "snoozeUntil",
      "dismissed",
      "dismissedAt",
      "completedAt",
      "reminderAt",
      "priority",
      "stage",
      "pipelineStage",
      "journeyStage",
      "nextAction",
      "followUpAt",
    ];
    const found = forbidden.filter((f) => new RegExp(`^\\s*${f}\\b`, "m").test(domain));
    expect(
      found,
      `[C-1] permanently excludes a pipeline, tasks and reminders. These fields would make this ` +
        `domain a CRM: ${found.join(", ")}`,
    ).toEqual([]);
  });

  it("there is no table backing the queue", () => {
    expect(domain).not.toMatch(/^model\s+\w*(Queue|Task|Reminder|Followup|FollowUp)\w*\s*\{/m);
  });

  it("the queue module stores nothing", () => {
    const src = readFileSync(join(process.cwd(), "src", "lib", "match-workspace", "outcomes.ts"), "utf8");
    // A derived view reads. The moment it writes, it is no longer derived.
    expect(src).not.toMatch(/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  });
});
