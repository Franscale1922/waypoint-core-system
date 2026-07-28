/**
 * Server-side auth gate for an admin PAGE.
 *
 * WHY PAGES NEED THIS AT ALL
 * --------------------------
 * `src/middleware.ts` says outright that it is "DEFENSE IN DEPTH, not the primary gate", because a
 * subtlety in one matcher pattern once left `POST /api/leads` and `DELETE /api/leads?status=ALL`
 * publicly callable. API routes got a primary gate out of that (`withAdmin`), and
 * `tests/auth/route-coverage.test.ts` fails when a mutating route ships without one.
 *
 * Pages got neither. `src/app/admin/layout.tsx` deliberately does not enforce (it renders children
 * for a signed-out visitor so `/admin/login` is not wrapped in a redirect loop), and the coverage
 * test only walks `route.ts`, so a `page.tsx` is invisible to it. Middleware was therefore the ONLY
 * thing standing in front of the match worksheet, which renders every frozen score, confidence,
 * flag, the raw `detail` JSON and candidate PII.
 *
 * Calling this at the top of a page closes that, using the same allowlist as `withAdmin`.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedAdmin } from "@/lib/admin-allowlist";

export type AdminPageSession = { user: { email: string; name?: string | null } };

export async function requireAdminPage(): Promise<AdminPageSession> {
  let email: string | null | undefined;
  let name: string | null | undefined;

  try {
    const session = await auth();
    email = session?.user?.email;
    name = session?.user?.name;
  } catch {
    // Fail closed: an auth subsystem error is never "allowed".
    redirect("/admin/login?error=AuthError");
  }

  if (!email) redirect("/admin/login");
  if (!isAllowedAdmin(email)) redirect("/admin/login?error=AccessDenied");

  return { user: { email, name } };
}
