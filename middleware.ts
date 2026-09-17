import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require Firebase user authentication
const protectedRoutes = [
  '/dashboard',
  '/onboarding',
];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check for auth session cookie
  // This cookie is set on the client side when the user authenticates
  const sessionCookie = request.cookies.get('__session');
  const isAuthenticated = !!sessionCookie?.value;

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to login for protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add security headers
  const response = NextResponse.next();

  // CSRF protection - validate origin for mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // Allow requests without origin (same-origin) or matching origin
    if (origin) {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return new NextResponse('CSRF validation failed', { status: 403 });
      }
    }
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Change from DENY to SAMEORIGIN so the Firebase Auth iframe can load
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Required for Google OAuth popup communication
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
