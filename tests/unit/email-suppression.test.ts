import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The suppression module's two contracts.
 *
 * FAIL CLOSED, BUT SAY WHY. A lookup that errors must still stop the send, and
 * must not be recorded as a voluntary opt-out. The boolean helper collapsed
 * both, so a transient database error wrote "unsubscribed" against someone who
 * never asked, and the Inngest step that dropped the mail returned a COMPLETED
 * step that is never retried. The message was gone with no trace of the cause.
 */

const LISTS = [
  "checklistDownload",
  "escapeKitDownload",
  "pitchDecoderDownload",
  "aiFddReaderDownload",
  "scorecardSubmission",
  "archetypeSubmission",
] as const;

const h = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    db: {
      lead: model(),
      checklistDownload: model(),
      escapeKitDownload: model(),
      pitchDecoderDownload: model(),
      aiFddReaderDownload: model(),
      scorecardSubmission: model(),
      archetypeSubmission: model(),
      suppressionList: model(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ default: h.db }));

const EMAIL = "prospect@example.com";

beforeEach(() => {
  for (const m of Object.values(h.db)) {
    m.findFirst.mockReset().mockResolvedValue(null);
    m.findUnique.mockReset().mockResolvedValue(null);
    m.update.mockReset().mockResolvedValue({ id: "x" });
    m.updateMany.mockReset().mockResolvedValue({ count: 0 });
    m.delete.mockReset().mockResolvedValue({ id: "x" });
    m.deleteMany.mockReset().mockResolvedValue({ count: 0 });
    m.upsert.mockReset().mockResolvedValue({ id: "x" });
  }
});

describe("a failed lookup is not an opt-out", () => {
  it("reports lookup-failed, not suppressed, when the canonical read throws", async () => {
    h.db.suppressionList.findFirst.mockRejectedValue(new Error("db blip"));
    const { suppressionVerdict } = await import("@/lib/email-suppression");

    await expect(suppressionVerdict(EMAIL)).resolves.toBe("lookup-failed");
  });

  it("reports lookup-failed when one of the six list reads throws", async () => {
    h.db.archetypeSubmission.findFirst.mockRejectedValue(new Error("db blip"));
    const { suppressionVerdict } = await import("@/lib/email-suppression");

    await expect(suppressionVerdict(EMAIL)).resolves.toBe("lookup-failed");
  });

  it("still fails CLOSED: the boolean helper says do-not-send on that same error", async () => {
    // The label changed. The behaviour must not: an unanswerable "may we email
    // this person?" is still a no.
    h.db.suppressionList.findFirst.mockRejectedValue(new Error("db blip"));
    const { isEmailSuppressedFailClosed } = await import("@/lib/email-suppression");

    await expect(isEmailSuppressedFailClosed(EMAIL)).resolves.toBe(true);
  });

  it("separates the three verdicts on a healthy database", async () => {
    const { suppressionVerdict } = await import("@/lib/email-suppression");

    await expect(suppressionVerdict(EMAIL)).resolves.toBe("clear");

    h.db.suppressionList.findFirst.mockResolvedValue({ id: "sup_1" });
    await expect(suppressionVerdict(EMAIL)).resolves.toBe("suppressed");
  });
});
