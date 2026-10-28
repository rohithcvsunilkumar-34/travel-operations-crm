import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow login API endpoint and public static assets
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const { valid } = await verifySessionToken(token);

  // 1b. Allow cron endpoint if valid cron secret is supplied
  if (pathname.startsWith('/api/cron/')) {
    const cronSecret = process.env.CRON_SECRET || 'crm_cron_secret_2026';
    const providedSecret =
      req.headers.get('x-cron-secret') ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      req.nextUrl.searchParams.get('secret');

    if (providedSecret === cronSecret) {
      return NextResponse.next();
    }
  }

  // 2. Handling the /login page
  if (pathname === '/login') {
    if (valid) {
      // Already logged in, redirect to dashboard
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 3. Handling protected routes (/ and /api/*)
  if (!valid) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // If it's a browser page request, redirect to /login
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

