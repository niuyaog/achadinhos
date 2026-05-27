import { supabase } from './client';
import { isSimulationMode, isSupabaseConfigured } from './config';

/**
 * Checks if the actual Supabase URL has been configured by the developer.
 */
export { isSimulationMode, isSupabaseConfigured };

/**
 * Safe abstract interface to get the logged-in administrator.
 */
export const getSessionUser = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) return null;
      return user;
    } catch {
      return null;
    }
  } else if (isSimulationMode()) {
    // Simulation Mode session mapping
    if (typeof window !== 'undefined') {
      const mockSession = localStorage.getItem('achadinhos_mock_session');
      if (mockSession) {
        try {
          return JSON.parse(mockSession);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
  return null;
};

/**
 * Unified login handler.
 * If in simulation mode, accepts email 'admin@admin.com' and password 'admin'.
 */
export const signIn = async (email: string, password: string) => {
  if (isSupabaseConfigured()) {
    const response = await supabase.auth.signInWithPassword({ email, password });
    const session = response.data.session;

    if (!response.error && session) {
      const sessionResponse = await fetch('/admin/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
        }),
      });

      if (!sessionResponse.ok) {
        await supabase.auth.signOut();
        return {
          data: { user: null },
          error: { message: 'Usuário autenticado, mas sem permissão administrativa.' },
        };
      }
    }

    return response;
  } else if (isSimulationMode()) {
    if (email.trim() === 'admin@admin.com' && password === 'admin') {
      const mockUser = {
        id: 'mock-admin-id-123',
        email: 'admin@admin.com',
        user_metadata: { name: 'Curador VIP' },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('achadinhos_mock_session', JSON.stringify(mockUser));
      }
      return { data: { user: mockUser }, error: null };
    } else {
      return {
        data: { user: null },
        error: { message: 'Credenciais de simulação inválidas! Use email: admin@admin.com e senha: admin' },
      };
    }
  }

  return {
    data: { user: null },
    error: { message: 'Supabase não configurado. O modo de simulação é bloqueado em produção.' },
  };
};

/**
 * Unified logout handler.
 */
export const logOutAdmin = async () => {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
    await fetch('/admin/api/session', { method: 'DELETE' });
  } else if (isSimulationMode()) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('achadinhos_mock_session');
    }
  }
};
