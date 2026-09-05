import React from 'react';
import { useVirla } from '../context/VirlaContext';
import { ROLE_CONFIGS } from '../infrastructure/mockData';
import type { UserRole } from '../domain/types';
import { 
  Building2, 
  CalendarDays, 
  Megaphone, 
  Palette, 
  Ticket, 
  Printer, 
  BellRing, 
  PlusCircle, 
  RotateCcw,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewEvent: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenNewEvent }) => {
  const { currentRole, setCurrentRole, extensionPendingCount, resetDemoData } = useVirla();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentRole(e.target.value as UserRole);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
      {/* Barra superior de identidad y rol */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-900 flex items-center justify-center text-white shadow-sm font-bold tracking-wider">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">VIRLA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                  UNT Extensión
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Centro Cultural Eugenio Flavio Virla</p>
            </div>
          </div>

          {/* Selector de Rol & Acciones Rápidas */}
          <div className="flex items-center gap-4">
            {/* Notificación de Extensión para Dirección */}
            <button
              onClick={() => setActiveTab('extension-alerts')}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                extensionPendingCount > 0 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Alertas de fechas acordadas por Extensión (Marcelo Mirkin)"
            >
              <BellRing className="w-4 h-4 text-amber-700" />
              <span>Extensión vs Dirección</span>
              {extensionPendingCount > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {extensionPendingCount}
                </span>
              )}
            </button>

            {/* Selector de Rol Activo */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <UserCheck className="w-4 h-4 text-slate-500 ml-1.5" />
              <label htmlFor="role-select" className="text-xs font-medium text-slate-500 hidden md:inline">
                Rol activo:
              </label>
              <select
                id="role-select"
                value={currentRole}
                onChange={handleRoleChange}
                className="bg-white text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                {Object.values(ROLE_CONFIGS).map(role => (
                  <option key={role.id} value={role.id}>
                    {role.title} ({role.personName})
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Nuevo Evento */}
            <button
              onClick={onOpenNewEvent}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Actividad</span>
            </button>

            {/* Reiniciar Demo */}
            <button
              onClick={resetDemoData}
              title="Reiniciar datos de la demo a valores por defecto"
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de pestañas por área */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none text-xs font-medium">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'agenda' 
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              Agenda General
            </button>

            <button
              onClick={() => setActiveTab('comunicacion')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'comunicacion' 
                  ? 'bg-white text-pink-700 shadow-2xs font-semibold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Megaphone className="w-4 h-4 text-pink-600" />
              Prensa & Comunicación (WhatsApp)
            </button>

            <button
              onClick={() => setActiveTab('muestras')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'muestras' 
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Palette className="w-4 h-4 text-indigo-600" />
              Subsuelo Muestras (Montajes)
            </button>

            <button
              onClick={() => setActiveTab('boleteria')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'boleteria' 
                  ? 'bg-white text-teal-700 shadow-2xs font-semibold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Ticket className="w-4 h-4 text-teal-600" />
              Boletería & Web
            </button>

            <button
              onClick={() => setActiveTab('viernes')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'viernes' 
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Programación de los Viernes (Imprimir)
            </button>

            <button
              onClick={() => setActiveTab('extension-alerts')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'extension-alerts' 
                  ? 'bg-white text-amber-800 shadow-2xs font-semibold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BellRing className="w-4 h-4 text-amber-600" />
              Auditoría Extensión ({extensionPendingCount})
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
