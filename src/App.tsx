import { useEffect, useState } from 'react';
import { CalendarCheck, CalendarDays, CheckCircle2, ExternalLink, MapPin, Phone } from 'lucide-react';
import { PublicAgendaView } from './components/PublicAgendaView';
import { ReservationForm } from './components/ReservationForm';
import {
  RESERVABLE_SPACES,
  RESERVATION_ACTIVITY_TYPES,
  type PublicReservation,
  type ReservationInput,
} from './domain/reservations';
import { ENTRADANET_BASE_URL } from './infrastructure/entradanet';
import { createReservation } from './services/reservations';

type MainView = 'agenda' | 'reserve';

export default function App() {
  const [activeView, setActiveView] = useState<MainView>('agenda');
  const [reservationRefreshKey, setReservationRefreshKey] = useState(0);
  const [lastReservation, setLastReservation] = useState<PublicReservation | null>(null);

  const focusMain = () => {
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#main-content')?.focus());
  };

  const showAgenda = () => {
    setActiveView('agenda');
    focusMain();
  };

  const showReservationForm = () => {
    setLastReservation(null);
    setActiveView('reserve');
    focusMain();
  };

  const handleReservationSaved = (reservation: PublicReservation) => {
    setLastReservation(reservation);
    setReservationRefreshKey((value) => value + 1);
    setActiveView('agenda');
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#reservation-success')?.focus());
  };

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
    <div className="flex min-h-screen flex-col bg-[#f4f7f9] text-slate-900">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-lg bg-white px-4 py-2 font-bold text-[#004a7f] shadow-lg focus:translate-y-0"
      >
        Ir al contenido
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="bg-[#002f52] px-4 py-2 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-sm">
            <strong className="tracking-wide">Universidad Nacional de Tucumán</strong>
            <span className="hidden text-white/80 sm:inline">Secretaría de Extensión Universitaria</span>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img
              src="/logo-virla.png"
              alt="Centro Cultural Virla"
              className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
            />
            <div className="min-w-0 border-l border-slate-200 pl-3 sm:pl-4">
              <strong className="block truncate text-lg text-[#003865] sm:text-xl">Centro Cultural Virla</strong>
              <span className="block text-sm text-slate-500">Agenda de espacios</span>
            </div>
          </div>

          <a
            href={ENTRADANET_BASE_URL}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#004a7f] bg-white px-4 text-base font-bold text-[#004a7f] transition hover:bg-blue-50"
            aria-label="Ir a eventos y entradas en EntradaNet"
          >
            <span className="hidden sm:inline">Eventos y entradas</span>
            <span className="sm:hidden">Entradas</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid h-1 grid-cols-5" aria-hidden="true">
          <span className="bg-[#2A87AB]" />
          <span className="bg-[#47A2CC]" />
          <span className="bg-[#62BCFF]" />
          <span className="bg-[#3F82BC]" />
          <span className="bg-[#295B88]" />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl grow px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
        <nav className="mb-6 grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:w-fit sm:grid-cols-2" aria-label="Funciones principales">
          <button
            type="button"
            onClick={showAgenda}
            aria-pressed={activeView === 'agenda'}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold transition ${
              activeView === 'agenda' ? 'bg-[#004a7f] text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            Ver agenda
          </button>
          <button
            type="button"
            onClick={showReservationForm}
            aria-pressed={activeView === 'reserve'}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-bold transition ${
              activeView === 'reserve' ? 'bg-[#007F8C] text-white' : 'text-[#006a75] hover:bg-cyan-50'
            }`}
          >
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            Ocupar un espacio
          </button>
        </nav>

        {activeView === 'reserve' ? (
          <ReservationForm onCancel={showAgenda} onSaved={handleReservationSaved} />
        ) : (
          <>
            {lastReservation && (
              <section
                id="reservation-success"
                tabIndex={-1}
                className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 outline-none focus:ring-3 focus:ring-emerald-300"
                role="status"
              >
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h1 className="text-lg font-bold">El espacio quedó ocupado</h1>
                  <p className="mt-1 text-base leading-relaxed">
                    <strong>{lastReservation.spaceName}</strong> · {lastReservation.date.split('-').reverse().join('/')} · {lastReservation.startTime} a {lastReservation.endTime} hs · Responsable: {lastReservation.responsibleName}.
                  </p>
                </div>
              </section>
            )}
            <PublicAgendaView reservationRefreshKey={reservationRefreshKey} />
          </>
        )}
      </main>

      <footer className="mt-8 border-t-4 border-[#007F8C] bg-[#001f36] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <strong className="text-lg">Centro Cultural Virla · UNT</strong>
            <p className="mt-1 text-sm text-slate-300">Arte, cultura y extensión universitaria en Tucumán.</p>
          </div>
          <div className="space-y-2 text-base text-slate-200">
            <p className="flex items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-[#62BCFF]" aria-hidden="true" />
              25 de Mayo 265, San Miguel de Tucumán
            </p>
            <a href="tel:+543814221692" className="flex items-center gap-2 hover:text-white">
              <Phone className="h-5 w-5 shrink-0 text-[#62BCFF]" aria-hidden="true" />
              (381) 422-1692
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
