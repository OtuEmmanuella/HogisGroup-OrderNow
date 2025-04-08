import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Define routes that should be publicly accessible without authentication
  publicRoutes: [
    '/',             // Homepage
    '/api/webhook',  // Webhook endpoint
    '/api/trpc(.*)', // tRPC API routes
    '/sign-in(.*)',  // Explicitly make sign-in public to prevent redirect loops
    '/sign-up(.*)',  // Explicitly make sign-up public
    // Add any other public routes here
  ],
  // ignoredRoutes: [] // Add routes here to skip middleware execution entirely
});

export const config = {
  // Run middleware on all routes except static files and _next internal paths
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
