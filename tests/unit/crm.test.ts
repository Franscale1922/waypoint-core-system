import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";
import { notifyCrm } from "@/lib/crm";

/**
 * notifyCrm's contract, which every call site depends on:
 *   - it resolves when the webhook call settles, so afterResponse() has
 *     something to hold the invocation open for;
 *   - it NEVER rejects, on any path. A rejection would surface in the caller's
 *     afterResponse catch as a mystery, and before this was scheduled work it
 *     would have been an unhandled rejection.
 *
 * It went from `void` (bare unawaited fetch) to `Promise<void>` and was
 * rewritten from a then/catch chain to async/await with no direct coverage.
 */

const KELSEY = "kelsey@waypointfranchise.com";
const WEBHOOK = "https://crm.test/hook?key=abc";
const payload = { name: "Test Prospect", email: "prospect@example.com", source: "Contact Form" };

let fetchSpy: MockInstance<typeof globalThis.fetch>;
let errors: string[];

beforeEach(() => {
  errors = [];
  process.env.CRM_WEBHOOK_URL = WEBHOOK;
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
  vi.spyOn(console, "error").mockImplementation((msg: unknown) => {
    errors.push(String(msg));
  });
});

afterEach(() => {
  delete process.env.CRM_WEBHOOK_URL;
  vi.restoreAllMocks();
});

describe("notifyCrm", () => {
  it("posts the payload to the webhook and resolves", async () => {
    await expect(notifyCrm(payload)).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ email: payload.email });
  });

  it("no-ops when CRM_WEBHOOK_URL is unset", async () => {
    delete process.env.CRM_WEBHOOK_URL;

    await expect(notifyCrm(payload)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never sends Kelsey's own test submissions", async () => {
    await expect(notifyCrm({ ...payload, email: KELSEY.toUpperCase() })).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves rather than rejecting when the fetch fails", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));

    await expect(notifyCrm(payload)).resolves.toBeUndefined();
    expect(errors.some((e) => e.includes("[crm] Webhook fetch failed:"))).toBe(true);
  });

  it("logs and resolves on a non-2xx response", async () => {
    fetchSpy.mockResolvedValue(new Response("nope", { status: 500 }));

    await expect(notifyCrm(payload)).resolves.toBeUndefined();
    expect(errors.some((e) => e.includes("[crm] Webhook responded 500"))).toBe(true);
  });

  it("resolves even when reading the error body fails", async () => {
    // The old then/catch version had no catch around res.text(), so this was an
    // unhandled rejection.
    const res = new Response("x", { status: 502 });
    vi.spyOn(res, "text").mockRejectedValue(new Error("body read failed"));
    fetchSpy.mockResolvedValue(res);

    await expect(notifyCrm(payload)).resolves.toBeUndefined();
  });
});
