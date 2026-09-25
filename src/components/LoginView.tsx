import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { getSupabase } from '../infrastructure/supabase';
import { useAuth } from '../context/AuthContext';
import { loginEmail } from '../domain/loginIdentity';

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, member, loading, error, reload, signOut } = useAuth();
  if (loading) return <div className="auth-screen"><div className="auth-card" role="status"><LoaderCircle className="animate-spin" />Cargando tu acceso…</div></div>;
  if (!session) return <LoginView />;
  if (error || !member?.active || !member.role) return <div className="auth-screen"><section className="auth-card"><img src="/logo-virla.png" alt="Virla" /><h1>{error ? 'No pudimos abrir tu cuenta' : 'Tu cuenta está pendiente'}</h1><p>{error || 'El administrador debe habilitar tu perfil de director, personal o admin.'}</p><p>{session.user.email}</p><button className="primary-button" onClick={() => { void reload(); }}>Revisar mi acceso</button><button className="secondary-button" onClick={() => { void signOut().catch(() => undefined); }}>Salir</button></section></div>;
  return children;
}

function LoginView() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const { reload } = useAuth();
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
    try {
      const auth = getSupabase().auth;
      const result = mode === 'login' ? await auth.signInWithPassword({ email: loginEmail(email), password }) : await auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin + '/' } });
      if (result.error) { setError(mode === 'login' ? 'No pudimos iniciar sesión. Revisá correo, contraseña y confirmación de correo.' : 'No se pudo registrar la cuenta. Revisá los datos o consultá al admin.'); return; }
      setPassword('');
      if (mode === 'signup' && !result.data.session) setMessage('Revisá tu correo para confirmar la cuenta. Luego el admin deberá habilitar tu acceso.');
      await reload();
    } catch { setError('No pudimos conectar con Virla. Volvé a intentar.'); }
    finally { setBusy(false); }
  };
  return <div className="auth-screen"><section className="auth-card"><img src="/logo-virla.png" alt="Virla" /><h1>{mode === 'login' ? 'Bienvenido' : 'Crear mi cuenta'}</h1><p>Organizamos la cultura,<br />hacemos futuro.</p><form onSubmit={submit}>
    {mode === 'signup' && <label className="form-field">Nombre y apellido<input required value={name} maxLength={100} autoComplete="name" onChange={(e) => setName(e.target.value)} /></label>}
    <label className="form-field"><span><Mail size={17} aria-hidden="true" />{mode === 'login' ? 'Usuario o correo electrónico' : 'Correo electrónico'}</span><input required type={mode === 'login' ? 'text' : 'email'} autoComplete={mode === 'login' ? 'username' : 'email'} autoCapitalize="none" spellCheck={false} placeholder={mode === 'login' ? 'Tu usuario o correo' : 'nombre@correo.com'} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label className="form-field"><span><LockKeyhole size={17} aria-hidden="true" />Contraseña</span><input required type="password" minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p role="alert" className="field-error">{error}</p>}{message && <p role="status">{message}</p>}
    <button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}{busy ? 'Conectando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
    </form><button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setError(''); }}>{mode === 'login' ? 'Soy parte del equipo y aún no tengo cuenta' : 'Ya tengo una cuenta'}</button>{mode === 'signup' && <p className="field-hint">Registrarte no otorga permisos. El admin debe habilitar tu cuenta.</p>}<small>Centro Cultural Virla · UNT</small></section></div>;
}
