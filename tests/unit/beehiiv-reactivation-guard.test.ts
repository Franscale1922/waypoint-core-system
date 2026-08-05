import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Guards the flag that makes the beehiiv opt-out webhook trustworthy.
 *
 * subscribeToBeehiiv used to send `reactivate_existing: true`, which destroyed
 * real opt-outs two ways. Directly: somebody who unsubscribed and later
 * downloaded a guide was put back on the list by that download, because the
 * suppression check in front of it can only see opt-outs OUR database already
 * knows about. Indirectly, and worse once the webhook existed: the reactivation
 * flipped the address back to `active`, so the arriving opt-out webhook asked
 * beehiiv, was told the address was active, concluded its own payload was stale,
 * and dropped the opt-out permanently.
 *
 * The webhook's "beehiiv says active, so refuse" rule is only sound while this
 * stays false. If it ever flips back, that rule starts eating genuine opt-outs
 * instead of catching forged ones.
 */

const h = vi.hoisted(() => ({ suppressed: vi.fn(), fetch: vi.fn() }));

vi.mock("@/lib/email-suppression", () => ({
  isEmailSuppressedFailClosed: h.suppressed,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BEEHIIV_API_KEY = "test-key";
  process.env.BEEHIIV_PUBLICATION_ID = "pub_test";
  h.suppressed.mockResolvedValue(false);
  h.fetch.mockResolvedValue({ ok: true, text: async () => "", json: async () => ({}) });
  vi.stubGlobal("fetch", h.fetch);
});

async function subscribe(email: string) {
  const { subscribeToBeehiiv } = await import("@/lib/beehiiv");
  return subscribeToBeehiiv(email, "Test Person");
}

function sentBody() {
  return JSON.parse(String(h.fetch.mock.calls[0][1].body));
}

describe("subscribeToBeehiiv never resurrects a departed subscriber", () => {
  it("sends reactivate_existing: false", async () => {
    await subscribe("someone@example.com");

    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody().reactivate_existing).toBe(false);
  });

  it("still subscribes an address our own records have no opt-out for", async () => {
    await subscribe("fresh@example.com");

    expect(sentBody().email).toBe("fresh@example.com");
  });

  it("does not call beehiiv at all for an address we already know opted out", async () => {
    h.suppressed.mockResolvedValue(true);

    await subscribe("gone@example.com");

    expect(h.fetch).not.toHaveBeenCalled();
  });
});
