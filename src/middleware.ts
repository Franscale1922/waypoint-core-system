import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isAllowedAdmin } from "@/lib/admin-allowlist";

// NOTE ON THE AUTH MODEL
// ----------------------
// This middleware is DEFENSE IN DEPTH, not the primary gate. The primary gate is the
// `withAdmin` wrapper applied to each mutating route handler (src/lib/with-admin.ts).
// That split is deliberate: the matcher below is a list of path patterns compiled to regexes,
// and a subtlety in one of them (`/api/leads/((?!retrigger$).*)` requires a trailing slash)
// silently left `POST /api/leads` and `DELETE /api/leads?status=ALL` unprotected. A gate whose
// coverage is invisible at a glance cannot be the only gate.
//
// Do NOT move authorization into NextAuth's `authorized` callback. Two reasons, both verified:
//   1. With `export default auth((req) => …)` (this file's shape), next-auth takes the
//      `userMiddlewareOrRoute` branch and the `!authorized` branch is unreachable, so returning
//      false there is dead code.
//   2. `authorized` runs for EVERY matched path, and the matcher below includes the public
//      marketing surface (/resources, /glossary, /faq, /industries) for markdown negotiation.
//      Returning a redirect Response there would 302 the entire public site to /admin/login.

// Content-rich pages that have a markdown representation (src/app/api/md).
// Articles, the resources index + category pages, the glossary, and the FAQ.
function isMarkdownNegotiable(pathname: string): boolean {
  return (
    pathname === "/resources" ||
    pathname.startsWith("/resources/") ||
    pathname === "/glossary" ||
    pathname === "/faq" ||
    pathname === "/franchise-financing" ||
    pathname.startsWith("/franchise-financing/") ||
    pathname === "/industries" ||
    pathname.startsWith("/industries/")
  );
}

// An agent opts into markdown by sending `Accept: text/markdown`. Browsers send
// `text/html,...` and never match, so HTML stays the default for humans.
// Respects an explicit `text/markdown;q=0` (the HTTP way to say "not acceptable").
function prefersMarkdown(accept: string): boolean {
  const md = accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .find((t) => t === "text/markdown" || t.startsWith("text/markdown;"));
  if (!md) return false;
  const q = /;\s*q=([0-9.]+)/.exec(md);
  return !(q && parseFloat(q[1]) === 0);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // --- Markdown content negotiation -------------------------------------
  // Two ways to ask for markdown, both rewriting (no client-visible redirect)
  // to the markdown route handler:
  //   1. `.md` suffix convention: /resources/<slug>.md, /glossary.md, etc.
  //   2. `Accept: text/markdown` on the canonical URL.
  if (pathname.endsWith(".md")) {
    const base = pathname.slice(0, -3);
    if (isMarkdownNegotiable(base)) {
      const url = req.nextUrl.clone();
      url.pathname = `/api/md${base}`;
      return NextResponse.rewrite(url);
    }
  }
  if (isMarkdownNegotiable(pathname) && prefersMarkdown(req.headers.get("accept") ?? "")) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/md${pathname}`;
    return NextResponse.rewrite(url);
  }

  // --- Auth gate (admin pages + sensitive APIs) -------------------------
  // The matcher also covers the markdown-negotiable pages above, so gate the
  // auth redirect on the actual protected paths, never on public pages.
  const isProtectedApi =
    (pathname.startsWith("/api/leads") && !pathname.startsWith("/api/leads/retrigger")) ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/match-workspace");
  const isProtectedPage =
    pathname.startsWith("/admin/") && pathname !== "/admin/login";

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Admin pages redirect to login
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated, but is this account actually permitted? Previously any Google account that
  // completed OAuth reached the admin surface. Checked here (in the function body, where it is
  // scoped to protected paths only) rather than in the `authorized` callback. See the note above.
  if (!isAllowedAdmin(req.auth.user?.email)) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Send a signed-in-but-unauthorized visitor back to the login page rather than into the
    // admin shell. `/admin/login` is excluded from the matcher, so this cannot loop.
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Protect admin pages + sensitive API routes, and intercept article pages for
  // markdown content negotiation.
  // IMPORTANT: exclude /admin/login and /api/auth/* or they cause redirect loops
  matcher: [
    "/admin/((?!login$).*)", // all /admin/* EXCEPT /admin/login
    "/api/leads", // the BARE path. The pattern below compiles to a regex requiring a trailing slash
    "/api/leads/((?!retrigger$).*)", // all /api/leads/* EXCEPT /api/leads/retrigger
    "/api/settings/:path*",
    "/api/admin/:path*",
    "/api/match-workspace/:path*",
    // Markdown negotiation surfaces (Accept: text/markdown + .md suffix)
    "/resources",
    "/resources/:path*",
    "/resources.md",
    "/glossary",
    "/glossary.md",
    "/faq",
    "/faq.md",
    "/franchise-financing",
    "/franchise-financing.md",
    "/franchise-financing/:path*",
    "/industries",
    "/industries.md",
    "/industries/:path*",
  ],
};
