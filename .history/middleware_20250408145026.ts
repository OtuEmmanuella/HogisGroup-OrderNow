import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, request) => {
  // Allow Clerk's internal routes and OAuth callbacks
  if (request.nextUrl.pathname.startsWith('/CLERK-ROUTER') || 
      request.nextUrl.pathname.startsWith('/sso-callback')) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/api/webhook",
    "/api/trpc(.*)"
  ];

  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith('(.*)')) {
      const pattern = new RegExp(route.replace('(.*)', '.*'));
      return pattern.test(request.nextUrl.pathname);
    }
    return request.nextUrl.pathname === route;
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For all other routes, require authentication
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
