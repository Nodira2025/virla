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
import { Sparkles, Building2 } from 'lucide-react';

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

          <div className="text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 font-medium flex items-center gap-1.5 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Simulador de Roles del Virla Activo</span>
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

      {/* Pie de página institucional */}
      <footer className="no-print bg-slate-900 text-slate-400 py-6 text-xs border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white">Centro Cultural Eugenio Flavio Virla</span>
            <span>— Secretaría de Extensión Universitaria (UNT)</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Demo de Arquitectura de Software · Tucumán, Argentina
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
