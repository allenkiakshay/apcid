import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // 🚫 Redirect unauthenticated users trying to access protected pages
  if (
    pathname.startsWith("/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/aFbGbzkPLiNfBaAm")
  ) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 🛡 RBAC Example — Restrict /update-payment to only ADMIN
  if (pathname.startsWith("/dashboard")) {
    if (token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 🛡 RBAC Example — Restrict /aFbGbzkPLiNfBaAm only for super admin
  if (pathname.startsWith("/aFbGbzkPLiNfBaAm")) {
    if (token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard"],
};
