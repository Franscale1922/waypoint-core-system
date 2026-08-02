import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guards how the six lead-capture routes run their background work.
 *
 * The bug: blocks commented "fire-and-forget, does not block delivery" did
 * `await inngest.send(...)` directly in front of the Resend send, so a slow
 * Inngest round-trip delayed the very email the visitor was waiting on. The two
 * quiz routes had it worse — their send had no try/catch at all, so an Inngest
 * hiccup returned a 500 and sent nothing.
 *
 * Three properties are asserted, each mapping to a way this has already gone wrong:
 *
 *   1. inngest.send must NOT run during the handler. Restoring `await
 *      inngest.send` fails this — it is the actual regression guard.
 *   2. The scheduled work still sends the event, with the right name and id.
 *   3. A throwing after() must not break delivery. after() throws SYNCHRONOUSLY
 *      when the platform supplies no waitUntil; an earlier cut of this fix left
 *      that call unguarded upstream of the sends, which would have 500'd the
 *      request and sent no email at all.
 */

let afterShouldThrow = false;
let scheduled: Array<() => unknown> = [];

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => unknown) => {
      if (afterShouldThrow) {
        throw new Error("`after` was called outside a request scope");
      }
      scheduled.push(cb);
    },
  };
});

const sendEvent = vi.fn();
vi.mock("@/inngest/client", () => ({
  inngest: { send: (...args: unknown[]) => sendEvent(...args) },
}));

const emailSend = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => emailSend(...args) };
  },
}));

const notifyCrm = vi.fn();
vi.mock("@/lib/crm", () => ({ notifyCrm: (...a: unknown[]) => notifyCrm(...a) }));
vi.mock("@/lib/beehiiv", () => ({ subscribeToBeehiiv: vi.fn().mockResolvedValue(undefined) }));

const ID = "rec_test_1";
const rec = { id: ID };
const model = () => ({
  create: vi.fn().mockResolvedValue(rec),
  update: vi.fn().mockResolvedValue(rec),
  findFirst: vi.fn().mockResolvedValue(null),
});
vi.mock("@/lib/prisma", () => ({
  default: {
    lead: model(),
    checklistDownload: model(),
    escapeKitDownload: model(),
    pitchDecoderDownload: model(),
    aiFddReaderDownload: model(),
    scorecardSubmission: model(),
    archetypeSubmission: model(),
  },
}));

/** The lead-magnet routes hardcode this as the skip-my-own-submissions address. */
const KELSEY = "kelsey@waypointfranchise.com";

// buildUnsubscribeUrl (@/lib/nurture-emails) throws without this, and capture-email
// and escape-kit call it while building their email. Set it so a missing env var
// cannot be mistaken for the delivery failure these tests look for.
process.env.UNSUBSCRIBE_SECRET ??= "test-unsubscribe-secret";

const magnetBody = (email: string) => ({ name: "Test Prospect", email, articleSlug: "some-article" });

/** Routes with a lead-magnet download + the Kelsey skip. */
const MAGNET_ROUTES = [
  { name: "capture-email", path: "@/app/api/capture-email/route", event: "nurture/checklist.download" },
  { name: "escape-kit", path: "@/app/api/escape-kit/route", event: "nurture/escape-kit.download" },
  { name: "pitch-decoder", path: "@/app/api/pitch-decoder/route", event: "nurture/pitch-decoder.download" },
  { name: "ai-fdd-reader", path: "@/app/api/ai-fdd-reader/route", event: "nurture/ai-fdd-reader.download" },
] as const;

/** Quiz routes: schema-validated payload, one email, no Kelsey skip. */
const QUIZ_ROUTES = [
  {
    name: "scorecard-complete",
    path: "@/app/api/scorecard-complete/route",
    event: "nurture/scorecard.complete",
    body: { name: "Test Prospect", email: "prospect@example.com", score: 55, primaryDriver: "Autonomy", biggestFear: "Risk" },
  },
  {
    name: "archetype-complete",
    path: "@/app/api/archetype-complete/route",
    event: "nurture/archetype.complete",
    body: {
      name: "Test Prospect",
      email: "prospect@example.com",
      archetype: "builder",
      archetypeName: "The Builder",
      strongFits: ["Home Services", "B2B"],
      weakFits: ["Food"],
    },
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
  for (const cb of scheduled) await cb();
}

beforeEach(() => {
  afterShouldThrow = false;
  scheduled = [];
  sendEvent.mockReset().mockResolvedValue({ ids: ["evt_1"] });
  emailSend.mockReset().mockResolvedValue({ id: "re_1" });
  notifyCrm.mockReset().mockResolvedValue(undefined);
});

describe.each([...MAGNET_ROUTES, ...QUIZ_ROUTES])("$name background work", (route) => {
  const body = "body" in route ? route.body : magnetBody("prospect@example.com");
  const expectedEmails = "body" in route ? 1 : 2;

  it("sends no Inngest event while the handler is still running", async () => {
    const { POST } = await import(route.path);

    const res = await POST(post(body));

    // THE guard: restoring `await inngest.send(...)` fails here.
    expect(sendEvent).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    // Delivery already happened, inside the handler.
    expect(emailSend).toHaveBeenCalledTimes(expectedEmails);
  });

  it("sends the event with the right name and id once the scheduled work runs", async () => {
    const { POST } = await import(route.path);

    await POST(post(body));
    await runScheduled();

    expect(sendEvent).toHaveBeenCalledTimes(1);
    const payload = sendEvent.mock.calls[0]![0] as { name: string; data: Record<string, string> };
    expect(payload.name).toBe(route.event);
    expect(payload.data.downloadId ?? payload.data.submissionId).toBe(ID);
  });

  it("schedules the CRM sync rather than calling it inline", async () => {
    const { POST } = await import(route.path);

    await POST(post(body));
    expect(notifyCrm).not.toHaveBeenCalled();

    await runScheduled();
    expect(notifyCrm).toHaveBeenCalledTimes(1);
  });

  it("still delivers the email when after() throws", async () => {
    afterShouldThrow = true;
    const { POST } = await import(route.path);

    const res = await POST(post(body));

    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalledTimes(expectedEmails);
  });
});

describe("contact background work", () => {
  // No prisma and no Inngest here — the CRM sync is the only background work,
  // which is exactly why it is worth pinning: nothing else would catch it.
  const body = { name: "Test Prospect", email: "prospect@example.com", message: "Hello" };

  it("schedules the CRM sync rather than calling it inline", async () => {
    const { POST } = await import("@/app/api/contact/route");

    const res = await POST(post(body));

    expect(notifyCrm).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalledTimes(2);

    await runScheduled();
    expect(notifyCrm).toHaveBeenCalledTimes(1);
  });

  it("still delivers the emails when after() throws", async () => {
    afterShouldThrow = true;
    const { POST } = await import("@/app/api/contact/route");

    const res = await POST(post(body));

    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalledTimes(2);
  });
});

describe.each(MAGNET_ROUTES)("$name Kelsey skip", ({ path }) => {
  it("never schedules a nurture event for Kelsey's own address", async () => {
    const { POST } = await import(path);

    const res = await POST(post(magnetBody(KELSEY)));
    await runScheduled();

    expect(res.status).toBe(200);
    expect(sendEvent).not.toHaveBeenCalled();
  });
});
