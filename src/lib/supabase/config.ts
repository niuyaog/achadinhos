export const isProduction = () => process.env.NODE_ENV === 'production';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return !!(
    url &&
    anonKey &&
    !url.includes('placeholder-project') &&
    !anonKey.includes('placeholder') &&
    anonKey !== 'development-placeholder-anon-key'
  );
};

export const isSimulationMode = () => !isProduction() && !isSupabaseConfigured();

export const isDemoLoginEnabled = () => 
  !isProduction() && process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';

export const canUseMockFallback = () => !isProduction();

export const assertSupabaseConfiguredForProduction = () => {
  if (isProduction() && !isSupabaseConfigured()) {
    throw new Error('Supabase must be configured in production.');
  }
};
