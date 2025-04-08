import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require onboarding
  const publicPaths = [
    '/start-ordering',
    '/sign-in',
    '/sign-up',
    '/about',
    '/api',
  ];

  // Check if the path is public
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For all other paths, check if onboarding is complete
  const selectedBranchId = request.cookies.get('selectedBranchId');
  const selectedOrderType = request.cookies.get('selectedOrderType');

  // If onboarding is not complete, redirect to start-ordering
  if (!selectedBranchId?.value || !selectedOrderType?.value) {
    return NextResponse.redirect(new URL('/start-ordering', request.url));
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};