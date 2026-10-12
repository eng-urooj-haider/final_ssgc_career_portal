// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./app/lib/auth";

// Pages that need a logged-in user (adjust to your app)
const PROTECTED = ["/profile", "/dashboard", "/jobs", "/user"];
function getRole(token?: string): string | null {
  if (!token) return null;
  try {
    return verifyToken(token).role ?? "USER";
  } catch {
    return null; // invalid or expired
  }
}
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const role = getRole(token);
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if ((pathname === "/login" || pathname === "/register") && token) {
    if (role == "ADMIN") {
      return NextResponse.redirect(new URL("/jobs", req.url));
    } else {
      return NextResponse.redirect(new URL("/user/dashboard", req.url));
    }
  }
  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + search); // return here after login
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Only run on these paths (skips static files, images, etc.)
  matcher: [
    "/profile/:path*",
    "/dashboard/:path*",
    "/apply/:path*",
    "/jobs/:path*",
    "/login",
    "/user/:path*",
  ],
};
