import { describe, it, expect, vi, beforeEach } from "vitest";
import { CHECKLIST_SLUGS, resolveChecklistSlug } from "@/lib/checklists";

describe("resolveChecklistSlug", () => {
  it("passes through every known slug unchanged", () => {
    for (const slug of CHECKLIST_SLUGS) {
      expect(resolveChecklistSlug(slug)).toBe(slug);
    }
  });

  it("falls back to universal for an unknown value", () => {
    // The bug: previously `checklistSlug || "universal"` is a FALSY-only
    // fallback, so a typo'd non-empty string like "pet-services" passed
    // through untouched instead of resolving here.
    expect(resolveChecklistSlug("pet-services")).toBe("universal");
    expect(resolveChecklistSlug("Universal")).toBe("universal"); // case-sensitive
  });

  it("falls back to universal for empty, missing, or non-string input", () => {
    expect(resolveChecklistSlug("")).toBe("universal");
    expect(resolveChecklistSlug(undefined)).toBe("universal");
    expect(resolveChecklistSlug(null)).toBe("universal");
    expect(resolveChecklistSlug(42)).toBe("universal");
  });
});

// ─── capture-email route: the slug is resolved ONCE and reused everywhere ────

const h = vi.hoisted(() => ({
  db: { checklistDownload: { create: vi.fn() } },
  sendEvent: vi.fn(),
  emailSend: vi.fn(),
  notifyCrm: vi.fn(),
  subscribeToBeehiiv: vi.fn(),
  scheduled: [] as Array<() => unknown>,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => unknown) => {
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

process.env.UNSUBSCRIBE_SECRET ??= "test-unsubscribe-secret";

function post(body: unknown) {
  return new Request("http://localhost/api/capture-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runScheduled() {
  for (const cb of h.scheduled) await cb();
  h.scheduled.length = 0;
}

beforeEach(() => {
  h.scheduled.length = 0;
  h.db.checklistDownload.create.mockReset().mockResolvedValue({ id: "rec_test_1" });
  h.sendEvent.mockReset().mockResolvedValue({ ids: ["evt_1"] });
  h.emailSend.mockReset().mockResolvedValue({ id: "re_1" });
  h.notifyCrm.mockReset().mockResolvedValue(undefined);
  h.subscribeToBeehiiv.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/capture-email checklist resolution", () => {
  it("persists the RESOLVED slug, not a raw unknown value, and delivers the universal checklist", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    const res = await POST(
      post({ email: "prospect@example.com", checklistSlug: "pet-services", articleSlug: "some-article" }),
    );
    await runScheduled();

    expect(res.status).toBe(200);
    // The bug: this used to persist the literal string "pet-services", a
    // value CHECKLIST_FILES/CHECKLIST_LABELS have no entry for and the code
    // will never honour again.
    expect(h.db.checklistDownload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checklistType: "universal" }) }),
    );
    // The subscriber email still reports the universal label, matching what
    // was actually delivered.
    expect(h.emailSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("Universal Franchise Readiness") }),
    );
  });

  it("persists a known slug unchanged", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(
      post({ email: "prospect2@example.com", checklistSlug: "home-services", articleSlug: "some-article" }),
    );
    await runScheduled();

    expect(h.db.checklistDownload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checklistType: "home-services" }) }),
    );
  });

  it("resolves a missing slug to universal, same as before", async () => {
    const { POST } = await import("@/app/api/capture-email/route");

    await POST(post({ email: "prospect3@example.com", articleSlug: "some-article" }));
    await runScheduled();

    expect(h.db.checklistDownload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checklistType: "universal" }) }),
    );
  });
});
