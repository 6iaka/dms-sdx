import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { userService } from "./server/services/user_service";

export default authMiddleware({
  publicRoutes: ["/sign-in", "/sign-up"],
  async afterAuth(auth, req) {
    const { userId, sessionClaims } = auth;
    const path = req.nextUrl.pathname;

    // If not authenticated, redirect to sign-in
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Get user role
    const user = await userService.findByEmail(sessionClaims?.email as string);

    // If user not found, create new user with PENDING role
    if (!user) {
      await userService.create(
        sessionClaims?.email as string,
        sessionClaims?.name as string
      );
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    // If user is pending, redirect to pending page
    if (user.role === "PENDING") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    // Restrict access to logs page for non-admin users
    if (path.startsWith("/logs") && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
