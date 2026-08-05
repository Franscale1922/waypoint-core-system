import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The newsletter sync's consent guarantees.
 *
 * beehiiv is a SEPARATE list with its own unsubscribe link in every issue, and
 * someone who leaves that way is invisible to our SuppressionList. While this
 * sent `reactivate_existing: true`, any anonymous POST to
 * /api/newsletter-subscribe carrying their address put them back on the list,
 * and so did every lead-magnet download. They clicked unsubscribe and started
 * receiving the newsletter again.
 */

const h = vi.hoisted(() => ({ suppressed: vi.fn() }));

vi.mock("@/lib/email-suppression", () => ({
  isEmailSuppressedFailClosed: h.suppressed,
}));

const EMAIL = "prospect@example.com";

function body() {
  const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
  return JSON.parse((call![1] as { body: string }).body);
}

beforeEach(() => {
  process.env.BEEHIIV_API_KEY = "test-key";
  process.env.BEEHIIV_PUBLICATION_ID = "pub_test";
  h.suppressed.mockReset().mockResolvedValue(false);
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => "" }) as never;
});

describe("a beehiiv-side unsubscribe is not undone by our sync", () => {
  it("never asks beehiiv to reactivate an existing subscription", async () => {
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    await subscribeToBeehiiv(EMAIL, "Test Prospect");

    expect(body().reactivate_existing).toBe(false);
  });

  it("still sends the address and first name for a genuinely new subscriber", async () => {
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    const result = await subscribeToBeehiiv(EMAIL, "Test Prospect");

    expect(result).toBe("subscribed");
    expect(body()).toMatchObject({ email: EMAIL, first_name: "Test" });
  });

  it("does not call beehiiv at all for a locally suppressed address", async () => {
    h.suppressed.mockResolvedValue(true);
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    const result = await subscribeToBeehiiv(EMAIL);

    expect(result).toBe("skipped");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("a failed sync is reported, not swallowed", () => {
  it("reports failed on a 5xx, without throwing", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: async () => "boom" }) as never;
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    await expect(subscribeToBeehiiv(EMAIL)).resolves.toBe("failed");
  });

  it("does NOT report failed on a 4xx, which a retry cannot fix", async () => {
    // With reactivate_existing false, an address that already left the list is
    // EXPECTED to be refused. Turning that into "please try again" for the
    // visitor would be both wrong and confusing. It is still logged.
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, text: async () => "already unsubscribed" }) as never;
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    await expect(subscribeToBeehiiv(EMAIL)).resolves.toBe("skipped");
  });

  it("reports failed on a network error, without throwing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNRESET")) as never;
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    // Never rejecting is load bearing: the capture routes schedule this after
    // the response and must not be able to fail a download because of it.
    await expect(subscribeToBeehiiv(EMAIL)).resolves.toBe("failed");
  });

  it("reports skipped, not failed, when credentials are absent", async () => {
    delete process.env.BEEHIIV_API_KEY;
    const { subscribeToBeehiiv } = await import("@/lib/beehiiv");

    await expect(subscribeToBeehiiv(EMAIL)).resolves.toBe("skipped");
  });
});
