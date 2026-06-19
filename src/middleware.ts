import { auth } from "@/auth";
import { NextResponse } from "next/server";

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
    pathname.startsWith("/api/settings");
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

  return NextResponse.next();
});

export const config = {
  // Protect admin pages + sensitive API routes, and intercept article pages for
  // markdown content negotiation.
  // IMPORTANT: exclude /admin/login and /api/auth/* or they cause redirect loops
  matcher: [
    "/admin/((?!login$).*)", // all /admin/* EXCEPT /admin/login
    "/api/leads/((?!retrigger$).*)", // all /api/leads/* EXCEPT /api/leads/retrigger
    "/api/settings/:path*",
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
