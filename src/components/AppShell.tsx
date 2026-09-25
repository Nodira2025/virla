import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Building2, CalendarDays, CalendarPlus, ChevronRight, Home, MapPin, Menu, Phone, Send, Settings2, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TeamControls } from './TeamControls';
import { ENTRADANET_BASE_URL } from '../infrastructure/entradanet';

export type MainView = 'home' | 'agenda' | 'reserve' | 'store' | 'spaces' | 'technical' | 'request' | 'requests' | 'admin' | 'profile';
export const VIEW_HASHES: Record<MainView, string> = { home: '#menu', agenda: '#agenda', reserve: '#crear-agenda', store: '#tienda-virla', spaces: '#espacios', technical: '#datos-tecnicos', request: '#propuesta-externa', requests: '#solicitudes', admin: '#admin', profile: '#perfil' };
export const viewFromHash = (): MainView => {
  const base = window.location.hash.split('/')[0];
  if (base === '#solicitar-espacio') return 'reserve';
  if (base === '#salas') return 'spaces';
  return (Object.keys(VIEW_HASHES) as MainView[]).find((view) => VIEW_HASHES[view] === base) || 'home';
};
const navigation = [
  { view: 'home', label: 'Inicio', icon: Home },
  { view: 'reserve', label: 'Crear agenda', icon: CalendarPlus },
  { view: 'agenda', label: 'Ver agenda', icon: CalendarDays },
  { view: 'technical', label: 'Datos técnicos de sala', icon: Settings2 },
  { view: 'spaces', label: 'Salas y espacios', icon: Building2 },
  { view: 'requests', label: 'Solicitudes', icon: Send },
  { view: 'admin', label: 'Administración', icon: Settings2 },
  { view: 'profile', label: 'Mi perfil', icon: Settings2 },
  { view: 'request', label: 'Propuesta a curaduría', icon: Send },
  { view: 'store', label: 'Tienda Virla', icon: ShoppingBag },
] as const;

export function AppShell({ activeView, onNavigate, children }: { activeView: MainView; onNavigate: (view: MainView) => void; children: ReactNode }) {
  const { member } = useAuth();
  const visibleNavigation = navigation.filter((item) => item.view !== 'admin' || member?.role === 'admin').map((item) => ({ ...item, label: item.view === 'reserve' && member?.role === 'staff' ? 'Solicitar espacio' : item.view === 'requests' && member?.role === 'staff' ? 'Mis solicitudes' : item.label }));
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (view: MainView) => { setMenuOpen(false); onNavigate(view); };
  const current = visibleNavigation.find((item) => item.view === activeView)!;
  return (
    <div className="virla-app">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Ir al contenido</a>
      <aside className="app-sidebar" aria-label="Menú principal">
        <a href="#inicio" className="virla-brand" onClick={(event) => { event.preventDefault(); navigate('home'); }}>
          <img src="/logo-virla.png" alt="VIRLA" />
          <span>Centro Cultural<span>Universidad Nacional de Tucumán</span></span>
        </a>
        <div className="sidebar-caption">TU ESPACIO CULTURAL</div>
        <nav className="sidebar-nav" aria-label="Funciones principales">
          {visibleNavigation.map(({ view, label, icon: Icon }) => <a key={view} href={VIEW_HASHES[view]} onClick={(event) => { event.preventDefault(); navigate(view); }} aria-current={activeView === view ? 'page' : undefined} className={view === 'reserve' ? 'nav-create' : ''}><Icon size={21} aria-hidden="true" /><span>{label}</span>{activeView === view && <ChevronRight size={16} aria-hidden="true" />}</a>)}
        </nav>
        <div className="sidebar-bottom"><a href="#portada" className="public-return">← Sitio del Virla</a><a href="#inicio" className="public-return">Mi bienvenida</a>
          <p className="culture-note">La cultura también<br />organiza el futuro.</p>
          <div className="sidebar-contact"><MapPin size={17} aria-hidden="true" /><span>25 de Mayo 265<br />San Miguel de Tucumán</span></div>
          <a href="tel:+543814221692" className="sidebar-contact"><Phone size={17} aria-hidden="true" />(381) 422-1692</a>
          <p className="sidebar-university">SECRETARÍA DE EXTENSIÓN UNIVERSITARIA</p>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <a href="#inicio" className="mobile-brand" aria-label="Virla, ir al inicio" onClick={(event) => { event.preventDefault(); navigate('home'); }}><img src="/logo-virla.png" alt="VIRLA" /></a>
          <div className="topbar-location"><span>Mi Virla</span><ChevronRight size={16} aria-hidden="true" /><strong>{current?.label || 'Virla'}</strong></div>
          <div className="topbar-actions"><a className="public-mobile-return" href="#portada">Sitio Virla</a><span className="topbar-date">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><a href={ENTRADANET_BASE_URL} className="tickets-link">Entradas<ArrowUpRight size={17} aria-hidden="true" /></a></div>
        </header>
        <TeamControls view={activeView} onNavigate={navigate} />
        <main id="main-content" tabIndex={-1} className="app-main">{children}</main>
        <footer className="app-footer"><strong>VIRLA <span>Arte. Personas. Futuro.</span></strong><span>Centro Cultural · UNT</span></footer>
      </div>
      {menuOpen && <div className="mobile-more" id="mobile-more"><div className="flex items-center justify-between"><strong>Más en Virla</strong><button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={22} /></button></div>{visibleNavigation.filter((item) => ['profile', 'requests', 'admin', 'request', 'store'].includes(item.view)).map(({ view, label, icon: Icon }) => <a href={VIEW_HASHES[view]} key={view} onClick={(event) => { event.preventDefault(); navigate(view); }}><Icon size={22} aria-hidden="true" />{label}<ChevronRight size={18} aria-hidden="true" /></a>)}<a href="tel:+543814221692"><Phone size={22} aria-hidden="true" />Contactar al Virla</a></div>}
      <nav className="mobile-navigation" aria-label="Navegación móvil">
        {([{ view: 'home', label: 'Inicio', icon: Home }, { view: 'agenda', label: 'Agenda', icon: CalendarDays }, { view: 'reserve', label: 'Crear', icon: CalendarPlus }, { view: 'technical', label: 'Salas', icon: Building2 }] as const).map(({ view, label, icon: Icon }) => <a key={view} href={VIEW_HASHES[view]} aria-current={activeView === view || (view === 'technical' && activeView === 'spaces') ? 'page' : undefined} className={view === 'reserve' ? 'mobile-create' : ''} onClick={(event) => { event.preventDefault(); navigate(view); }}><Icon size={23} aria-hidden="true" /><span>{label}</span></a>)}
        <button type="button" aria-expanded={menuOpen} aria-controls="mobile-more" onClick={() => setMenuOpen(!menuOpen)} className={activeView === 'request' || activeView === 'store' ? 'is-active' : ''}>{menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}<span>Más</span></button>
      </nav>
    </div>
  );
}
