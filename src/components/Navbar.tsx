import React from 'react';
import { useVirla } from '../context/VirlaContext';
import { ROLE_CONFIGS } from '../infrastructure/mockData';
import type { UserRole } from '../domain/types';
import { 
  CalendarDays, 
  Megaphone, 
  Palette, 
  Ticket, 
  Printer, 
  BellRing, 
  PlusCircle, 
  RotateCcw,
  UserCheck,
  ExternalLink,
  Globe2
} from 'lucide-react';
import { ENTRADANET_BASE_URL } from '../infrastructure/entradanet';

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
      {/* 1. Barra Institucional Superior UNT */}
      <div className="bg-[#002f52] text-white text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="hidden font-bold tracking-wide sm:inline">UNIVERSIDAD NACIONAL DE TUCUMÁN</span>
            <span className="font-bold tracking-wide sm:hidden">UNT</span>
            <span className="text-white/40 hidden sm:inline">|</span>
            <span className="text-white/80 hidden sm:inline">Secretaría de Extensión Universitaria</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={ENTRADANET_BASE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir la agenda pública y entradas en EntradaNet (se abre en otra pestaña)"
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-bold text-white transition-colors hover:bg-white/20"
            >
              <Ticket className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Agenda pública y entradas</span>
              <span className="sm:hidden">Entradas</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <a 
              href="https://www.unt.edu.ar" 
              target="_blank" 
              rel="noreferrer" 
              className="hidden items-center gap-1 text-white/80 transition-colors hover:text-white md:flex"
            >
              <span>unt.edu.ar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Cabecera Principal con Logo Oficial del Virla */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Oficial Virla */}
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-3 group">
              <img 
                src="/logo-virla.png" 
                alt="Centro Cultural Virla - UNT" 
                className="h-14 w-auto object-contain transition-transform group-hover:scale-102"
              />
              <div className="hidden sm:block border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold tracking-widest text-[#007F8C] uppercase block">
                  Sistema de Agenda & Salas
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Gestión Cultural Universitaria
                </span>
              </div>
            </a>
          </div>

          {/* Selector de Rol y Acciones */}
          <div className="flex items-center gap-3">
            {/* Notificaciones Extensión vs Dirección */}
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
              <span className="hidden md:inline">Extensión vs Dirección</span>
              {extensionPendingCount > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {extensionPendingCount}
                </span>
              )}
            </button>

            {/* Selector de Rol Activo */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <UserCheck className="w-4 h-4 text-[#004a7f] ml-1" />
              <select
                id="role-select"
                value={currentRole}
                onChange={handleRoleChange}
                aria-label="Seleccionar rol de usuario activo"
                className="bg-white text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#007F8C] shadow-2xs"
              >
                {Object.values(ROLE_CONFIGS).map(role => (
                  <option key={role.id} value={role.id}>
                    {role.title} ({role.personName})
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Nueva Actividad */}
            <button
              onClick={onOpenNewEvent}
              className="flex items-center gap-2 bg-[#004a7f] hover:bg-[#003865] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Actividad</span>
            </button>

            {/* Botón Reiniciar Demo */}
            <button
              onClick={resetDemoData}
              title="Reiniciar datos de demo a valores iniciales"
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Franja Multicolor Institucional UNT (Firma visual de unt.edu.ar) */}
      <div className="grid grid-cols-5 h-1 w-full">
        <div className="bg-[#2A87AB]" />
        <div className="bg-[#47A2CC]" />
        <div className="bg-[#62BCFF]" />
        <div className="bg-[#3F82BC]" />
        <div className="bg-[#295B88]" />
      </div>

      {/* 4. Barra de Pestañas de Navegación por Módulo */}
      <div className="bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none text-xs font-semibold">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'agenda' 
                  ? 'bg-[#004a7f] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Agenda General
            </button>

            <button
              onClick={() => setActiveTab('entradanet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'entradanet'
                  ? 'bg-[#061f35] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Globe2 className="w-4 h-4" />
              Agenda pública · EntradaNet
            </button>

            <button
              onClick={() => setActiveTab('comunicacion')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'comunicacion' 
                  ? 'bg-[#007F8C] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Prensa & Comunicación (WhatsApp)
            </button>

            <button
              onClick={() => setActiveTab('muestras')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'muestras' 
                  ? 'bg-[#295B88] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Palette className="w-4 h-4" />
              Subsuelo Muestras (Montajes)
            </button>

            <button
              onClick={() => setActiveTab('boleteria')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'boleteria' 
                  ? 'bg-[#3F82BC] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Ticket className="w-4 h-4" />
              Boletería & EntradaNet
            </button>

            <button
              onClick={() => setActiveTab('viernes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'viernes' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Printer className="w-4 h-4" />
              Programación de los Viernes
            </button>

            <button
              onClick={() => setActiveTab('extension-alerts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === 'extension-alerts' 
                  ? 'bg-amber-800 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BellRing className="w-4 h-4" />
              Auditoría Extensión ({extensionPendingCount})
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
