import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guards the four lead-magnet routes' nurture trigger.
 *
 * The bug: the block was commented "fire-and-forget, does not block delivery" but did
 * `await inngest.send(...)` directly in front of two Resend sends, so a slow Inngest
 * round-trip delayed the very email the visitor was waiting on.
 *
 * Two properties are asserted, and each maps to a way this has already gone wrong:
 *
 *   1. inngest.send must NOT run during the handler. Reverting to `await inngest.send`
 *      fails this — it is the actual regression guard.
 *   2. A throwing after() must not break delivery. after() throws SYNCHRONOUSLY when the
 *      platform supplies no waitUntil; the first cut of this fix left that call unguarded
 *      upstream of both sends, so a throw would have 500'd the request and sent no email
 *      at all. The old awaited-in-try/catch code could not fail delivery, and that
 *      guarantee has to survive.
 */

let afterShouldThrow = false;
let afterCallbacks: Array<() => unknown> = [];

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => unknown) => {
      if (afterShouldThrow) {
        // Mirrors Next's real E91 "`waitUntil` is not available" synchronous throw.
        throw new Error("`after` was called outside a request scope");
      }
      afterCallbacks.push(cb);
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

vi.mock("@/lib/crm", () => ({ notifyCrm: vi.fn() }));
vi.mock("@/lib/beehiiv", () => ({ subscribeToBeehiiv: vi.fn().mockResolvedValue(undefined) }));

const DOWNLOAD_ID = "dl_test_1";
const record = { id: DOWNLOAD_ID };
vi.mock("@/lib/prisma", () => ({
  default: {
    checklistDownload: { create: vi.fn().mockResolvedValue(record) },
    escapeKitDownload: { create: vi.fn().mockResolvedValue(record) },
    pitchDecoderDownload: { create: vi.fn().mockResolvedValue(record) },
    aiFddReaderDownload: { create: vi.fn().mockResolvedValue(record) },
  },
}));

/** Every route hardcodes this as the skip-my-own-submissions address. */
const KELSEY = "kelsey@waypointfranchise.com";

// buildUnsubscribeUrl (@/lib/nurture-emails) throws without this, which capture-email and
// escape-kit call while building the magnet email. Set it so a missing env var cannot be
// mistaken for the delivery failure these tests are actually looking for.
process.env.UNSUBSCRIBE_SECRET ??= "test-unsubscribe-secret";

const ROUTES = [
  { name: "capture-email", path: "@/app/api/capture-email/route", event: "nurture/checklist.download" },
  { name: "escape-kit", path: "@/app/api/escape-kit/route", event: "nurture/escape-kit.download" },
  { name: "pitch-decoder", path: "@/app/api/pitch-decoder/route", event: "nurture/pitch-decoder.download" },
  { name: "ai-fdd-reader", path: "@/app/api/ai-fdd-reader/route", event: "nurture/ai-fdd-reader.download" },
] as const;

function request(email = "prospect@example.com") {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Prospect", email, articleSlug: "some-article" }),
  });
}

beforeEach(() => {
  afterShouldThrow = false;
  afterCallbacks = [];
  sendEvent.mockReset().mockResolvedValue({ ids: ["evt_1"] });
  emailSend.mockReset().mockResolvedValue({ id: "re_1" });
});

describe.each(ROUTES)("$name nurture trigger", ({ path, event }) => {
  it("does not send the Inngest event while the handler is still running", async () => {
    const { POST } = await import(path);

    const res = await POST(request());

    // THE guard: if someone restores `await inngest.send(...)`, this fails.
    expect(sendEvent).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);
    expect(res.status).toBe(200);
    // Delivery happened during the handler: notify-Kelsey + the magnet itself.
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("sends the event with the download id once the scheduled callback runs", async () => {
    const { POST } = await import(path);

    await POST(request());
    await afterCallbacks[0]!();

    expect(sendEvent).toHaveBeenCalledTimes(1);
    const payload = sendEvent.mock.calls[0]![0] as { name: string; data: { downloadId: string } };
    expect(payload.name).toBe(event);
    expect(payload.data.downloadId).toBe(DOWNLOAD_ID);
  });

  it("still delivers the magnet when after() throws", async () => {
    afterShouldThrow = true;
    const { POST } = await import(path);

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("schedules nothing for Kelsey's own address", async () => {
    const { POST } = await import(path);

    const res = await POST(request(KELSEY));

    expect(res.status).toBe(200);
    expect(afterCallbacks).toHaveLength(0);
    expect(sendEvent).not.toHaveBeenCalled();
  });
});
