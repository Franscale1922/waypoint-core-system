import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for the afterResponse() helper.
 *
 * Its whole job is to never let background work damage a response that has
 * already been produced, on both axes: after() throwing synchronously at
 * schedule time, and the work itself rejecting later.
 */

let afterShouldThrow = false;
let scheduled: Array<() => unknown> = [];

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => unknown) => {
      if (afterShouldThrow) {
        // Mirrors Next's real synchronous "`waitUntil` is not available" throw.
        throw new Error("`after` was called outside a request scope");
      }
      scheduled.push(cb);
    },
  };
});

const { afterResponse } = await import("@/lib/after-response");

let errors: string[] = [];

beforeEach(() => {
  afterShouldThrow = false;
  scheduled = [];
  errors = [];
  vi.spyOn(console, "error").mockImplementation((msg: unknown) => {
    errors.push(String(msg));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("afterResponse", () => {
  it("schedules the work instead of running it inline", () => {
    const work = vi.fn().mockResolvedValue(undefined);

    afterResponse("[test] thing", work);

    expect(work).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
  });

  it("runs the work when the scheduled callback fires", async () => {
    const work = vi.fn().mockResolvedValue("done");

    afterResponse("[test] thing", work);
    await scheduled[0]!();

    expect(work).toHaveBeenCalledTimes(1);
  });

  it("swallows and logs a rejecting work function", async () => {
    const work = vi.fn().mockRejectedValue(new Error("upstream exploded"));

    afterResponse("[test] thing", work);

    // Must not reject: by now the response is already out, so there is no
    // client left to surface this to.
    await expect(scheduled[0]!()).resolves.not.toThrow();
    expect(errors.some((e) => e.includes("[test] thing failed:"))).toBe(true);
  });

  it("swallows and logs a synchronous throw from after() itself", () => {
    afterShouldThrow = true;
    const work = vi.fn().mockResolvedValue(undefined);

    // THE guard: this is what protects the response. If afterResponse ever
    // rethrows here, a route's outer catch turns it into a 500.
    expect(() => afterResponse("[test] thing", work)).not.toThrow();
    expect(work).not.toHaveBeenCalled();
    expect(errors.some((e) => e.includes("[test] thing could not be scheduled:"))).toBe(true);
  });

  it("does not run the work when scheduling failed", () => {
    afterShouldThrow = true;
    const work = vi.fn().mockResolvedValue(undefined);

    afterResponse("[test] thing", work);

    expect(scheduled).toHaveLength(0);
    expect(work).not.toHaveBeenCalled();
  });
});
