import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If user is authenticated
    if (token) {
      const role = token.role as "student" | "faculty";

      // Redirect to appropriate dashboard if on auth pages
      if (path.includes("/auth")) {
        if (role === "student") {
          return NextResponse.redirect(new URL("/student/dashboard", req.url));
        } else if (role === "faculty") {
          return NextResponse.redirect(new URL("/faculty/dashboard", req.url));
        }
      }

      // Prevent students from accessing faculty routes
      if (path.startsWith("/faculty") && role !== "faculty") {
        return NextResponse.redirect(new URL("/student/dashboard", req.url));
      }

      // Prevent faculty from accessing student routes
      if (path.startsWith("/student") && role !== "student") {
        return NextResponse.redirect(new URL("/faculty/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Allow access to auth pages without token
        if (path.includes("/auth")) {
          return true;
        }

        // Require token for protected routes
        if (path.startsWith("/student") || path.startsWith("/faculty")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/student/:path*",
    "/faculty/:path*",
  ],
};
