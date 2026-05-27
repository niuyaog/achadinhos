import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccessToken } from '@/lib/supabase/adminAuth';
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
  getSessionCookieOptions,
} from '@/lib/supabase/session';

type SessionPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function POST(request: NextRequest) {
  let payload: SessionPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload de sessão inválido.' }, { status: 400 });
  }

  const validation = await validateAdminAccessToken(payload.access_token);
  if (!validation.ok) {
    const response = NextResponse.json({ error: 'Usuário sem permissão administrativa.' }, { status: 403 });
    clearSessionCookies(response);
    return response;
  }

  if (!payload.access_token || !payload.refresh_token) {
    return NextResponse.json({ error: 'Tokens de sessão ausentes.' }, { status: 400 });
  }

  const response = NextResponse.json({
    user: {
      id: validation.user.id,
      email: validation.user.email,
    },
  });

  response.cookies.set(
    ADMIN_ACCESS_TOKEN_COOKIE,
    payload.access_token,
    getSessionCookieOptions(Math.max(60, Math.min(payload.expires_in || 3600, 3600)))
  );
  response.cookies.set(
    ADMIN_REFRESH_TOKEN_COOKIE,
    payload.refresh_token,
    getSessionCookieOptions(60 * 60 * 24 * 30)
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, '', getSessionCookieOptions(0));
  response.cookies.set(ADMIN_REFRESH_TOKEN_COOKIE, '', getSessionCookieOptions(0));
}
