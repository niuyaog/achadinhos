export const ADMIN_ACCESS_TOKEN_COOKIE = 'achadinhos_admin_access_token';
export const ADMIN_REFRESH_TOKEN_COOKIE = 'achadinhos_admin_refresh_token';

export const getSessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});
