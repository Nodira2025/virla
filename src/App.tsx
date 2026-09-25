import { useEffect, useState } from 'react';
import { AGENDA_CATEGORIES } from './domain/agendaCategories';
import { CheckCircle2, X } from 'lucide-react';
import { AppShell, VIEW_HASHES, viewFromHash, type MainView } from './components/AppShell';
import { HomeView } from './components/HomeView';
import { SpacesView } from './components/SpacesView';
import { SpaceRequestForm } from './components/SpaceRequestForm';
import { StoreView } from './components/StoreView';
import { PublicAgendaView } from './components/PublicAgendaView';
import { ReservationForm } from './components/ReservationForm';
import {
  RESERVABLE_SPACES,
  RESERVATION_ACTIVITY_TYPES,
  type PublicReservation,
  type ReservationInput,
} from './domain/reservations';
import { RequestsView } from './components/RequestsView';
import { AdminView } from './components/AdminView';
import { ProfileView } from './components/ProfileView';
import { playFeedback } from './services/feedback';
import { createReservation } from './services/reservations';


export default function App() {
  const [routeHash, setRouteHash] = useState(window.location.hash);
  const selectedRoom = RESERVABLE_SPACES.find((space) => space.id === routeHash.split('/')[1])?.id;
  const [activeView, setActiveView] = useState<MainView>(viewFromHash);
  const [reservationRefreshKey, setReservationRefreshKey] = useState(0);
  const [lastReservation, setLastReservation] = useState<PublicReservation | null>(null);

  const focusMain = () => {
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#main-content')?.focus());
  };

  const navigate = (view: MainView) => {
    if (window.location.hash !== VIEW_HASHES[view]) window.location.hash = VIEW_HASHES[view];
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
    focusMain();
  };
  const showAgenda = () => navigate('agenda');
  const handleReservationSaved = (reservation: PublicReservation, showSavedAgenda = true) => {
    setLastReservation(reservation);
    playFeedback(reservation.status === 'confirmed' ? 'confirmed' : 'sent');
    setReservationRefreshKey((value) => value + 1);
    if (!showSavedAgenda) return;
    navigate(reservation.status === 'pending' ? 'requests' : 'agenda');
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#reservation-success')?.focus());
  };
  useEffect(() => {
    const handleHistory = () => { setRouteHash(window.location.hash); setActiveView(viewFromHash()); focusMain(); };
    window.addEventListener('popstate', handleHistory);
    window.addEventListener('hashchange', handleHistory);
    return () => { window.removeEventListener('popstate', handleHistory); window.removeEventListener('hashchange', handleHistory); };
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'create_virla_reservation',
      title: 'Ocupar un espacio del Virla',
      description: 'Registra una ocupación interna en un espacio y horario del Centro Cultural Virla. Requiere identificar a una persona responsable.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: AGENDA_CATEGORIES.map((item) => item.id), description: 'Categoría de la actividad; independiente de si es función, ensayo o montaje.' },
          title: { type: 'string', description: 'Nombre de la actividad.' },
          activityType: { type: 'string', enum: RESERVATION_ACTIVITY_TYPES.map((item) => item.id) },
          description: { type: 'string', description: 'Descripción breve de la actividad y sus necesidades.' },
          spaceId: { type: 'string', enum: RESERVABLE_SPACES.map((space) => space.id) },
          date: { type: 'string', description: 'Fecha local en formato AAAA-MM-DD.' },
          startTime: { type: 'string', description: 'Hora local de inicio en formato HH:MM.' },
          endTime: { type: 'string', description: 'Hora local de finalización en formato HH:MM.' },
          responsibleName: { type: 'string', description: 'Nombre y apellido de la persona responsable.' },
          contact: { type: 'string', description: 'Teléfono o correo para uso de coordinación.' },
          organization: { type: 'string' },
          expectedAttendance: { type: 'integer', minimum: 1 },
          notes: { type: 'string' },
        },
        required: ['title', 'activityType', 'description', 'spaceId', 'date', 'startTime', 'endTime', 'responsibleName', 'contact'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input) {
        const reservation = await createReservation(input as ReservationInput);
        handleReservationSaved(reservation);
        return {
          id: reservation.id,
          status: reservation.status,
          activity: reservation.title,
          space: reservation.spaceName,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          responsible: reservation.responsibleName,
        };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  return (
    <AppShell activeView={activeView} onNavigate={navigate}>
      {activeView === 'store' && <StoreView />}
      {lastReservation?.status === 'pending' && <p className="team-message" role="status">Solicitud enviada a dirección. El espacio quedará ocupado cuando sea aprobada.<button onClick={() => setLastReservation(null)} aria-label="Cerrar aviso"> ×</button></p>}
      {activeView === 'profile' ? <ProfileView /> : activeView === 'requests' ? <RequestsView onChanged={() => setReservationRefreshKey((value) => value + 1)} /> : activeView === 'admin' ? <AdminView /> : activeView === 'home' ? <HomeView onNavigate={navigate} /> : activeView === 'store' ? null : activeView === 'request' ? <SpaceRequestForm /> : activeView === 'spaces' || activeView === 'technical' ? <SpacesView key={activeView} view={activeView} /> : activeView === 'reserve' ? (
        <ReservationForm key={selectedRoom || "all"} initialSpaceId={selectedRoom} onCancel={showAgenda} onSaved={handleReservationSaved} />
      ) : <>
        {lastReservation?.status === 'confirmed' && <section id="reservation-success" tabIndex={-1} className="reservation-success" role="status"><CheckCircle2 size={26} aria-hidden="true" /><div><h2>Agenda actualizada</h2><p><strong>{lastReservation.title}</strong> · {lastReservation.spaceName} · {lastReservation.date.split('-').reverse().join('/')} · {lastReservation.startTime} a {lastReservation.endTime} hs.</p><p>La actividad ya está guardada y disponible en la agenda.</p></div><button type="button" aria-label="Cerrar confirmación" onClick={() => setLastReservation(null)}><X size={20} /></button></section>}
        <PublicAgendaView spaceId={selectedRoom} reservationRefreshKey={reservationRefreshKey} focusDate={lastReservation?.date} onCreate={() => { window.location.hash = '#crear-agenda' + (selectedRoom ? '/' + selectedRoom : ''); }} />
      </>}
    </AppShell>
  );
}
