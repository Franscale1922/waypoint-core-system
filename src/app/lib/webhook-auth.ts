/**
 * Verifies a Bearer token in the Authorization header.
 * Used by webhook routes — they can't use session auth because external
 * services can't hold a browser session.
 *
 * Usage:
 *   const authError = verifyBearer(req, process.env.MY_WEBHOOK_SECRET);
 *   if (authError) return authError;
 */
import { NextResponse } from "next/server";

export function verifyBearer(
  req: Request,
  secret: string | undefined
): NextResponse | null {
  if (!secret) {
    console.error("[webhook-auth] FATAL: Webhook secret env var is not set.");
    return NextResponse.json(
      { error: "Server misconfiguration: webhook secret not set" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7); // Strip "Bearer "
  if (token !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null; // All good
}

/**
 * Verifies a secret passed as a query parameter (?secret=...).
 * Used for services like TidyCal that don't support custom Authorization
 * headers on outbound webhook calls.
 *
 * Usage:
 *   const authError = verifyQuerySecret(req, process.env.TIDYCAL_WEBHOOK_SECRET);
 *   if (authError) return authError;
 *
 * Webhook URL format: https://yourdomain.com/api/webhooks/tidycal?secret=YOUR_SECRET
 */
export function verifyQuerySecret(
  req: Request,
  secret: string | undefined
): NextResponse | null {
  if (!secret) {
    console.error("[webhook-auth] FATAL: Webhook secret env var is not set.");
    return NextResponse.json(
      { error: "Server misconfiguration: webhook secret not set" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("secret");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null; // All good
}
