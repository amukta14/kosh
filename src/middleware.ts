import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  const isStaffArea = pathname.startsWith("/staff") && pathname !== "/staff/login";
  const isParentArea = pathname.startsWith("/parent");

  if (isStaffArea && (!s || s.role === "parent")) {
    return NextResponse.redirect(new URL("/staff/login", req.url));
  }
  if (isParentArea && (!s || s.role !== "parent")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/staff/:path*", "/parent/:path*"] };
