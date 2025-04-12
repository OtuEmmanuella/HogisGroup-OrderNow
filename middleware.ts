import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  // '/',             // Homepage - Keep this here for now, redirect handled below explicitly
  '/api/webhook(.*)',  // Any path starting with /api/webhook
  '/api/webhooks/clerk', // Clerk webhook endpoint specifically
  '/api/trpc(.*)', // tRPC API routes
  '/sign-in(.*)',  // Sign-in page and its subpaths
  '/sign-up(.*)',  // Sign-up page and its subpaths
  '/start-ordering(.*)', // Onboarding page and any subpaths
  '/home(.*)' // Add the new home page as public
]);

// Define routes that should be ignored by the middleware (if any)
// const isIgnoredRoute = createRouteMatcher([
//   '/ignored-route(.*)'
// ]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // --- Force redirect to /start-ordering for the homepage ---
  if (pathname === '/') {
    const onboardingUrl = new URL('/start-ordering', req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // Allow access to public routes defined above, including the new /home
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For all other routes, check authentication
  const { userId } = await auth();
  if (!userId) {
    const onboardingUrl = new URL('/start-ordering', req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run middleware on all routes except static files and _next internal paths
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)" , "/", "/(api|trpc)(.*)"],
};