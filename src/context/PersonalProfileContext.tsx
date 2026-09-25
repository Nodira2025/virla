import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from '../infrastructure/supabase';
import { parsePersonalProfile, type PersonalProfile } from '../domain/personalProfile';
import { useAuth } from './AuthContext';

async function profileRequest(profile?: PersonalProfile) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session) throw new Error('Iniciá sesión nuevamente.');
  const response = await fetch('/api/profile', { method: profile ? 'PUT' : 'GET', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, ...(profile ? { body: JSON.stringify(profile) } : {}) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'No pudimos guardar tu perfil.');
  const parsed = parsePersonalProfile(body.profile);
  if (body.profile && !parsed) throw new Error('No pudimos leer tu perfil. Consultá al administrador.');
  return parsed;
}
interface ProfileState { profile: PersonalProfile | null; loading: boolean; error: string; reload: () => void; save: (profile: PersonalProfile) => Promise<void> }
const Context = createContext<ProfileState | null>(null);
export function PersonalProfileProvider({ children }: { children: ReactNode }) {
  const { member } = useAuth();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setProfile(null);
    void profileRequest().then((result) => { if (active) setProfile(result); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'No pudimos cargar tu perfil.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [member?.id, version]);
  const save = useCallback(async (value: PersonalProfile) => { const result = await profileRequest(value); setProfile(result); setError(''); }, []);
  return <Context.Provider value={{ profile, loading, error, reload: () => setVersion((v) => v + 1), save }}>{children}</Context.Provider>;
}
export function usePersonalProfile() { const value = useContext(Context); if (!value) throw new Error('PersonalProfileProvider requerido'); return value; }
