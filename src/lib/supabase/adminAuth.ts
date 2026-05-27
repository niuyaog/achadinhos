import 'server-only';

import { User } from '@supabase/supabase-js';
import { createSupabaseAdminClient, createSupabaseServerClient } from './server';

export type AdminValidationResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'missing-token' | 'invalid-token' | 'not-admin' | 'misconfigured' };

export const validateAdminAccessToken = async (accessToken?: string | null): Promise<AdminValidationResult> => {
  if (!accessToken) {
    return { ok: false, reason: 'missing-token' };
  }

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return { ok: false, reason: 'invalid-token' };
    }

    const adminSupabase = createSupabaseAdminClient();
    const { data: adminUser, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminUser) {
      return { ok: false, reason: 'not-admin' };
    }

    return { ok: true, user };
  } catch (error) {
    console.error('Admin auth validation failed:', error);
    return { ok: false, reason: 'misconfigured' };
  }
};
