import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guards the abuse, delivery and opt-out contract of the public capture routes.
 *
 * Each test here fails against the code as it stood before: the routes discarded
 * Resend's `{ data, error }` result and answered `{ success: true }` for mail
 * that never left; nothing counted requests, so one POST in a loop delivered a
 * message to a stranger every iteration; and an unsubscribe was recorded against
 * a single row, so the next submission wrote a fresh row with the flag cleared
 * and the sequence resumed.
 */

const h = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  });
  return {
    scheduled: [] as Array<() => unknown>,
    db: {
      lead: model(),
      checklistDownload: model(),
      escapeKitDownload: model(),
      pitchDecoderDownload: model(),
      aiFddReaderDownload: model(),
      scorecardSubmission: model(),
      archetypeSubmission: model(),
      rateLimitBucket: model(),
      // The canonical opt-out record (bounces, complaints, unsubscribes).
      // Absent, the suppression check throws and fails closed, which reads
      // as 'everyone is suppressed'.
      suppressionList: model(),
    },
    sendEvent: vi.fn(),
    emailSend: vi.fn(),
    notifyCrm: vi.fn(),
    subscribeToBeehiiv: vi.fn(),
  };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => void h.scheduled.push(cb) };
});
vi.mock("@/lib/prisma", () => ({ default: h.db }));
vi.mock("@/inngest/client", () => ({ inngest: { send: h.sendEvent } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: h.emailSend }; } }));
vi.mock("@/lib/crm", () => ({ notifyCrm: h.notifyCrm }));
vi.mock("@/lib/beehiiv", () => ({ subscribeToBeehiiv: h.subscribeToBeehiiv }));

const SECRET = "test-unsubscribe-secret";
process.env.UNSUBSCRIBE_SECRET = SECRET;
process.env.NEXT_PUBLIC_SITE_URL = "https://test.waypointfranchise.com";

const ID = "rec_test_1";
const EMAIL = "prospect@example.com";

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function runScheduled() {
  for (const cb of h.scheduled) await cb();
}

/** A Resend failure as the SDK actually reports it: resolved, not thrown. */
const RESEND_ERROR = { data: null, error: { name: "validation_error", message: "invalid recipient" } };
const RESEND_OK = { data: { id: "re_1" }, error: null };

beforeEach(() => {
  h.scheduled.length = 0;
  for (const m of Object.values(h.db)) {
    m.findFirst.mockReset().mockResolvedValue(null);
    m.findUnique.mockReset().mockResolvedValue(null);
    m.create.mockReset().mockResolvedValue({ id: ID });
    m.update.mockReset().mockResolvedValue({ id: ID });
    m.updateMany.mockReset().mockResolvedValue({ count: 0 });
    m.delete.mockReset().mockResolvedValue({ id: ID });
    m.deleteMany.mockReset().mockResolvedValue({ count: 0 });
    m.upsert.mockReset().mockResolvedValue({ count: 1 });
  }
  h.sendEvent.mockReset().mockResolvedValue({ ids: ["evt_1"] });
  h.emailSend.mockReset().mockResolvedValue(RESEND_OK);
  h.notifyCrm.mockReset().mockResolvedValue(undefined);
  h.subscribeToBeehiiv.mockReset().mockResolvedValue(undefined);
});

// ── Resend results are not optional reading ─────────────────────────────────

describe("a failed subscriber send is reported to the visitor", () => {
  it("returns 500 when the checklist send fails", async () => {
    // First send is Kelsey's notification, second is the subscriber's copy.
    h.emailSend.mockResolvedValueOnce(RESEND_OK).mockResolvedValueOnce(RESEND_ERROR);
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL, name: "Test Prospect" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("starts no nurture sequence and records no delivery when the send fails", async () => {
    h.emailSend.mockResolvedValueOnce(RESEND_OK).mockResolvedValueOnce(RESEND_ERROR);
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.sendEvent).not.toHaveBeenCalled();
    // Leaving nurtureStep at 0 is what lets the visitor's retry through.
    expect(h.db.checklistDownload.updateMany).not.toHaveBeenCalled();
  });

  it("still succeeds when only Kelsey's internal notification fails", async () => {
    // Best-effort by design: the visitor is not the right person to fail for it.
    h.emailSend.mockResolvedValueOnce(RESEND_ERROR).mockResolvedValueOnce(RESEND_OK);
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });
  });

  it("marks the delivery only once the subscriber send succeeded", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));

    // updateMany scoped to nurtureStep 0, so this only ever advances: a quiz
    // retake reuses a row that may already be further along.
    expect(h.db.checklistDownload.updateMany).toHaveBeenCalledWith({
      where: { id: ID, nurtureStep: 0 },
      data: { nurtureStep: 1 },
    });
  });
});

// ── Rate limiting and idempotency ───────────────────────────────────────────

describe("repeat submissions cannot be used to bomb an inbox", () => {
  it("suppresses every side effect for a duplicate inside the window", async () => {
    h.db.checklistDownload.findFirst.mockResolvedValue({ id: "already_delivered" });
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ deduplicated: true });
    expect(h.emailSend).not.toHaveBeenCalled();
    expect(h.db.checklistDownload.create).not.toHaveBeenCalled();
    expect(h.notifyCrm).not.toHaveBeenCalled();
    expect(h.subscribeToBeehiiv).not.toHaveBeenCalled();
    expect(h.sendEvent).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After once the address is over its limit", async () => {
    h.db.rateLimitBucket.upsert.mockResolvedValue({ count: 99 });
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(h.emailSend).not.toHaveBeenCalled();
  });

  it("counts the client address when a proxy header identifies one", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }, { "x-real-ip": "203.0.113.9" }));

    const scopes = h.db.rateLimitBucket.upsert.mock.calls.map(
      (c) => (c[0] as { create: { scope: string; key: string } }).create
    );
    expect(scopes).toContainEqual(expect.objectContaining({ scope: "ip", key: "203.0.113.9" }));
    expect(scopes).toContainEqual(expect.objectContaining({ scope: "email", key: EMAIL }));
  });

  it("refuses rather than sending when the limiter itself is unreachable", async () => {
    // Fail closed: the same outage hides the row write, the unsubscribe token and
    // the nurture, so failing open would only email a stranger something we hold
    // no record of and they cannot opt out of.
    h.db.rateLimitBucket.upsert.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));

    expect(res.status).toBe(503);
    expect(h.emailSend).not.toHaveBeenCalled();
  });

  it("collapses an unrecognised checklist slug so it cannot mint fresh dedup keys", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL, checklistSlug: "not-a-real-slug" }));

    expect(h.db.checklistDownload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checklistType: "universal" }) })
    );
  });

  it("rejects a body with no usable address before doing any work", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(h.db.rateLimitBucket.upsert).not.toHaveBeenCalled();
    expect(h.emailSend).not.toHaveBeenCalled();
  });

  it("stores the address normalized so later lookups agree with each other", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: "  Prospect@Example.COM " }));

    expect(h.db.checklistDownload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: EMAIL }) })
    );
  });
});

// ── Suppression is a property of the address ────────────────────────────────

describe("an opt-out recorded anywhere stops a new sequence", () => {
  /** Answers the suppression query only; the dedup query still sees nothing. */
  function suppressOn(model: { findFirst: ReturnType<typeof vi.fn> }) {
    model.findFirst.mockImplementation(async (args: { where?: Record<string, unknown> }) =>
      args?.where?.unsubscribed === true ? { id: "opted_out" } : null
    );
  }

  it("delivers what was asked for but starts no drip", async () => {
    // A form filled in seconds ago is a direct request, so the download still
    // goes out. What an opt-out withholds is the sequence that follows it.
    suppressOn(h.db.escapeKitDownload);
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(res.status).toBe(200);
    expect(h.emailSend).toHaveBeenCalledTimes(2);
    // The opt-out lives on a DIFFERENT list, which the old per-record check
    // could not see at all.
    expect(h.sendEvent).not.toHaveBeenCalled();
  });

  it("starts the sequence when nothing is suppressed", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.sendEvent).toHaveBeenCalledTimes(1);
  });

  it("treats an unanswerable suppression lookup as suppressed", async () => {
    h.db.archetypeSubmission.findFirst.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.sendEvent).not.toHaveBeenCalled();
  });
});

// ── Unsubscribe links have to point at their own list ───────────────────────

describe("unsubscribe links resolve to a handler that can find the record", () => {
  function headersOfLastSend(): Record<string, string> {
    const calls = h.emailSend.mock.calls;
    return (calls[calls.length - 1]![0] as { headers?: Record<string, string> }).headers ?? {};
  }

  it("sends Escape Kit recipients to the Escape Kit endpoint", async () => {
    // The bug: this route built its link with a helper hardcoded to
    // /api/unsubscribe, which looks ids up in the CHECKLIST table. An Escape Kit
    // id can never be there, so every click reported "already removed" and
    // unsubscribed nobody.
    const { POST } = await import("@/app/api/escape-kit/route");

    await POST(post({ email: EMAIL }));

    expect(headersOfLastSend()["List-Unsubscribe"]).toContain("/api/escape-kit-unsubscribe");
  });

  it("sends checklist recipients to the checklist endpoint", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));

    expect(headersOfLastSend()["List-Unsubscribe"]).toContain("/api/unsubscribe");
  });

  it("falls back to a working mailto when no signed link can be built", async () => {
    // The old fallback was `${site}/unsubscribe`, a path with no handler, so the
    // one email guaranteed to go out during an outage carried a dead opt-out.
    h.db.checklistDownload.create.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));

    const headers = headersOfLastSend();
    expect(headers["List-Unsubscribe"]).toContain("mailto:");
    // One-click is a promise a mailto cannot keep, so it must not be asserted.
    expect(headers["List-Unsubscribe-Post"]).toBeUndefined();
  });
});

// ── Findings from the round-1 adversarial review ────────────────────────────

describe("the concurrency window between checking and delivering", () => {
  it("treats a lost race for the reservation as a duplicate", async () => {
    // The read-then-write check cannot see a sibling request that is in flight,
    // so three at once could each observe no prior delivery and each send. The
    // unique constraint is the atomic operation that check was missing.
    h.db.rateLimitBucket.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));

    await expect(res.json()).resolves.toMatchObject({ deduplicated: true });
    expect(h.emailSend).not.toHaveBeenCalled();
    expect(h.sendEvent).not.toHaveBeenCalled();
  });

  it("releases the reservation when delivery fails, so the retry gets through", async () => {
    h.emailSend.mockResolvedValueOnce(RESEND_OK).mockResolvedValueOnce(RESEND_ERROR);
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));

    expect(h.db.rateLimitBucket.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ scope: "lock" }) })
    );
  });
});

describe("delivery quota is charged for deliveries, not attempts", () => {
  it("does not charge the address counter for a duplicate", async () => {
    // Two harmless browser retries used to burn the hourly quota, so a request
    // for a DIFFERENT guide in the same hour was refused with a 429.
    h.db.checklistDownload.findFirst.mockResolvedValue({ id: "already_delivered" });
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));

    const scopes = h.db.rateLimitBucket.upsert.mock.calls.map(
      (c) => (c[0] as { create: { scope: string } }).create.scope
    );
    expect(scopes).not.toContain("email");
  });

  it("caps deliveries per day, not only per hour", async () => {
    // 3/hour sustained is 72 messages a day at a victim: a slower bombing tool,
    // not a bounded one. It is the only cap the quiz routes have.
    h.db.rateLimitBucket.upsert.mockImplementation(async (args: { create: { scope: string } }) => ({
      count: args.create.scope === "email-day" ? 99 : 1,
    }));
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));

    expect(res.status).toBe(429);
    expect(h.emailSend).not.toHaveBeenCalled();
  });
});

describe("an opt-out is not undone by the newsletter sync", () => {
  it("does not re-subscribe a suppressed address to beehiiv", async () => {
    // beehiiv is called with reactivate_existing, so before this an unsubscribed
    // person who later took a guide was resurrected onto the newsletter by that
    // download, having just been told they would get no more email.
    h.db.escapeKitDownload.findFirst.mockImplementation(async (args: { where?: Record<string, unknown> }) =>
      args?.where?.unsubscribed === true ? { id: "opted_out" } : null
    );
    // The real helper, not the stub the other tests use: the guard lives inside it.
    vi.doUnmock("@/lib/beehiiv");
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    process.env.BEEHIIV_API_KEY = "test-key";
    process.env.BEEHIIV_PUBLICATION_ID = "pub_test";

    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");
    await subscribeToBeehiiv(EMAIL, "Test Prospect");

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    delete process.env.BEEHIIV_API_KEY;
    delete process.env.BEEHIIV_PUBLICATION_ID;
    vi.doMock("@/lib/beehiiv", () => ({ subscribeToBeehiiv: h.subscribeToBeehiiv }));
    vi.resetModules();
  });
});

describe("quiz routes do not drip to someone whose result never arrived", () => {
  const SCORECARD = {
    name: "Test Prospect",
    email: EMAIL,
    score: 55,
    primaryDriver: "Autonomy",
    biggestFear: "Risk",
  };

  it("releases the submission row and starts nothing when the send fails", async () => {
    // after() already holds the callback by the time delivery is checked, so
    // returning 500 did not stop the sequence from starting.
    h.emailSend.mockResolvedValue(RESEND_ERROR);
    const { POST } = await import("@/app/api/scorecard-complete/route");

    const res = await POST(post(SCORECARD));
    await runScheduled();

    expect(res.status).toBe(500);
    expect(h.sendEvent).not.toHaveBeenCalled();
    expect(h.db.scorecardSubmission.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it("starts the sequence when the result did arrive", async () => {
    const { POST } = await import("@/app/api/scorecard-complete/route");

    await POST(post(SCORECARD));
    await runScheduled();

    expect(h.sendEvent).toHaveBeenCalledTimes(1);
    expect(h.db.scorecardSubmission.delete).not.toHaveBeenCalled();
  });
});

// ── Findings from the round-2 adversarial review ────────────────────────────

describe("the canonical suppression record is honoured", () => {
  it("starts no sequence for an address the bounce webhook suppressed", async () => {
    // SuppressionList is written by the Resend webhook and already gates cold
    // outreach. Querying only the six capture tables made this a second,
    // disconnected source of truth, so a hard-bounced address could still be
    // dripped to.
    h.db.suppressionList.findFirst.mockResolvedValue({ id: "bounced" });
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.sendEvent).not.toHaveBeenCalled();
  });

  it("checks the sender's domain, not only the address", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.db.suppressionList.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ email: EMAIL }, { domain: "example.com" }] },
      })
    );
  });
});

describe("the newsletter is not joined on a delivery that failed", () => {
  it("does not subscribe when the send failed", async () => {
    h.emailSend.mockResolvedValueOnce(RESEND_OK).mockResolvedValueOnce(RESEND_ERROR);
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.subscribeToBeehiiv).not.toHaveBeenCalled();
  });

  it("subscribes once the send succeeded", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.subscribeToBeehiiv).toHaveBeenCalledTimes(1);
  });
});

// ── Findings from the Claude-side review ────────────────────────────────────

describe("the contact form is not an open relay either", () => {
  const BODY = { name: "Test Prospect", email: EMAIL, message: "Hello" };

  it("is rate limited like the magnets", async () => {
    // It auto-replies to whatever address the body names, which is the same
    // unauthenticated shape as the lead magnets, and it had no limiter at all.
    h.db.rateLimitBucket.upsert.mockResolvedValue({ count: 99 });
    const { POST } = await import("@/app/api/contact/route");

    const res = await POST(post(BODY));

    expect(res.status).toBe(429);
    expect(h.emailSend).not.toHaveBeenCalled();
  });

  it("fails loudly when KELSEY's notification fails, not the auto-reply", async () => {
    // Inverted from the magnets on purpose: here the internal notification is
    // the deliverable, and losing it silently is the whole failure.
    h.emailSend.mockResolvedValueOnce(RESEND_ERROR);
    const { POST } = await import("@/app/api/contact/route");

    expect((await POST(post(BODY))).status).toBe(500);
  });

  it("still succeeds when only the courtesy auto-reply fails", async () => {
    h.emailSend.mockResolvedValueOnce(RESEND_OK).mockResolvedValueOnce(RESEND_ERROR);
    const { POST } = await import("@/app/api/contact/route");

    expect((await POST(post(BODY))).status).toBe(200);
  });
});

describe("the newsletter signup is not an open relay either", () => {
  it("is rate limited like the magnets", async () => {
    // It subscribes whatever address the body names to a list that sends real
    // mail, and it was the one endpoint of that shape left with no limiter.
    h.db.rateLimitBucket.upsert.mockResolvedValue({ count: 99 });
    const { POST } = await import("@/app/api/newsletter-subscribe/route");

    const res = await POST(post({ email: EMAIL, name: "Test Prospect" }));

    expect(res.status).toBe(429);
    expect(h.subscribeToBeehiiv).not.toHaveBeenCalled();
  });

  it("refuses rather than subscribing when the limiter is unreachable", async () => {
    h.db.rateLimitBucket.upsert.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/newsletter-subscribe/route");

    const res = await POST(post({ email: EMAIL }));

    expect(res.status).toBe(503);
    expect(h.subscribeToBeehiiv).not.toHaveBeenCalled();
  });

  it("subscribes the NORMALIZED address, so a later opt-out lookup matches", async () => {
    const { POST } = await import("@/app/api/newsletter-subscribe/route");

    const res = await POST(post({ email: "  Prospect@Example.COM  ", name: " Test " }));

    expect(res.status).toBe(200);
    expect(h.subscribeToBeehiiv).toHaveBeenCalledWith(EMAIL, "Test");
  });

  it("rejects a malformed address before touching beehiiv", async () => {
    const { POST } = await import("@/app/api/newsletter-subscribe/route");

    const res = await POST(post({ email: "not-an-address" }));

    expect(res.status).toBe(400);
    expect(h.subscribeToBeehiiv).not.toHaveBeenCalled();
  });
});

describe("a suppression lookup failure must not destroy quiz answers", () => {
  const SCORECARD = { name: "Test Prospect", email: EMAIL, score: 55, primaryDriver: "A", biggestFear: "B" };

  it("keeps the submission row when the lookup errors", async () => {
    // Fail-closed on SENDING is right. Deleting the row because we could not
    // tell erases the score and answers on a transient read error.
    h.db.suppressionList.findFirst.mockRejectedValue(new Error("db blip"));
    const { POST } = await import("@/app/api/scorecard-complete/route");

    await POST(post(SCORECARD));
    await runScheduled();

    expect(h.sendEvent).not.toHaveBeenCalled();
    expect(h.db.scorecardSubmission.delete).not.toHaveBeenCalled();
  });

  it("still releases the row for a genuine opt-out", async () => {
    h.db.suppressionList.findFirst.mockResolvedValue({ id: "opted_out" });
    const { POST } = await import("@/app/api/scorecard-complete/route");

    await POST(post(SCORECARD));
    await runScheduled();

    expect(h.sendEvent).not.toHaveBeenCalled();
    expect(h.db.scorecardSubmission.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });
});

describe("a send that REJECTS, rather than resolving with an error", () => {
  it("hands the reservation back so the retry is not deduplicated", async () => {
    // The `let release` hoisted above each route's try block exists only for
    // this path: a network-layer rejection skips every release inside the try,
    // and a retained lock answers the visitor's retry with a deduplicated
    // success for mail that was never delivered.
    h.emailSend.mockResolvedValueOnce(RESEND_OK).mockRejectedValueOnce(new Error("socket hang up"));
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));

    expect(res.status).toBe(500);
    expect(h.db.rateLimitBucket.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ scope: "lock" }) })
    );
  });
});

describe("a database outage refuses the form without losing the lead", () => {
  it("still pushes the lead to the CRM when the limiter is unreachable", async () => {
    // notifyCrm is an external webhook and is healthy in this window. Before
    // this hook, failing the limiter closed meant the visitor got a 503 and
    // Kelsey got nothing, where previously the lead still reached the CRM.
    h.db.rateLimitBucket.upsert.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL, name: "Test Prospect" }));
    await runScheduled();

    expect(res.status).toBe(503);
    expect(h.emailSend).not.toHaveBeenCalled();
    expect(h.notifyCrm).toHaveBeenCalledTimes(1);
    expect(h.notifyCrm.mock.calls[0][0]).toMatchObject({ email: EMAIL });
  });

  it("does NOT push a lead when the refusal is a rate limit", async () => {
    // A throttled request is the limiter working. Treating it as degraded would
    // feed Kelsey's CRM every attempt of an attack.
    h.db.rateLimitBucket.upsert.mockResolvedValue({ count: 99 });
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(res.status).toBe(429);
    expect(h.notifyCrm).not.toHaveBeenCalled();
  });

  it("does NOT push a lead for a duplicate", async () => {
    h.db.checklistDownload.findFirst.mockResolvedValue({ id: "already_delivered" });
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: EMAIL }));
    await runScheduled();

    expect(h.notifyCrm).not.toHaveBeenCalled();
  });
});
