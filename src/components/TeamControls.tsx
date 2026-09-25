import { useEffect, useRef, useState } from 'react';
import { usePersonalProfile } from '../context/PersonalProfileContext';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../domain/members';
import { getSupabase } from '../infrastructure/supabase';
import { playFeedback, readGuide, setSounds, soundsEnabled, unlockSounds } from '../services/feedback';
import type { MainView } from './AppShell';

interface Notice { id: string; message: string; kind: 'pending' | 'confirmed' | 'rejected'; created_at: string; read_at: string | null }
const guides: Partial<Record<MainView, string>> = {
  home: 'Bienvenido a Virla. Entrá a Agenda para ver actividades, a Salas para consultar sus datos, o a Crear para solicitar un espacio. En Solicitudes podés seguir tus pedidos.',
  reserve: 'Completá la actividad, elegí la sala, el día y el horario. Revisá los datos antes de enviar. Si sos personal, dirección debe aprobar tu solicitud antes de ocupar el espacio.',
  agenda: 'Elegí calendario o lista para ver la agenda. Tocá una actividad para leer sus detalles. Los espacios se ocupan únicamente cuando la actividad está confirmada.',
  requests: 'Los pedidos pendientes todavía no ocupan la sala. Dirección puede revisar y aprobar cada pedido. Si hay otro evento en ese horario, la app impedirá la aprobación.',
  technical: 'Elegí una sala. Podés consultar su ficha técnica, abrir su agenda y solicitar un horario.',
};
export function TeamControls({ view, onNavigate }: { view: MainView; onNavigate: (view: MainView) => void }) {
  const { member, signOut } = useAuth(); const { profile } = usePersonalProfile(); const [sound, updateSound] = useState(soundsEnabled);
  const [notices, setNotices] = useState<Notice[]>([]); const [open, setOpen] = useState(false); const [error, setError] = useState('');
  const known = useRef<Set<string> | null>(null);
  const memberId = member?.id;
  useEffect(() => { window.addEventListener('pointerdown', unlockSounds); window.addEventListener('keydown', unlockSounds); return () => { window.removeEventListener('pointerdown', unlockSounds); window.removeEventListener('keydown', unlockSounds); window.speechSynthesis?.cancel(); }; }, []);
  useEffect(() => {
    if (!memberId) return; let live = true; let fetching = false; known.current = null;
    const load = async () => {
      if (fetching) return; fetching = true;
      try {
        const { data, error: failure } = await getSupabase().from('virla_notifications').select('*').eq('recipient_id', memberId).order('created_at', { ascending: false }).limit(100);
        if (!live) return;
        if (failure) { setError('No pudimos actualizar los avisos.'); return; }
        const rows = data as Notice[];
        const fresh = known.current && rows.find((row) => !row.read_at && !known.current!.has(row.id));
        if (fresh) playFeedback(fresh.kind === 'confirmed' ? 'confirmed' : 'incoming');
        known.current = new Set(rows.map((row) => row.id)); setNotices(rows); setError('');
      } catch { if (live) setError('No pudimos actualizar los avisos.'); }
      finally { fetching = false; }
    };
    void load(); const timer = window.setInterval(() => { void load(); }, 20000);
    const channel = getSupabase().channel('virla-notices-' + memberId).on('postgres_changes', { event: '*', schema: 'public', table: 'virla_notifications', filter: 'recipient_id=eq.' + memberId }, () => { void load(); }).subscribe();
    const focus = () => { void load(); }; window.addEventListener('focus', focus);
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', focus); void getSupabase().removeChannel(channel); };
  }, [memberId]);
  const markRead = async (notice: Notice) => {
    const read_at = new Date().toISOString();
    const { error: failure } = await getSupabase().from('virla_notifications').update({ read_at }).eq('id', notice.id);
    if (failure) { setError('No pudimos marcar el aviso como leído.'); return; }
    setNotices((rows) => rows.map((row) => row.id === notice.id ? { ...row, read_at } : row)); setOpen(false); onNavigate('requests');
  };
  return <><div className="team-toolbar"><span className="member-name"><strong>{profile?.name || member?.display_name || member?.email}</strong> · {member?.role && ROLE_LABELS[member.role]}</span>
    <button onClick={() => { try { setSounds(!sound); updateSound(!sound); } catch { setError('Este navegador no permite activar sonidos.'); } }}>{sound ? 'Sonidos activados' : 'Activar sonidos'}</button>
    <button onClick={() => { if (!readGuide(guides[view] || guides.technical!)) setError('Este navegador no ofrece lectura en voz alta.'); }}>Escuchar guía</button><button onClick={() => window.speechSynthesis?.cancel()}>Detener voz</button>
    <button onClick={() => onNavigate('profile')}>Mi perfil</button><a href="#inicio">Bienvenida</a><button aria-expanded={open} onClick={() => setOpen(!open)}>Avisos{notices.some((row) => !row.read_at) ? ' (' + notices.filter((row) => !row.read_at).length + ')' : ''}</button>
    <button onClick={() => { void signOut().catch(() => setError('No se pudo cerrar sesión. Volvé a intentar.')); }}>Salir</button>
  </div>{open && <section className="team-card" aria-label="Avisos del equipo"><h2>Mis avisos</h2><p>Los sonidos funcionan con la app abierta y después de activarlos en este dispositivo.</p>{error && <p role="alert">{error}</p>}{!notices.length && <p>No hay avisos nuevos.</p>}{notices.map((notice) => <button key={notice.id} className="team-message" onClick={() => { void markRead(notice); }}>{!notice.read_at && '● '}{notice.message} · {new Date(notice.created_at).toLocaleString('es-AR')}</button>)}</section>}{error && !open && <p role="status" className="team-message">{error}</p>}</>;
}
