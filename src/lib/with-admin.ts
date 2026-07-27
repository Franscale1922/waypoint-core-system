/**
 * `withAdmin`: the authentication gate for mutating API routes.
 *
 * WHY A WRAPPER AND NOT A `requireAdmin()` HELPER
 * -----------------------------------------------
 * Two obvious alternatives both fail open in this codebase:
 *
 *   1. `const session = await requireAdmin();` returning `Session | NextResponse`. TypeScript
 *      cannot force a caller to consume a return value. `await requireAdmin();` on its own line
 *      compiles cleanly and the handler then runs unauthenticated. A gate you can forget is not
 *      a gate.
 *   2. Throwing on failure is worse here. Every mutating route in this app wraps its body in
 *      `try { … } catch (err) { return 500, err.message }`. A thrown auth error would be swallowed
 *      into a 500 that leaks the message and looks deliberately handled.
 *
 * With this wrapper the session exists ONLY as a parameter of the inner handler, so the handler
 * body physically cannot execute without an authenticated, allowlisted admin. It never throws.
 *
 * Usage:
 *   export const POST = withAdmin(async (req, session) => { … session.user.email … });
 *   export const DELETE = withAdmin(async (req, session, { params }) => { … });
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAllowedAdmin } from "@/lib/admin-allowlist";

/** A session narrowed so `email` is guaranteed present: the value routes record as `actor`. */
export type AdminSession = {
  user: {
    email: string;
    name?: string | null;
    image?: string | null;
  };
};

type AdminHandler<Ctx extends unknown[]> = (
  req: Request,
  session: AdminSession,
  ...ctx: Ctx
) => Response | Promise<Response>;

export function withAdmin<Ctx extends unknown[]>(handler: AdminHandler<Ctx>) {
  return async function guarded(req: Request, ...ctx: Ctx): Promise<Response> {
    let email: string | null | undefined;
    let user: AdminSession["user"] | undefined;

    try {
      const session = await auth();
      email = session?.user?.email;
      if (session?.user && email) {
        user = { email, name: session.user.name, image: session.user.image };
      }
    } catch (err) {
      // Fail closed: an auth subsystem error must never be treated as "allowed".
      console.error("withAdmin: auth() failed; denying request.", err);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user || !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAllowedAdmin(email)) {
      // Authenticated as a real Google account, but not one that is permitted here.
      console.warn(`withAdmin: rejected non-allowlisted admin attempt for ${email}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, { user }, ...ctx);
  };
}
