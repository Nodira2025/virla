import React, { useState } from 'react';
import { VirlaProvider, useVirla } from './context/VirlaContext';
import { Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { CommunicationView } from './components/CommunicationView';
import { ExhibitionView } from './components/ExhibitionView';
import { TicketingView } from './components/TicketingView';
import { WeeklyPrintSheet } from './components/WeeklyPrintSheet';
import { ExtensionAlertsView } from './components/ExtensionAlertsView';
import { EventModal } from './components/EventModal';
import { EventDetailModal } from './components/EventDetailModal';
import { ROLE_CONFIGS } from './infrastructure/mockData';
import type { EventItem } from './domain/types';
import { Sparkles } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentRole } = useVirla();
  const [activeTab, setActiveTab] = useState('agenda');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [eventToEdit, setEventToEdit] = useState<EventItem | null>(null);

  const roleConfig = ROLE_CONFIGS[currentRole];

  const handleOpenNewEvent = () => {
    setEventToEdit(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: EventItem) => {
    setEventToEdit(event);
    setIsEventModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Navegación y selector de roles */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewEvent={handleOpenNewEvent}
      />

      {/* Banner Informativo del Rol Activo */}
      <section className="no-print bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Perspectiva activa:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${roleConfig.badge}`}>
              {roleConfig.title} ({roleConfig.personName})
            </span>
            <span className="text-slate-400 hidden md:inline">·</span>
            <span className="text-slate-600 hidden md:inline">{roleConfig.description}</span>
          </div>

          <div className="text-[11px] text-[#004a7f] bg-[#e8f1f7] px-2.5 py-1 rounded-md border border-[#c6dcee] font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-[#007F8C] shrink-0" />
            <span>Sistema Integral Virla · UNT</span>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'agenda' && (
          <CalendarView onSelectEvent={(evt) => setSelectedEvent(evt)} />
        )}

        {activeTab === 'comunicacion' && (
          <CommunicationView />
        )}

        {activeTab === 'muestras' && (
          <ExhibitionView />
        )}

        {activeTab === 'boleteria' && (
          <TicketingView />
        )}

        {activeTab === 'viernes' && (
          <WeeklyPrintSheet />
        )}

        {activeTab === 'extension-alerts' && (
          <ExtensionAlertsView />
        )}
      </main>

      {/* Pie de página institucional UNT */}
      <footer className="no-print bg-[#001f36] text-slate-300 text-xs border-t-4 border-[#007F8C] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">
            {/* Columna 1: Logo e Identidad */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl inline-flex">
                <img 
                  src="/logo-virla.png" 
                  alt="Centro Cultural Virla" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-slate-300 text-xs max-w-md leading-relaxed">
                El Centro Cultural Eugenio Flavio Virla es el epicentro del arte, el teatro, la música y las manifestaciones académicas y de extensión de la Universidad Nacional de Tucumán.
              </p>
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <div>📍 25 de Mayo 265, San Miguel de Tucumán (T4000)</div>
                <div>📞 Conmutador: +54 (381) 422-1692 · virla@unt.edu.ar</div>
              </div>
            </div>

            {/* Columna 2: Espacios Físicos */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3 text-[#62BCFF]">
                Espacios del Virla
              </h5>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li>• Sala de Teatro (300 butacas)</li>
                <li>• Sala de Muestras (Subsuelo)</li>
                <li>• Bar Cultural y Patio</li>
                <li>• Estudio Radio Universidad 94.7</li>
                <li>• Boletería y Hall Central</li>
              </ul>
            </div>

            {/* Columna 3: Enlaces Institucionales */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3 text-[#62BCFF]">
                Institucional UNT
              </h5>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li>
                  <a href="https://www.unt.edu.ar" target="_blank" rel="noreferrer" className="hover:text-white underline decoration-slate-500">
                    Portal Oficial UNT (unt.edu.ar)
                  </a>
                </li>
                <li>
                  <a href="https://www.unt.edu.ar" target="_blank" rel="noreferrer" className="hover:text-white">
                    Secretaría de Extensión Universitaria
                  </a>
                </li>
                <li>
                  <a href="https://medios.unt.edu.ar" target="_blank" rel="noreferrer" className="hover:text-white">
                    Medios UNT & Radio Universidad
                  </a>
                </li>
                <li>
                  <a href="https://www.unt.edu.ar" target="_blank" rel="noreferrer" className="hover:text-white">
                    Rectorado UNT - Ayacucho 491
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Barra inferior de copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div>
              © 2026 Universidad Nacional de Tucumán · Centro Cultural Ing. Eugenio Flavio Virla
            </div>
            <div>
              Sistema de Gestión y Agenda Integral del Espacio Cultural
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Creación / Edición */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
      />

      {/* Modal de Detalle / Ficha de Actividad */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(evt) => {
          setSelectedEvent(null);
          handleEditEvent(evt);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <VirlaProvider>
      <MainLayout />
    </VirlaProvider>
  );
}
