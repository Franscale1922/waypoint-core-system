/**
 * unsubscribe-route.ts: the one implementation behind all six unsubscribe endpoints.
 *
 * WHY GET NO LONGER UNSUBSCRIBES
 * ------------------------------
 * Every one of these routes used to mutate on GET. Anything that follows a link
 * without a human deciding to (a security scanner, a link-safety rewriter, a
 * mail client prefetching for a preview) silently opted people out of mail they
 * still wanted, and there was no way to tell that apart from a real click.
 *
 * So the verbs now split along the line RFC 8058 actually draws:
 *   GET  renders a confirmation page. Safe, idempotent, mutates nothing.
 *   POST performs the opt-out. This is what `List-Unsubscribe-Post` promises,
 *        and what a provider's one-click button sends.
 * A human clicking the footer link gets one confirm button; a provider's
 * one-click path is unchanged and still takes exactly zero clicks.
 *
 * The signed token in the URL is the authenticator, which is why POST needs no
 * CSRF token: an attacker who can forge the request already knows the HMAC, and
 * a one-click POST from a mail provider carries no session to protect.
 *
 * WHAT AN OPT-OUT COVERS
 * ----------------------
 * The address, not the row. See email-suppression.ts. Suppressing only the one
 * record is how the previous implementation let the next form submission undo an
 * unsubscribe.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/nurture-emails";
import { suppressEmailEverywhere } from "@/lib/email-suppression";

export interface UnsubscribeRouteOptions {
  /** Prisma model holding this list's records, e.g. "escapeKitDownload". */
  model: string;
  /** Log prefix, e.g. "[escape-kit-unsubscribe]". */
  label: string;
}

type Outcome =
  | { kind: "invalid" }
  | { kind: "not-found" }
  | { kind: "done" };

async function resolve(req: NextRequest, opts: UnsubscribeRouteOptions, mutate: boolean): Promise<Outcome> {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token || !verifyUnsubscribeToken(id, token)) return { kind: "invalid" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma as any)[opts.model].findUnique({
    where: { id },
    select: { email: true },
  });
  if (!record?.email) return { kind: "not-found" };

  if (mutate) {
    const changed = await suppressEmailEverywhere(record.email);
    console.log(`${opts.label} suppressed ${changed} record(s) for this address`);
  }
  return { kind: "done" };
}

/**
 * Builds the GET + POST pair for one list's unsubscribe endpoint.
 *
 * Note the status codes: a missing record returns 200, not 404. The person
 * clicking wants to stop receiving mail, and "we have no record of you" is that
 * outcome achieved. Telling them it failed would invite a support email over
 * a state that is already correct.
 */
export function createUnsubscribeRoute(opts: UnsubscribeRouteOptions) {
  async function GET(req: NextRequest) {
    const outcome = await resolve(req, opts, false);

    if (outcome.kind === "invalid") {
      return html(page({ heading: "Something went wrong", body: "This unsubscribe link is invalid or has expired.", isError: true }), 400);
    }
    if (outcome.kind === "not-found") {
      return html(page({ heading: "You're unsubscribed", body: "We couldn't find that subscription. You may have already been removed." }), 200);
    }

    // Valid link, nothing changed yet: ask, then let POST do the work.
    const { searchParams } = req.nextUrl;
    const action = `${req.nextUrl.pathname}?id=${encodeURIComponent(searchParams.get("id")!)}&token=${encodeURIComponent(searchParams.get("token")!)}`;
    return html(
      page({
        heading: "Unsubscribe?",
        body: "Confirm below and you'll stop receiving emails from Waypoint. This covers every sequence, not just the one that brought you here.",
        form: action,
      }),
      200
    );
  }

  async function POST(req: NextRequest) {
    const outcome = await resolve(req, opts, true);

    if (outcome.kind === "invalid") {
      return html(page({ heading: "Something went wrong", body: "This unsubscribe link is invalid or has expired.", isError: true }), 400);
    }
    return html(
      page({
        heading: "You're unsubscribed",
        // Deliberately scoped to what this actually controls. Waypoint's own
        // sequences stop here, and nothing can re-subscribe the address (see the
        // guard in beehiiv.ts). The beehiiv newsletter is a separate list with
        // its own opt-out in every issue, and claiming to have cancelled that
        // too would be a promise this handler cannot keep.
        body:
          outcome.kind === "not-found"
            ? "We couldn't find that subscription. You may have already been removed."
            : "You won't receive any more emails from Waypoint's sequences. If you also get the newsletter, use the unsubscribe link at the bottom of any issue.",
      }),
      200
    );
  }

  return { GET, POST };
}

function html(body: string, status: number): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html",
      // An opt-out page is per-recipient and state-dependent; nothing should
      // hold a copy and replay it to someone else.
      "Cache-Control": "no-store",
    },
  });
}

function page(opts: { heading: string; body: string; isError?: boolean; form?: string }): string {
  const { heading, body, isError = false, form } = opts;
  const color = isError ? "#cc3333" : "#2a5a3a";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Unsubscribe | Waypoint Franchise Advisors</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, serif;
      background: #f7f5f2;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      background: white;
      border: 1px solid #e2ddd2;
      border-radius: 12px;
      padding: 3rem 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${isError ? "#fdecea" : "#eaf4ee"};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    h1 { font-size: 1.4rem; color: #0c1929; margin-bottom: 0.75rem; }
    p { font-size: 0.95rem; color: #5a5a4a; line-height: 1.6; margin-bottom: 1.25rem; }
    a { color: #CC6535; text-decoration: none; }
    a:hover { text-decoration: underline; }
    button {
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      color: #fff;
      background: #CC6535;
      border: none;
      border-radius: 8px;
      padding: 0.85rem 1.75rem;
      cursor: pointer;
      margin-bottom: 1.25rem;
      min-height: 48px;
    }
    button:hover { background: #D4724A; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${isError
          ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
          : '<polyline points="20 6 9 17 4 12"/>'}
      </svg>
    </div>
    <h1>${heading}</h1>
    <p>${body}</p>
    ${form ? `<form method="POST" action="${form}"><button type="submit">Unsubscribe me</button></form>` : ""}
    <p>If you ever want to revisit franchise exploration, you can always reach Kelsey directly at
      <a href="mailto:kelsey@waypointfranchise.com">kelsey@waypointfranchise.com</a>.
    </p>
    <p style="margin-bottom:0">
      <a href="https://www.waypointfranchise.com">Return to waypointfranchise.com</a>
    </p>
  </div>
</body>
</html>`;
}
