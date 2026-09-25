import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Member } from '../domain/members';
import { getSupabase } from '../infrastructure/supabase';

interface AuthState { session: Session | null; member: Member | null; loading: boolean; error: string; reload: () => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const reload = useCallback(async () => {
    const current = ++version.current;
    setError('');
    try {
      const supabase = getSupabase();
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (current !== version.current) return;
      setSession(currentSession);
      if (!currentSession) { setMember(null); return; }
      const { data, error: profileError } = await supabase.rpc('virla_ensure_profile');
      if (current !== version.current) return;
      if (profileError) throw profileError;
      setMember(data as Member);
    } catch { if (current === version.current) { setMember(null); setError('No pudimos cargar tu acceso. Revisá la conexión o consultá al administrador.'); } }
    finally { if (current === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = getSupabase().auth.onAuthStateChange((event, next) => {
        if (event === 'TOKEN_REFRESHED') { setSession(next); return; }
        // Leave the auth callback before querying to avoid Supabase auth locks.
        setTimeout(() => { void reload(); }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch { setLoading(false); }
    const onFocus = () => { void reload(); };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60000);
    return () => { version.current++; unsubscribe?.(); window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [reload]);
  const signOut = async () => { const { error: signOutError } = await getSupabase().auth.signOut({ scope: 'local' }); if (signOutError) throw signOutError; version.current++; setSession(null); setMember(null); };
  return <AuthContext.Provider value={{ session, member, loading, error, reload, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('AuthProvider requerido'); return context; }
