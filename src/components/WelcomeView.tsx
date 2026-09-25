import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, CloudSun, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePersonalProfile } from '../context/PersonalProfileContext';
import { fetchReservations } from '../services/reservations';
import type { PublicReservation } from '../domain/reservations';

const local = { timeZone: 'America/Argentina/Tucuman' };
export function WelcomeView() {
  const { member, signOut } = useAuth(); const personal = usePersonalProfile();
  const [now, setNow] = useState(() => new Date()); const [events, setEvents] = useState<PublicReservation[]>([]); const [agendaStatus, setAgendaStatus] = useState('Consultando agenda…');
  const [weather, setWeather] = useState<{ temperature: number; label: string; time: string } | null>(null); const [weatherStatus, setWeatherStatus] = useState('Consultando clima…'); const [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let live = true; const controller = new AbortController();
    const load = () => { void fetchReservations(controller.signal).then((rows) => { if (live) { setEvents(rows); setAgendaStatus('Sin próximas actividades confirmadas'); } }).catch(() => { if (live) setAgendaStatus('Agenda no disponible'); }); };
    load(); const timer = setInterval(load, 60000); window.addEventListener('focus', load);
    return () => { live = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
    void fetch('https://api.open-meteo.com/v1/forecast?latitude=-26.8241&longitude=-65.2226&current=temperature_2m,weather_code&timezone=America%2FArgentina%2FTucuman', { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((data) => {
      const c = data.current; if (typeof c?.temperature_2m !== 'number' || typeof c?.weather_code !== 'number' || typeof c?.time !== 'string') throw new Error();
      const code = c.weather_code;
      setWeather({ temperature: Math.round(c.temperature_2m), label: code === 0 ? 'Despejado' : code <= 3 ? 'Parcialmente nublado' : code <= 48 ? 'Con niebla' : code >= 95 ? 'Tormentas' : code >= 71 && code <= 77 ? 'Nieve' : 'Precipitaciones', time: c.time.slice(11,16) });
    }).catch(() => setWeatherStatus('Clima no disponible')).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);
  const hour = Number(now.toLocaleString('en-GB', { ...local, hour: '2-digit', hourCycle: 'h23' }));
  const name = personal.profile?.name || member?.display_name || 'Bienvenido al Virla';
  const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('');
  const next = events.filter((event) => new Date(event.date + 'T' + event.startTime + ':00-03:00').getTime() >= now.getTime()).sort((a,b) => (a.date+a.startTime).localeCompare(b.date+b.startTime))[0];
  return <main className="welcome-page"><header className="welcome-brand"><div><span>CENTRO CULTURAL</span><strong>VIRLA</strong><small>UNIVERSIDAD NACIONAL DE TUCUMÁN</small></div><p>CULTURA<br/>QUE NOS<br/>ENCUENTRA</p></header>
    <section className="welcome-widgets" aria-label="Información del día"><div><CloudSun size={32}/><section><strong>{weather ? weather.temperature + '°' : 'Tucumán'}</strong><p>{weather?.label || weatherStatus}</p><small>{weather ? 'Tucumán · actualizado ' + weather.time : 'San Miguel de Tucumán'}</small><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Clima: Open-Meteo</a></section></div><div><Clock3 size={32}/><section><strong>{now.toLocaleTimeString('es-AR',{ ...local, hour:'2-digit', minute:'2-digit', hourCycle:'h23' })}</strong><p>{now.toLocaleDateString('es-AR',{ ...local, weekday:'short',day:'numeric',month:'short',year:'numeric' })}</p><small>Argentina</small></section></div><a href={next ? '#agenda/' + next.id : '#agenda'}><CalendarDays size={32}/><section><strong className="welcome-next-label">Próximo en agenda interna</strong><p>{next?.title || agendaStatus}</p>{next && <small>{next.spaceName}<br/>{next.date.split('-').reverse().join('/')} · {next.startTime}</small>}</section></a></section>
    <section className="welcome-greeting"><p>{hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'},</p><h1>{name}.</h1><p className="welcome-subtitle">Gestioná agenda, salas y actividades<br/>desde un solo lugar.</p><a className="welcome-profile" href="#perfil"><span className="welcome-avatar">{personal.profile?.photo ? <img src={personal.profile.photo} alt="Tu foto de perfil"/> : initials}</span><span className="welcome-profile-label"><UserRound size={23}/>Mi perfil</span></a>
    <a className="welcome-start" href="#menu" aria-busy={personal.loading} onClick={(e) => { if (personal.loading) e.preventDefault(); }}>{personal.loading ? 'Cargando…' : 'Iniciar'}<ArrowRight size={32}/></a><p className="welcome-start-hint">{personal.profile ? 'Al iniciar se abrirá el menú principal' : 'Completá Mi perfil una vez para no repetir tus datos en cada pedido'}</p>{personal.error && <p role="status">No pudimos cargar tu perfil. Podés entrar al menú y volver a intentar.</p>}
    </section><footer className="welcome-footer"><span>Centro Cultural Eugenio F. Virla · Universidad Nacional de Tucumán</span><button onClick={() => { void signOut().catch(() => setError('No pudimos cerrar sesión.')); }}>Salir</button></footer>{error && <p role="alert">{error}</p>}
  </main>;
}
