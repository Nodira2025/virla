import { ArrowRight, Building2, CalendarDays, CalendarPlus, Send, Settings2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { MainView } from './AppShell';

export function HomeView({ onNavigate }: { onNavigate: (view: MainView) => void }) {
  const { member } = useAuth();
  return <section className="home-view" aria-labelledby="home-title">
    <div className="page-heading"><p className="eyebrow">CENTRO CULTURAL VIRLA</p><h1 id="home-title">Hola, bienvenido a Virla.</h1><p>Organizamos la cultura, hacemos futuro.</p></div>
    <div className="home-primary-grid">
      <button type="button" className="home-create-card" onClick={() => onNavigate('reserve')}><span className="action-icon"><CalendarPlus size={30} aria-hidden="true" /></span><span className="home-action-copy"><strong>{member?.role === 'staff' ? 'Solicitar un espacio' : 'Llenar agenda'}</strong><span>Dictá tu pedido o completá el formulario.</span></span><span className="home-card-bottom"><span>Por voz o con el teclado</span><ArrowRight size={24} aria-hidden="true" /></span></button>
      <button type="button" className="home-agenda-card" onClick={() => onNavigate('agenda')}><span className="action-icon"><CalendarDays size={30} aria-hidden="true" /></span><span className="home-action-copy"><strong>Ver agenda</strong><span>Consultá las actividades y los espacios ocupados.</span></span><span className="home-card-bottom"><span>Calendario o lista</span><ArrowRight size={24} aria-hidden="true" /></span></button>
    </div>
    <div className="home-section-heading"><h2>Todo en un mismo lugar</h2><span>Elegí qué querés hacer</span></div>
    <div className="home-secondary-grid home-secondary-grid-four">
      {([{ view: 'technical', title: 'Datos técnicos de sala', detail: 'Consultá la ficha de cada espacio.', icon: Settings2 }, { view: 'spaces', title: 'Salas y espacios', detail: 'Conocé los espacios para tu propuesta.', icon: Building2 }, { view: 'requests', title: 'Solicitudes de espacios', detail: 'Consultá los pedidos y su aprobación.', icon: Send }, { view: 'store', title: 'Tienda Virla', detail: 'Explorá el catálogo de la tienda demo.', icon: ShoppingBag }] as const).map(({ view, title, detail, icon: Icon }) => <button key={view} type="button" onClick={() => onNavigate(view)} className="home-secondary-card"><span className="secondary-icon"><Icon size={25} aria-hidden="true" /></span><span><strong>{title}</strong><span>{detail}</span></span><ArrowRight size={20} aria-hidden="true" /></button>)}
    </div>
    <div className="home-help"><CalendarDays size={22} aria-hidden="true" /><p>Una actividad, toda la información.<span>Elegí un día en la agenda y abrí una actividad para consultar su horario, espacio y responsable.</span></p><button type="button" onClick={() => onNavigate('agenda')}>Ir a la agenda<ArrowRight size={18} aria-hidden="true" /></button></div>
  </section>;
}
