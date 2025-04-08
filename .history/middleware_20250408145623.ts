import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  '/',             // Homepage
  '/api/webhook',  // Webhook endpoint
  '/api/trpc(.*)', // tRPC API routes
  '/sign-in(.*)',  // Explicitly make sign-in public
  '/sign-up(.*)',  // Explicitly make sign-up public
]);

export default clerkMiddleware((auth, req) => {
  // Protect routes that are not public
  if (!isPublicRoute(req)) {
    auth().protect();
  }
  // ClerkMiddleware implicitly allows public routes, no explicit return needed here
});

export const config = {
  // Run middleware on all routes except static files and _next internal paths
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
