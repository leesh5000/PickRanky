import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow access to login page
    if (req.nextUrl.pathname === "/admin/login") {
      return NextResponse.next();
    }

    // Check if user is authenticated for admin routes
    const token = req.nextauth.token;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow login page
        if (req.nextUrl.pathname === "/admin/login") {
          return true;
        }

        // Require authentication for admin routes
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token;
        }

        if (req.nextUrl.pathname.startsWith("/api/admin")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
