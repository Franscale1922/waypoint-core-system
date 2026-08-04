import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";

/**
 * Guards the opt-out endpoints.
 *
 * Two defects are pinned here. Every one of these routes used to mutate on GET,
 * so anything that follows a link without a human deciding to — a scanner, a
 * link-safety rewriter, a client prefetching a preview — silently opted people
 * out. And the mutation set the flag on one row, so the next form submission
 * wrote a fresh row with it cleared and mail resumed.
 */

const h = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  });
  return {
    db: {
      checklistDownload: model(),
      escapeKitDownload: model(),
      pitchDecoderDownload: model(),
      aiFddReaderDownload: model(),
      scorecardSubmission: model(),
      archetypeSubmission: model(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ default: h.db }));

const SECRET = "test-unsubscribe-secret";
process.env.UNSUBSCRIBE_SECRET = SECRET;

const ID = "rec_test_1";
const EMAIL = "prospect@example.com";

function tokenFor(id: string): string {
  return crypto.createHmac("sha256", SECRET).update(id).digest("hex");
}

function req(method: "GET" | "POST", id: string, token: string) {
  return new NextRequest(`https://test.waypointfranchise.com/api/unsubscribe?id=${id}&token=${token}`, { method });
}

/** Every list route, so a new one cannot be added without this contract. */
const ROUTES = [
  { name: "unsubscribe", path: "@/app/api/unsubscribe/route", model: "checklistDownload" },
  { name: "escape-kit-unsubscribe", path: "@/app/api/escape-kit-unsubscribe/route", model: "escapeKitDownload" },
  { name: "pitch-decoder-unsubscribe", path: "@/app/api/pitch-decoder-unsubscribe/route", model: "pitchDecoderDownload" },
  { name: "ai-fdd-reader-unsubscribe", path: "@/app/api/ai-fdd-reader-unsubscribe/route", model: "aiFddReaderDownload" },
  { name: "scorecard-unsubscribe", path: "@/app/api/scorecard-unsubscribe/route", model: "scorecardSubmission" },
  { name: "archetype-unsubscribe", path: "@/app/api/archetype-unsubscribe/route", model: "archetypeSubmission" },
] as const;

beforeEach(() => {
  for (const m of Object.values(h.db)) {
    m.findUnique.mockReset().mockResolvedValue({ email: EMAIL });
    m.updateMany.mockReset().mockResolvedValue({ count: 1 });
  }
});

describe.each(ROUTES)("$name", (route) => {
  it("does not unsubscribe anyone on GET", async () => {
    const { GET } = await import(route.path);

    const res = await GET(req("GET", ID, tokenFor(ID)));

    expect(res.status).toBe(200);
    for (const m of Object.values(h.db)) expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("offers a POST form on GET so the one-click header is honest", async () => {
    const { GET } = await import(route.path);

    const body = await (await GET(req("GET", ID, tokenFor(ID)))).text();

    expect(body).toContain('method="POST"');
  });

  it("unsubscribes on POST", async () => {
    const { POST } = await import(route.path);

    const res = await POST(req("POST", ID, tokenFor(ID)));

    expect(res.status).toBe(200);
    // Across EVERY list, not just the one whose link was clicked.
    for (const m of Object.values(h.db)) {
      expect(m.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ unsubscribed: true }) })
      );
    }
  });

  it("looks the id up in its own list's table", async () => {
    // The Escape Kit link used to resolve against the checklist table, where its
    // id could not exist, so the click did nothing at all.
    const { POST } = await import(route.path);

    await POST(req("POST", ID, tokenFor(ID)));

    expect(h.db[route.model].findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ID } })
    );
  });

  it("rejects a forged token without touching anything", async () => {
    const { POST } = await import(route.path);

    const res = await POST(req("POST", ID, "deadbeef"));

    expect(res.status).toBe(400);
    for (const m of Object.values(h.db)) expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("reports success for a record it cannot find", async () => {
    // The clicker wants to stop receiving mail. "No record of you" is that
    // outcome already achieved, not an error worth a support email.
    h.db[route.model].findUnique.mockResolvedValue(null);
    const { POST } = await import(route.path);

    const res = await POST(req("POST", ID, tokenFor(ID)));

    expect(res.status).toBe(200);
  });
});
