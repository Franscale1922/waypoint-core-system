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

/**
 * Reads the `where` of every updateMany recorded against the six list models.
 * The assertions below care about which rows a call would have touched, which
 * is the part a mock can still tell the truth about.
 */
function listUpdates() {
  return LISTS.flatMap((l) =>
    h.db[l].updateMany.mock.calls.map((c) => c[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    })
  );
}

describe("reversing a self-service opt-out", () => {
  it("clears the flag on all six lists and removes the canonical row", async () => {
    h.db.suppressionList.findFirst.mockImplementation((args: any) =>
      args?.where?.email ? { id: "sup_1", reason: "unsubscribed" } : null
    );
    for (const l of LISTS) h.db[l].updateMany.mockResolvedValue({ count: 1 });
    h.db.suppressionList.deleteMany.mockResolvedValue({ count: 1 });
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    const out = await unsuppressEmail(EMAIL);

    expect(out.ok).toBe(true);
    expect(out.listRowsRestored).toBe(6);
    expect(out.canonicalCleared).toBe(true);
    expect(out.blockedBy).toBeNull();

    const updates = listUpdates();
    expect(updates).toHaveLength(6);
    for (const u of updates) {
      // Only rows currently opted out, and both columns reset together: leaving
      // unsubscribedAt set would misreport a mailable row as having opted out.
      expect(u.where).toMatchObject({ unsubscribed: true });
      expect(u.data).toEqual({ unsubscribed: false, unsubscribedAt: null });
    }
  });

  it("normalizes the address, so casing and padding still match", async () => {
    h.db.suppressionList.findFirst.mockResolvedValue(null);
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    await unsuppressEmail("  Prospect@Example.COM  ");

    expect(h.db.suppressionList.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: EMAIL }) })
    );
  });
});

describe("what a re-subscribe must refuse", () => {
  it("REFUSES a hard bounce, and changes nothing", async () => {
    h.db.suppressionList.findFirst.mockImplementation((args: any) =>
      args?.where?.email ? { id: "sup_1", reason: "bounce" } : null
    );
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    const out = await unsuppressEmail(EMAIL);

    expect(out.ok).toBe(false);
    expect(out.blockedBy).toBe("bounce");
    expect(listUpdates()).toHaveLength(0);
    expect(h.db.suppressionList.deleteMany).not.toHaveBeenCalled();
  });

  it("REFUSES a spam complaint or a not-a-fit reply", async () => {
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    for (const reason of ["complaint", "not_a_fit", "low_score"]) {
      h.db.suppressionList.findFirst.mockImplementation((args: any) =>
        args?.where?.email ? { id: "sup_1", reason } : null
      );
      const out = await unsuppressEmail(EMAIL);
      expect(out.ok).toBe(false);
      expect(out.blockedBy).toBe(reason);
    }
    expect(listUpdates()).toHaveLength(0);
  });

  it("REFUSES when a domain-level block covers the address", async () => {
    // The address row alone would have been clearable. The domain rule outranks
    // it, and clearing the address would report success over a still-gated one.
    h.db.suppressionList.findFirst.mockImplementation((args: any) =>
      args?.where?.domain ? { id: "sup_domain" } : { id: "sup_1", reason: "unsubscribed" }
    );
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    const out = await unsuppressEmail(EMAIL);

    expect(out.ok).toBe(false);
    expect(out.blockedBy).toContain("example.com");
    expect(listUpdates()).toHaveLength(0);
    expect(h.db.suppressionList.deleteMany).not.toHaveBeenCalled();
  });

  it("cannot delete a row that stopped being an unsubscribe mid-flight", async () => {
    // The reason is in the WHERE, not just checked beforehand, so a bounce
    // webhook upgrading the row between the read and the write cannot be
    // overtaken by a delete-by-id.
    h.db.suppressionList.findFirst.mockImplementation((args: any) =>
      args?.where?.email ? { id: "sup_1", reason: "unsubscribed" } : null
    );
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    await unsuppressEmail(EMAIL);

    expect(h.db.suppressionList.deleteMany).toHaveBeenCalledWith({
      where: { email: EMAIL, reason: "unsubscribed" },
    });
  });
});

describe("cold outreach is reported, never silently resumed", () => {
  it("reports a latched SUPPRESSED lead without clearing it", async () => {
    h.db.suppressionList.findFirst.mockResolvedValue(null);
    h.db.lead.findFirst.mockResolvedValue({ id: "lead_1", suppressionReason: "unsubscribe" });
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    const out = await unsuppressEmail(EMAIL);

    expect(out.latchedLead).toEqual({ id: "lead_1", suppressionReason: "unsubscribe" });
    // Reported, not reversed: there is no record of the pre-suppression status,
    // so putting someone back into cold outreach is not ours to guess.
    expect(h.db.lead.update).not.toHaveBeenCalled();
    expect(h.db.lead.updateMany).not.toHaveBeenCalled();
  });

  it("still reports the latched lead when the re-subscribe is refused", async () => {
    h.db.suppressionList.findFirst.mockImplementation((args: any) =>
      args?.where?.email ? { id: "sup_1", reason: "bounce" } : null
    );
    h.db.lead.findFirst.mockResolvedValue({ id: "lead_1", suppressionReason: "bounce" });
    const { unsuppressEmail } = await import("@/lib/email-suppression");

    const out = await unsuppressEmail(EMAIL);

    expect(out.ok).toBe(false);
    expect(out.latchedLead?.id).toBe("lead_1");
  });
});

describe("suppress and un-suppress are actually inverse", () => {
  it("un-suppress targets exactly the rows suppress wrote, on every list", async () => {
    const { suppressEmailEverywhere, unsuppressEmail, SUPPRESSION_LISTS } = await import(
      "@/lib/email-suppression"
    );

    await suppressEmailEverywhere(EMAIL);
    const wrote = listUpdates();

    for (const l of LISTS) h.db[l].updateMany.mockClear();
    h.db.suppressionList.findFirst.mockImplementation((args: any) =>
      args?.where?.email ? { id: "sup_1", reason: "unsubscribed" } : null
    );
    await unsuppressEmail(EMAIL);
    const undid = listUpdates();

    // Same six models, and the flag each one sets is the flag the other clears.
    expect(SUPPRESSION_LISTS).toHaveLength(6);
    expect(wrote).toHaveLength(6);
    expect(undid).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(wrote[i]!.data.unsubscribed).toBe(true);
      expect(undid[i]!.data.unsubscribed).toBe(false);
      // Each only touches rows in the state the other leaves behind, so neither
      // rewrites unsubscribedAt on a row it did not move.
      expect(wrote[i]!.where.unsubscribed).toBe(false);
      expect(undid[i]!.where.unsubscribed).toBe(true);
    }
  });
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
