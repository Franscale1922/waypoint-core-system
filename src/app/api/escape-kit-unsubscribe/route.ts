import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/nurture-emails";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) {
    return new NextResponse(buildPage("Invalid unsubscribe link.", true), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!verifyUnsubscribeToken(id, token)) {
    return new NextResponse(buildPage("This unsubscribe link is invalid or has expired.", true), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const record = await (prisma as any).escapeKitDownload.findUnique({ where: { id } });
  if (!record) {
    return new NextResponse(
      buildPage("We couldn't find that subscription. You may have already been removed.", false),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!record.unsubscribed) {
    await (prisma as any).escapeKitDownload.update({
      where: { id },
      data: { unsubscribed: true, unsubscribedAt: new Date() },
    });
  }

  return new NextResponse(
    buildPage("You've been unsubscribed. You won't receive any more notes from this sequence.", false),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function buildPage(message: string, isError: boolean): string {
  const color = isError ? "#cc3333" : "#2a5a3a";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
    <h1>${isError ? "Something went wrong" : "You're unsubscribed"}</h1>
    <p>${message}</p>
    <p>If you ever want to revisit franchise exploration, reach Kelsey directly at
      <a href="mailto:kelsey@waypointfranchise.com">kelsey@waypointfranchise.com</a>.
    </p>
    <p style="margin-bottom:0">
      <a href="https://www.waypointfranchise.com">Return to waypointfranchise.com</a>
    </p>
  </div>
</body>
</html>`;
}
