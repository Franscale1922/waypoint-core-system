import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the NextAuth module before importing the subject under test.
const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const { withAdmin } = await import("@/lib/with-admin");

const OWNER = "kelsey@waypointfranchise.com";

describe("withAdmin", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => {
    authMock.mockReset();
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  const req = () => new Request("https://www.waypointfranchise.com/api/leads", { method: "POST" });

  it("401s with no session, and the handler never runs", async () => {
    authMock.mockResolvedValue(null);
    const handler = vi.fn();
    const res = await withAdmin(handler)(req());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("401s when the session has no email", async () => {
    authMock.mockResolvedValue({ user: { name: "No Email" } });
    const handler = vi.fn();
    const res = await withAdmin(handler)(req());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("403s an authenticated but non-allowlisted account (the 'any Google account' hole)", async () => {
    authMock.mockResolvedValue({ user: { email: "stranger@gmail.com" } });
    const handler = vi.fn();
    const res = await withAdmin(handler)(req());
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("fails CLOSED when auth() throws — never treats an error as allowed", async () => {
    authMock.mockRejectedValue(new Error("auth subsystem down"));
    const handler = vi.fn();
    const res = await withAdmin(handler)(req());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler for the owner and passes a session with a guaranteed email", async () => {
    authMock.mockResolvedValue({ user: { email: OWNER, name: "Kelsey" } });
    const handler = vi.fn(async (_req: Request, session: { user: { email: string } }) =>
      Response.json({ actor: session.user.email }),
    );
    const res = await withAdmin(handler)(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ actor: OWNER });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("passes through extra route context (dynamic segments like /api/leads/[id])", async () => {
    authMock.mockResolvedValue({ user: { email: OWNER } });
    const handler = vi.fn(
      async (_req: Request, _s: unknown, ctx: { params: Promise<{ id: string }> }) =>
        Response.json({ id: (await ctx.params).id }),
    );
    const res = await withAdmin(handler)(req(), { params: Promise.resolve({ id: "lead-123" }) });
    expect(await res.json()).toEqual({ id: "lead-123" });
  });

  it("honors ADMIN_EMAILS for a non-owner teammate", async () => {
    process.env.ADMIN_EMAILS = "teammate@example.com";
    authMock.mockResolvedValue({ user: { email: "teammate@example.com" } });
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const res = await withAdmin(handler)(req());
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });
});
