import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccessToken } from '@/lib/supabase/adminAuth';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/supabase/session';
import { isSimulationMode, isSupabaseConfigured } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/admin/login' || pathname.startsWith('/admin/api/session')) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured()) {
    if (isSimulationMode()) {
      return NextResponse.next();
    }

    return new NextResponse('Supabase não configurado para acesso administrativo em produção.', {
      status: 503,
    });
  }

  const accessToken = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  const validation = await validateAdminAccessToken(accessToken);

  if (!validation.ok) {
    const redirectUrl = new URL('/admin/login', request.url);
    if (validation.reason === 'not-admin') {
      redirectUrl.searchParams.set('error', 'unauthorized');
    }
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
