import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define routes that should be publicly accessible without authentication
const isPublicRoute = createRouteMatcher([
  '/',             // Homepage
  '/api/webhook',  // Webhook endpoint
  '/api/trpc(.*)', // tRPC API routes
  // Clerk auth pages (/sign-in, /sign-up) are implicitly public when using standard setup
]);

// Define routes that should be ignored by the middleware (e.g., static assets)
// Clerk automatically ignores paths like /_next, /favicon.ico
// const isIgnoredRoute = createRouteMatcher([
//   '/ignored-route(.*)'
// ]);

export default clerkMiddleware((auth, req) => {
  // If it's not a public route and not an ignored route, protect it
  if (!isPublicRoute(req)) { 
    // Note: auth().protect() is not needed here because clerkMiddleware
    // handles the protection automatically based on public/ignored routes.
    // It will redirect unauthenticated users trying to access protected routes.
    auth().protect(); // This remains the correct way to protect non-public routes
  }
});

export const config = {
  // Run middleware on all routes except static files and _next internal paths
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
