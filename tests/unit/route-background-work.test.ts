import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";

/**
 * Guards how the seven lead-capture routes run their background work.
 *
 * The bug: blocks commented "fire-and-forget, does not block delivery" did
 * `await inngest.send(...)` directly in front of the Resend send, so a slow
 * Inngest round-trip delayed the very email the visitor was waiting on. The two
 * quiz routes had it worse: their send had no try/catch at all, so an Inngest
 * hiccup returned a 500 and sent nothing.
 *
 * Every background kind the routes schedule is pinned here (nurture trigger,
 * CRM sync, Beehiiv sync, Slack alert), because an earlier version of this file
 * covered only the nurture trigger and stayed green when the others were
 * reverted to the bare idiom.
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
    afterShouldThrow: { value: false },
    scheduled: [] as Array<() => unknown>,
    db: {
      lead: model(),
      checklistDownload: model(),
      escapeKitDownload: model(),
      pitchDecoderDownload: model(),
      aiFddReaderDownload: model(),
      scorecardSubmission: model(),
      archetypeSubmission: model(),
      // Backs the rate limiter every capture route now runs before it does
      // anything. Without it the guard sees an undefined model, fails closed,
      // and every route returns 503 — which is the limiter working, not a bug.
      rateLimitBucket: model(),
    },
    sendEvent: vi.fn(),
    emailSend: vi.fn(),
    notifyCrm: vi.fn(),
    subscribeToBeehiiv: vi.fn(),
  };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => unknown) => {
      if (h.afterShouldThrow.value) {
        throw new Error("`after` was called outside a request scope");
      }
      h.scheduled.push(cb);
    },
  };
});

vi.mock("@/lib/prisma", () => ({ default: h.db }));
vi.mock("@/inngest/client", () => ({ inngest: { send: h.sendEvent } }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: h.emailSend };
  },
}));
vi.mock("@/lib/crm", () => ({ notifyCrm: h.notifyCrm }));
vi.mock("@/lib/beehiiv", () => ({ subscribeToBeehiiv: h.subscribeToBeehiiv }));

/** The lead-magnet routes hardcode this as the skip-my-own-submissions address. */
const KELSEY = "kelsey@waypointfranchise.com";
const ID = "rec_test_1";

// buildUnsubscribeUrl (@/lib/nurture-emails) throws without this, and capture-email
// and escape-kit call it while building their email. Set it so a missing env var
// cannot be mistaken for the delivery failure these tests look for.
process.env.UNSUBSCRIBE_SECRET ??= "test-unsubscribe-secret";

const magnetBody = (email: string) => ({ name: "Test Prospect", email, articleSlug: "some-article" });
const SCORECARD_BODY = {
  name: "Test Prospect",
  email: "prospect@example.com",
  score: 55,
  primaryDriver: "Autonomy",
  biggestFear: "Risk",
};
const ARCHETYPE_BODY = {
  name: "Test Prospect",
  email: "prospect@example.com",
  archetype: "builder",
  archetypeName: "The Builder",
  strongFits: ["Home Services", "B2B"],
  weakFits: ["Food"],
};

const MAGNET_ROUTES = [
  { name: "capture-email", path: "@/app/api/capture-email/route", event: "nurture/checklist.download", beehiiv: true },
  { name: "escape-kit", path: "@/app/api/escape-kit/route", event: "nurture/escape-kit.download", beehiiv: true },
  { name: "pitch-decoder", path: "@/app/api/pitch-decoder/route", event: "nurture/pitch-decoder.download", beehiiv: true },
  { name: "ai-fdd-reader", path: "@/app/api/ai-fdd-reader/route", event: "nurture/ai-fdd-reader.download", beehiiv: true },
] as const;

const QUIZ_ROUTES = [
  {
    name: "scorecard-complete",
    path: "@/app/api/scorecard-complete/route",
    event: "nurture/scorecard.complete",
    body: SCORECARD_BODY,
    submissionModel: "scorecardSubmission" as const,
    beehiiv: true,
  },
  {
    name: "archetype-complete",
    path: "@/app/api/archetype-complete/route",
    event: "nurture/archetype.complete",
    body: ARCHETYPE_BODY,
    submissionModel: "archetypeSubmission" as const,
    // This route has no newsletter sync; only the CRM sync and nurture trigger.
    beehiiv: false,
  },
] as const;

function post(body: unknown) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Fire every callback the handler scheduled, as the platform would post-response. */
async function runScheduled() {
  for (const cb of h.scheduled) await cb();
}

beforeEach(() => {
  h.afterShouldThrow.value = false;
  h.scheduled.length = 0;
  for (const m of Object.values(h.db)) {
    // null = no prior delivery and no opt-out on record: the ordinary first-time
    // submission. Individual tests override it to assert the other branches.
    m.findFirst.mockReset().mockResolvedValue(null);
    m.findUnique.mockReset().mockResolvedValue(null);
    m.create.mockReset().mockResolvedValue({ id: ID });
    m.update.mockReset().mockResolvedValue({ id: ID });
    m.updateMany.mockReset().mockResolvedValue({ count: 0 });
    m.delete.mockReset().mockResolvedValue({ id: ID });
    m.deleteMany.mockReset().mockResolvedValue({ count: 0 });
    // count 1 = first hit of a fresh window, comfortably inside every limit.
    m.upsert.mockReset().mockResolvedValue({ count: 1 });
  }
  h.sendEvent.mockReset().mockResolvedValue({ ids: ["evt_1"] });
  h.emailSend.mockReset().mockResolvedValue({ id: "re_1" });
  h.notifyCrm.mockReset().mockResolvedValue(undefined);
  h.subscribeToBeehiiv.mockReset().mockResolvedValue(undefined);
});

describe.each([...MAGNET_ROUTES, ...QUIZ_ROUTES])("$name background work", (route) => {
  const body = "body" in route ? route.body : magnetBody("prospect@example.com");
  const expectedEmails = "body" in route ? 1 : 2;

  it("sends no Inngest event while the handler is still running", async () => {
    const { POST } = await import(route.path);

    const res = await POST(post(body));

    // THE guard: restoring `await inngest.send(...)` fails here.
    expect(h.sendEvent).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    // Delivery already happened, inside the handler.
    expect(h.emailSend).toHaveBeenCalledTimes(expectedEmails);
  });

  it("sends the event with the right name and id once the scheduled work runs", async () => {
    const { POST } = await import(route.path);

    await POST(post(body));
    await runScheduled();

    expect(h.sendEvent).toHaveBeenCalledTimes(1);
    const payload = h.sendEvent.mock.calls[0]![0] as { name: string; data: Record<string, string> };
    expect(payload.name).toBe(route.event);
    expect(payload.data.downloadId ?? payload.data.submissionId).toBe(ID);
  });

  it("schedules the CRM sync rather than calling it inline", async () => {
    const { POST } = await import(route.path);

    await POST(post(body));
    expect(h.notifyCrm).not.toHaveBeenCalled();

    await runScheduled();
    expect(h.notifyCrm).toHaveBeenCalledTimes(1);
  });

  it("schedules the Beehiiv sync rather than calling it inline", async () => {
    const { POST } = await import(route.path);

    await POST(post(body));
    expect(h.subscribeToBeehiiv).not.toHaveBeenCalled();

    await runScheduled();
    expect(h.subscribeToBeehiiv).toHaveBeenCalledTimes(route.beehiiv ? 1 : 0);
  });

  it("still delivers the email when after() throws", async () => {
    h.afterShouldThrow.value = true;
    const { POST } = await import(route.path);

    const res = await POST(post(body));

    expect(res.status).toBe(200);
    expect(h.emailSend).toHaveBeenCalledTimes(expectedEmails);
  });

  it("still delivers the email when Inngest is down", async () => {
    // The actual user-facing contract this whole change exists to deliver:
    // the nurture system failing must not cost the visitor their email.
    h.sendEvent.mockRejectedValue(new Error("inngest down"));
    const { POST } = await import(route.path);

    const res = await POST(post(body));
    await runScheduled();

    expect(res.status).toBe(200);
    expect(h.emailSend).toHaveBeenCalledTimes(expectedEmails);
  });
});

describe.each(QUIZ_ROUTES)("$name submission lifecycle", ({ path, body, submissionModel }) => {
  it("reports the new sequence in the response body", async () => {
    const { POST } = await import(path);

    const res = await POST(post(body));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.submissionId).toBe(ID);
    expect(json.sequenceStarted).toBe(true);
  });

  it("starts no second sequence when one is already active", async () => {
    // The double-email guard. This branch must never schedule a nurture trigger.
    h.db[submissionModel].findFirst.mockResolvedValue({ id: "existing_1" });
    const { POST } = await import(path);

    const res = await POST(post(body));
    await runScheduled();
    const json = await res.json();

    expect(json.sequenceStarted).toBe(false);
    expect(h.sendEvent).not.toHaveBeenCalled();
    expect(h.db[submissionModel].create).not.toHaveBeenCalled();
  });

  it("releases the submission row when the nurture trigger fails", async () => {
    // Without this compensation the orphan row matches the dedup query forever,
    // so the address could never start a sequence again.
    h.sendEvent.mockRejectedValue(new Error("inngest down"));
    const { POST } = await import(path);

    await POST(post(body));
    await runScheduled();

    expect(h.db[submissionModel].delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it("keeps the submission row when the nurture trigger succeeds", async () => {
    const { POST } = await import(path);

    await POST(post(body));
    await runScheduled();

    expect(h.db[submissionModel].delete).not.toHaveBeenCalled();
  });
});

describe("scorecard-complete Slack alert", () => {
  const HIGH = { ...SCORECARD_BODY, score: 85 };
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/abc";
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
  });

  afterEach(() => {
    delete process.env.SLACK_WEBHOOK_URL;
    fetchSpy.mockRestore();
  });

  it("schedules the alert rather than firing it inline", async () => {
    const { POST } = await import("@/app/api/scorecard-complete/route");

    await POST(post(HIGH));
    expect(fetchSpy).not.toHaveBeenCalled();

    await runScheduled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toBe("https://hooks.slack.test/abc");
  });

  it("sends no alert below the high-score threshold", async () => {
    const { POST } = await import("@/app/api/scorecard-complete/route");

    await POST(post(SCORECARD_BODY));
    await runScheduled();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("contact background work", () => {
  // No prisma and no Inngest here: the CRM sync is the only background work,
  // which is exactly why it is worth pinning. Nothing else would catch it.
  const body = { name: "Test Prospect", email: "prospect@example.com", message: "Hello" };

  it("schedules the CRM sync rather than calling it inline", async () => {
    const { POST } = await import("@/app/api/contact/route");

    const res = await POST(post(body));

    expect(h.notifyCrm).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(h.emailSend).toHaveBeenCalledTimes(2);

    await runScheduled();
    expect(h.notifyCrm).toHaveBeenCalledTimes(1);
  });

  it("still delivers the emails when after() throws", async () => {
    h.afterShouldThrow.value = true;
    const { POST } = await import("@/app/api/contact/route");

    const res = await POST(post(body));

    expect(res.status).toBe(200);
    expect(h.emailSend).toHaveBeenCalledTimes(2);
  });
});

describe.each(MAGNET_ROUTES)("$name Kelsey skip", ({ path }) => {
  it("never schedules a nurture event for Kelsey's own address", async () => {
    const { POST } = await import(path);

    const res = await POST(post(magnetBody(KELSEY)));
    await runScheduled();

    expect(res.status).toBe(200);
    expect(h.sendEvent).not.toHaveBeenCalled();
  });
});
