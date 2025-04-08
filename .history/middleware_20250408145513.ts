import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define routes that should be publicly accessible without authentication
const isPublicRoute = createRouteMatcher([
  '/',             // Homepage
  '/api/webhook',  // Webhook endpoint
  '/api/trpc(.*)', // tRPC API routes
  // Clerk's auth pages (/sign-in, /sign-up) are handled implicitly
]);

export default clerkMiddleware((auth, request) => {
  // If the request is not for a public route, then protect it.
  // Clerk will automatically redirect unauthenticated users to the sign-in page.
  if (!isPublicRoute(request)) {
    auth().protect();
  }
  // No need to return NextResponse.next() explicitly here for public routes;
  // clerkMiddleware handles it.
});

export const config = {
  // Run middleware on all routes except static files and _next internal paths
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
