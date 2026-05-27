import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const assertPublicSupabaseConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public environment variables are required on the server.');
  }
};

/**
 * Standard server-side Supabase client.
 * Suitable for fetching data in Server Components or API Routes under standard RLS rules.
 */
export const createSupabaseServerClient = () => {
  assertPublicSupabaseConfig();
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!);
};

/**
 * Administrative server-side Supabase client.
 * Bypasses RLS policies using the Service Role Key.
 * MUST ONLY be called in secure server environments (API routes, server actions, metadata builders).
 */
export const createSupabaseAdminClient = () => {
  assertPublicSupabaseConfig();
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for administrative server operations.');
  }

  return createClient<Database>(supabaseUrl!, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
