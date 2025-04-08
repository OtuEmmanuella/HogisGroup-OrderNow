import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  '/',             // Homepage
  '/api/webhook',  // Webhook endpoint
  '/api/trpc(.*)', // tRPC API routes
  '/sign-in(.*)',  // Sign-in page and its subpaths
  '/sign-up(.*)',  // Sign-up page and its subpaths
]);

// Define routes that should be ignored by the middleware (if any)
// const isIgnoredRoute = createRouteMatcher([
//   '/ignored-route(.*)'
// ]);

export default clerkMiddleware((auth, req) => {
  // Allow access to public routes defined above
  if (isPublicRoute(req)) {
    return; // Do nothing, allow the request to proceed
  }

  // For all other routes, protect them
  auth().protect();
});

export const config = {
  // Run middleware on all routes except static files and _next internal paths
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)" , "/", "/(api|trpc)(.*)"],
};