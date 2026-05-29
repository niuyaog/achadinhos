import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow login and all admin API routes to bypass proxy (they do their own auth)
  if (pathname === '/admin/login' || pathname.startsWith('/admin/api/')) {
    return NextResponse.next();
  }

  // Simulation mode check directly in Edge runtime
  const isSimulation = process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (isSimulation) {
    return NextResponse.next();
  }

  // Simply check if the token cookie exists.
  // Full verification happens inside layout.tsx / page.tsx on the server/client side.
  const hasToken = request.cookies.has('achadinhos_admin_access_token');
  
  // If no token cookie, redirect to login
  if (!hasToken) {
    const redirectUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
