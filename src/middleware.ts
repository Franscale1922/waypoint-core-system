import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // API routes return 401 JSON — they can't redirect to a login page
  const isProtectedApi =
    pathname.startsWith("/api/leads") || pathname.startsWith("/api/settings");

  if (!isLoggedIn) {
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
  // Protect admin pages + sensitive API routes
  // IMPORTANT: exclude /admin/login and /api/auth/* or they cause redirect loops
  matcher: [
    "/admin/((?!login$).*)", // all /admin/* EXCEPT /admin/login
    "/api/leads/:path*",
    "/api/settings/:path*",
  ],
};
