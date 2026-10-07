// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Pages that need a logged-in user (adjust to your app)
const PROTECTED = ["/profile", "/dashboard", "/apply", "/jobs/apply","/user"];

export function proxy(req: NextRequest) {
   const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + search); // return here after login
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in users don't need the login page
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run on these paths (skips static files, images, etc.)
  matcher: ["/profile/:path*", "/dashboard/:path*", "/apply/:path*", "/jobs/apply/:path*", "/login","/user/:path*"],
};