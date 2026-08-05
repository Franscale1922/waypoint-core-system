import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guards the beehiiv opt-out webhook.
 *
 * The bug this route closes is that beehiiv held unsubscribe state nothing ever
 * read, so a person who left the newsletter stayed mailable by every nurture
 * sequence and by cold outreach. The tests that matter most are not the happy
 * path but the refusals and the one deliberate non-refusal: a write here cannot
 * be undone by the admin resubscribe tool, and a wrongly SKIPPED write is an
 * opt-out lost for good.
 */

const h = vi.hoisted(() => {
  const model = () => ({ findFirst: vi.fn(), upsert: vi.fn() });
  return { db: { suppressionList: model() }, fetch: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ default: h.db }));

const SECRET = "test-beehiiv-secret";
const ENDPOINT = "https://test.waypointfranchise.com/api/webhooks/beehiiv";

/** Unix seconds. Every opt-out event below fires at this instant. */
const EVENT_AT = 1_700_000_000;

/** An opt-out payload shaped like beehiiv's, timestamp included. */
function optOut(event_type: string, email?: string, at: number | null = EVENT_AT) {
  return {
    event_type,
    ...(at === null ? {} : { event_timestamp: at }),
    data: email === undefined ? {} : { email },
  };
}

/** beehiiv's list-subscriptions reply, as the verification step reads it. */
function beehiivSays(status: string | null, created = EVENT_AT - 3600) {
  return {
    ok: true,
    json: async () => ({ data: status === null ? [] : [{ status, created }] }),
    text: async () => "",
  };
}

/** A raw reply body, for the malformed-response cases. */
function beehiivRaw(body: unknown) {
  return { ok: true, json: async () => body, text: async () => "" };
}

function post(body: unknown, secret: string | null = SECRET) {
  const url = secret === null ? ENDPOINT : `${ENDPOINT}?secret=${secret}`;
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callRoute(req: Request) {
  const { POST } = await import("@/app/api/webhooks/beehiiv/route");
  return POST(req);
}

/** The row the handler tried to create, or undefined if it wrote nothing. */
function written() {
  return h.db.suppressionList.upsert.mock.calls[0]?.[0];
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
    const res = await callRoute(post(optOut("subscription.deleted", "a@b.com"), null));
    expect(res.status).toBe(401);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret, and writes nothing", async () => {
    const res = await callRoute(post(optOut("subscription.deleted", "a@b.com"), "guessed"));
    expect(res.status).toBe(403);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("fails closed when the secret env var is unset, so a missing config cannot open the route", async () => {
    delete process.env.BEEHIIV_WEBHOOK_SECRET;
    const res = await callRoute(post(optOut("subscription.deleted", "a@b.com")));
    expect(res.status).toBe(500);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: which events count", () => {
  it("suppresses on subscription.deleted", async () => {
    const res = await callRoute(post(optOut("subscription.deleted", "gone@example.com")));
    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("suppresses on newsletter_list_subscription.unsubscribed", async () => {
    const res = await callRoute(post(optOut("newsletter_list_subscription.unsubscribed", "left@example.com")));
    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("ignores subscription.paused, because a pause is not a permanent opt-out", async () => {
    const res = await callRoute(post(optOut("subscription.paused", "later@example.com")));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ action: "ignored:subscription.paused" });
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("ignores unrelated events such as subscription.created", async () => {
    const res = await callRoute(post(optOut("subscription.created", "new@example.com")));
    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: what gets written", () => {
  it("records a recipient-initiated withdrawal distinctly from a deletion", async () => {
    await callRoute(post(optOut("newsletter_list_subscription.unsubscribed", "left@example.com")));
    expect(written().create.reason).toBe("beehiiv-unsubscribe");

    h.db.suppressionList.upsert.mockClear();

    await callRoute(post(optOut("subscription.deleted", "gone@example.com")));
    expect(written().create.reason).toBe("beehiiv-deleted");
  });

  it("never writes the one reason the admin resubscribe tool would clear", async () => {
    for (const event of ["newsletter_list_subscription.unsubscribed", "subscription.deleted"]) {
      h.db.suppressionList.upsert.mockClear();
      await callRoute(post(optOut(event, "x@example.com")));
      // unsuppressEmail clears only reason === "unsubscribed". Writing that here
      // would silently make a beehiiv opt-out admin-reversible.
      expect(written().create.reason).not.toBe("unsubscribed");
    }
  });

  it("never overwrites an existing row, so a bounce is not downgraded to a preference", async () => {
    await callRoute(post(optOut("subscription.deleted", "gone@example.com")));
    expect(written().update).toEqual({});
  });

  it("normalizes the address before writing, so casing cannot create a second row", async () => {
    await callRoute(post(optOut("subscription.deleted", "  MiXeD@Example.COM ")));
    expect(written().where.email).toBe("mixed@example.com");
    expect(written().create.email).toBe("mixed@example.com");
  });

  it("rejects an opt-out event carrying no address", async () => {
    const res = await callRoute(post(optOut("subscription.deleted", undefined)));
    expect(res.status).toBe(400);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: verification against beehiiv itself", () => {
  it("refuses when beehiiv reports a subscription that already existed before the event", async () => {
    h.fetch.mockResolvedValue(beehiivSays("active", EVENT_AT - 86_400));

    const res = await callRoute(post(optOut("subscription.deleted", "still@example.com")));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ action: "ignored:still-active" });
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("SUPPRESSES when the active subscription was created after the opt-out fired", async () => {
    // The race that used to lose real opt-outs. A departed subscriber whose
    // beehiiv record was deleted gets re-added by a form submission landing
    // before this webhook, and the address reads back as active. A subscription
    // younger than the event cannot be evidence that the event is stale.
    h.fetch.mockResolvedValue(beehiivSays("active", EVENT_AT + 30));

    const res = await callRoute(post(optOut("subscription.deleted", "resurrected@example.com")));

    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("refuses an active-subscription event with no timestamp, so omitting it is not a bypass", async () => {
    h.fetch.mockResolvedValue(beehiivSays("active"));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com", null)));

    expect(res.status).toBe(400);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("treats an absent subscription as a genuine opt-out, because a deleted one is gone", async () => {
    h.fetch.mockResolvedValue(beehiivSays(null));

    const res = await callRoute(post(optOut("subscription.deleted", "gone@example.com")));

    expect(res.status).toBe(200);
    expect(h.db.suppressionList.upsert).toHaveBeenCalledTimes(1);
  });

  it("treats every non-active documented status as opted out", async () => {
    for (const status of ["inactive", "paused", "pending", "invalid", "validating", "needs_attention"]) {
      h.db.suppressionList.upsert.mockClear();
      h.fetch.mockResolvedValue(beehiivSays(status));

      const res = await callRoute(post(optOut("subscription.deleted", "x@example.com")));

      expect(res.status, status).toBe(200);
      expect(h.db.suppressionList.upsert, status).toHaveBeenCalledTimes(1);
    }
  });

  it("asks a retry rather than writing when verification errors, so a leaked secret cannot force a write", async () => {
    h.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => "boom", json: async () => ({}) });

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("asks a retry when the verification request throws, including on timeout", async () => {
    h.fetch.mockRejectedValue(new Error("timed out"));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("refuses to write unverified when the API key is absent, so unsetting it cannot disable the check", async () => {
    delete process.env.BEEHIIV_API_KEY;

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("refuses to write unverified when the publication id is absent", async () => {
    delete process.env.BEEHIIV_PUBLICATION_ID;

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("queries beehiiv for the address it was asked about", async () => {
    await callRoute(post(optOut("subscription.deleted", "Query@Example.com")));

    const url = String(h.fetch.mock.calls[0][0]);
    expect(url).toContain("/publications/pub_test/subscriptions");
    expect(url).toContain(encodeURIComponent("query@example.com"));
  });
});

describe("beehiiv opt-out webhook: a degraded API is not consent", () => {
  it("does not read a reply with no data array as an opt-out", async () => {
    // Asserted on the log line, not just the status. Without the explicit
    // Array.isArray guard this case still returns 503, because reading .length
    // off undefined throws into the same catch. That is the right answer for the
    // wrong reason, and it would keep passing if the guard were deleted, so the
    // branch is pinned directly.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    h.fetch.mockResolvedValue(beehiivRaw({}));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
    expect(logged.mock.calls.flat().join(" ")).toContain("no data array");
    logged.mockRestore();
  });

  it("does not read a subscription with no status as an opt-out", async () => {
    h.fetch.mockResolvedValue(beehiivRaw({ data: [{}] }));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("does not read an unrecognised status as an opt-out", async () => {
    h.fetch.mockResolvedValue(beehiivRaw({ data: [{ status: "something_new" }] }));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });

  it("asks a retry when an active subscription carries no usable created time", async () => {
    h.fetch.mockResolvedValue(beehiivRaw({ data: [{ status: "active" }] }));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

    expect(res.status).toBe(503);
    expect(h.db.suppressionList.upsert).not.toHaveBeenCalled();
  });
});

describe("beehiiv opt-out webhook: failure handling", () => {
  it("returns 500 rather than throwing when the database write fails", async () => {
    h.db.suppressionList.upsert.mockRejectedValue(new Error("neon is down"));

    const res = await callRoute(post(optOut("subscription.deleted", "a@example.com")));

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
