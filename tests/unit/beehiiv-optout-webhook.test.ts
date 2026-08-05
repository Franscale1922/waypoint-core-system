import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guards the beehiiv opt-out webhook.
 *
 * The bug this route closes is that beehiiv held unsubscribe state nothing ever
 * read, so a person who left the newsletter stayed mailable by every nurture
 * sequence and by cold outreach. The tests that matter most here are not the
 * happy path but the three refusals: a payload beehiiv itself contradicts, a
 * verification that could not be completed, and an address already suppressed
 * for a different reason. A write from this route cannot be undone by the admin
 * resubscribe tool, so each of those is a one-way mistake.
 */

const h = vi.hoisted(() => {
  const model = () => ({
    findFirst: vi.fn(),
    upsert: vi.fn(),
  });
  return { db: { suppressionList: model() }, fetch: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ default: h.db }));

const SECRET = "test-beehiiv-secret";
const ENDPOINT = "https://test.waypointfranchise.com/api/webhooks/beehiiv";

function post(body: unknown, secret: string | null = SECRET) {
  const url = secret === null ? ENDPOINT : `${ENDPOINT}?secret=${secret}`;
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** beehiiv's list-subscriptions reply, as the verification step reads it. */
function beehiivSays(status: string | null) {
  return {
    ok: true,
    json: async () => ({ data: status === null ? [] : [{ status }] }),
    text: async () => "",
  };
}

async function callRoute(req: Request) {
  const { POST } = await import("@/app/api/webhooks/beehiiv/route");
  return POST(req);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BEEHIIV_WEBHOOK_SECRET = SECRET;
  process.env.BEEHIIV_API_KEY = "test-key";
  process.env.BEEHIIV_PUBLICATION_ID = "pub_test";
  h.fetch.mockResolvedValue(beehiivSays("inactive"));
  vi.stubGlobal("fetch", h.fetch);
});

describe("beehiiv opt-out webhook: authentication", () => {
  it("rejects a request with no secret, and writes nothing", async () => {
    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@b.com" } }, null));
    expect(res.status).toBe(401);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret, and writes nothing", async () => {
    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@b.com" } }, "guessed"));
    expect(res.status).toBe(403);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("fails closed when the secret env var is unset, so a missing config cannot open the route", async () => {
    delete process.env.BEEHIIV_WEBHOOK_SECRET;
    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@b.com" } }));
    expect(res.status).toBe(500);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: which events count", () => {
  it("suppresses on subscription.deleted", async () => {
    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "gone@example.com" } }));
    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("suppresses on newsletter_list_subscription.unsubscribed", async () => {
    const res = await callRoute(
      post({ event_type: "newsletter_list_subscription.unsubscribed", data: { email: "left@example.com" } })
    );
    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("ignores subscription.paused, because a pause is not a permanent opt-out", async () => {
    const res = await callRoute(post({ event_type: "subscription.paused", data: { email: "later@example.com" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ action: "ignored:subscription.paused" });
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("ignores unrelated events such as subscription.created", async () => {
    const res = await callRoute(post({ event_type: "subscription.created", data: { email: "new@example.com" } }));
    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: what gets written", () => {
  it("writes the distinct reason the admin resubscribe tool refuses to clear", async () => {
    await callRoute(post({ event_type: "subscription.deleted", data: { email: "gone@example.com" } }));

    const arg = h.db.suppressionList.upsert.mock.calls[0][0];
    expect(arg.create.reason).toBe("beehiiv-unsubscribe");
    // unsuppressEmail clears only reason === "unsubscribed". Writing that value
    // here would silently make a beehiiv opt-out admin-reversible.
    expect(arg.create.reason).not.toBe("unsubscribed");
  });

  it("never overwrites an existing row, so a bounce is not downgraded to a preference", async () => {
    await callRoute(post({ event_type: "subscription.deleted", data: { email: "gone@example.com" } }));

    const arg = h.db.suppressionList.upsert.mock.calls[0][0];
    expect(arg.update).toEqual({});
  });

  it("normalizes the address before writing, so casing cannot create a second row", async () => {
    await callRoute(post({ event_type: "subscription.deleted", data: { email: "  MiXeD@Example.COM " } }));

    const arg = h.db.suppressionList.upsert.mock.calls[0][0];
    expect(arg.where.email).toBe("mixed@example.com");
    expect(arg.create.email).toBe("mixed@example.com");
  });

  it("rejects an opt-out event carrying no address", async () => {
    const res = await callRoute(post({ event_type: "subscription.deleted", data: {} }));
    expect(res.status).toBe(400);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: verification against beehiiv itself", () => {
  it("refuses a payload beehiiv contradicts, since that claim is stale or forged", async () => {
    h.fetch.mockResolvedValue(beehiivSays("active"));

    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "still@example.com" } }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ action: "ignored:still-active" });
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("treats an absent subscription as a genuine opt-out, because a deleted one is gone", async () => {
    h.fetch.mockResolvedValue(beehiivSays(null));

    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "gone@example.com" } }));

    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("asks a retry rather than writing when verification errors, so a leaked secret cannot force a write", async () => {
    h.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => "boom", json: async () => ({}) });

    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@example.com" } }));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("asks a retry when the verification request throws, including on timeout", async () => {
    h.fetch.mockRejectedValue(new Error("timed out"));

    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@example.com" } }));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("honours the opt-out unverified when credentials are absent, since retrying can never fix that", async () => {
    delete process.env.BEEHIIV_API_KEY;

    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@example.com" } }));

    expect(res.status).toBe(200);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("queries beehiiv for the address it was asked about", async () => {
    await callRoute(post({ event_type: "subscription.deleted", data: { email: "Query@Example.com" } }));

    const url = String(h.fetch.mock.calls[0][0]);
    expect(url).toContain("/publications/pub_test/subscriptions");
    expect(url).toContain(encodeURIComponent("query@example.com"));
  });
});

describe("beehiiv opt-out webhook: failure handling", () => {
  it("returns 500 rather than throwing when the database write fails", async () => {
    h.db.suppressionList.upsert.mockRejectedValue(new Error("neon is down"));

    const res = await callRoute(post({ event_type: "subscription.deleted", data: { email: "a@example.com" } }));

    expect(res.status).toBe(500);
  });

  it("returns 500 on a malformed body rather than crashing the handler", async () => {
    const req = new Request(`${ENDPOINT}?secret=${SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await callRoute(req);

    expect(res.status).toBe(500);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});
