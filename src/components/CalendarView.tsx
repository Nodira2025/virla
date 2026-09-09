import React, { useState } from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES, CATEGORY_COLORS, STATE_LABELS, CONTRACT_LABELS } from '../infrastructure/mockData';
import type { ActivityCategory, EventItem, EventState } from '../domain/types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  Filter, 
  AlertTriangle, 
  Eye, 
  Phone,
  ExternalLink
} from 'lucide-react';
import { isEntradanetUrl } from '../infrastructure/entradanet';

interface CalendarViewProps {
  onSelectEvent: (event: EventItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onSelectEvent }) => {
  const { 
    events, 
    selectedSpaceFilter, 
    setSelectedSpaceFilter, 
    selectedCategoryFilter, 
    setSelectedCategoryFilter
  } = useVirla();

  const [stateFilter, setStateFilter] = useState<EventState | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado reactivo de eventos
  const filteredEvents = events.filter(evt => {
    if (selectedSpaceFilter !== 'ALL' && evt.spaceId !== selectedSpaceFilter) return false;
    if (selectedCategoryFilter !== 'ALL' && evt.category !== selectedCategoryFilter) return false;
    if (stateFilter !== 'ALL' && evt.state !== stateFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchResp = evt.responsible.name.toLowerCase().includes(q) || evt.responsible.organization.toLowerCase().includes(q);
      if (!matchTitle && !matchResp) return false;
    }
    return true;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }),
      time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros por Espacios del Virla */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtrar por Espacio:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => setSelectedSpaceFilter('ALL')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedSpaceFilter === 'ALL'
                    ? 'bg-[#004a7f] text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos los Espacios ({events.length})
              </button>
              {VIRLA_SPACES.map(space => {
                const count = events.filter(e => e.spaceId === space.id).length;
                const isSelected = selectedSpaceFilter === space.id;
                return (
                  <button
                    key={space.id}
                    onClick={() => setSelectedSpaceFilter(space.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#002f52] text-white shadow-xs font-semibold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{space.shortName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buscador Rápido */}
          <div className="min-w-[220px]">
            <input
              type="text"
              placeholder="Buscar por actividad o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#007F8C] bg-white"
            />
          </div>
        </div>

        {/* Filtros secundarios: Categoría & Estado del Trámite */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-500">Categoría:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value as ActivityCategory | 'ALL')}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Todas las actividades</option>
              {Object.entries(CATEGORY_COLORS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>

            <span className="font-medium text-slate-500 ml-2">Estado del Trámite:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as EventState | 'ALL')}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Cualquier estado</option>
              {Object.entries(STATE_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          <div className="text-slate-400 text-xs">
            Mostrando <strong className="text-slate-700">{filteredEvents.length}</strong> actividades en agenda
          </div>
        </div>
      </div>

      {/* Tarjetas de la Agenda */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No hay actividades para los filtros seleccionados</h3>
          <p className="text-xs text-slate-500 mt-1">Prueba cambiando de espacio físico o restableciendo la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const space = VIRLA_SPACES.find(s => s.id === event.spaceId);
            const categoryMeta = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.TEATRO;
            const stateMeta = STATE_LABELS[event.state];
            const start = formatDateTime(event.startDate);
            const end = formatDateTime(event.endDate);

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={`bg-white rounded-xl border border-slate-200 hover:border-[#007F8C] hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                  event.audit.isExtensionAgreement && !event.audit.acknowledgedByDirector
                    ? 'ring-2 ring-amber-400'
                    : ''
                }`}
              >
                {/* Cabecera con Categoría y Estado */}
                <div>
                  <div className="h-2 w-full" style={{ backgroundColor: categoryMeta.badge.includes('emerald') ? '#10b981' : categoryMeta.badge.includes('blue') ? '#2563eb' : categoryMeta.badge.includes('indigo') ? '#4f46e5' : categoryMeta.badge.includes('fuchsia') ? '#c026d3' : categoryMeta.badge.includes('cyan') ? '#0891b2' : '#d97706' }} />
                  
                  <div className="p-4 space-y-3">
                    {/* Metadatos superiores */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${categoryMeta.badge}`}>
                        {categoryMeta.label}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${stateMeta.badge}`}>
                        {stateMeta.label}
                      </span>
                    </div>

                    {/* Alerta si es acuerdo de Extensión no visto por Dirección */}
                    {event.audit.isExtensionAgreement && !event.audit.acknowledgedByDirector && (
                      <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-medium">Acordado por Extensión (Marcelo Mirkin). Pendiente de visto bueno de Dirección.</span>
                      </div>
                    )}

                    {/* Título de la actividad */}
                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {event.title}
                    </h4>

                    {/* Espacio físico asignado */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                        {space?.name || 'Espacio no asignado'}
                      </span>
                    </div>

                    {/* Fecha y Horario */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-[#007F8C] shrink-0" />
                      <span className="font-semibold text-slate-900 capitalize">{start.date}</span>
                      <span>·</span>
                      <span>{start.time} a {end.time} hs</span>
                    </div>

                    {/* Tipo de Contrato */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{CONTRACT_LABELS[event.contractType]}</span>
                    </div>

                    {/* Responsable / Contacto */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium truncate max-w-[150px]">{event.responsible.name}</span>
                      </div>
                      <a
                        href={`https://wa.me/549${event.responsible.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                        title="Enviar WhatsApp"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span className="text-[11px]">WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Pie de tarjeta con acciones rápidas de cambio de estado */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {event.communication.hasPhotos && event.communication.hasPressRelease ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium" title="Material de prensa recibido">
                        ✓ Prensa OK
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium" title="Falta material de prensa">
                        ! Falta Prensa
                      </span>
                    )}

                    {event.ticketing.isPublishedOnWeb && isEntradanetUrl(event.ticketing.ticketLink) ? (
                      <a
                        href={event.ticketing.ticketLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 hover:bg-blue-200"
                        title="Ver publicación en EntradaNet"
                        aria-label={`Ver ${event.title} en EntradaNet (se abre en otra pestaña)`}
                      >
                        ✓ EntradaNet
                        <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                      </a>
                    ) : event.ticketing.isPublishedOnWeb ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800" title="Publicado sin enlace de EntradaNet">
                        ! Falta enlace
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded font-medium" title="No publicado en EntradaNet">
                        EntradaNet pendiente
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    className="text-[#004a7f] hover:text-[#002f52] font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
