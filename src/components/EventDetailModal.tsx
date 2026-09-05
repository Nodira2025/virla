import React from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES, CATEGORY_COLORS, STATE_LABELS, CONTRACT_LABELS } from '../infrastructure/mockData';
import type { EventItem, EventState } from '../domain/types';
import { 
  X, 
  MapPin, 
  Clock, 
  FileText, 
  Edit3, 
  Trash2, 
  MessageCircle
} from 'lucide-react';

interface EventDetailModalProps {
  event: EventItem | null;
  onClose: () => void;
  onEdit: (event: EventItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onEdit }) => {
  const { updateEvent, deleteEvent } = useVirla();

  if (!event) return null;

  const space = VIRLA_SPACES.find(s => s.id === event.spaceId);
  const categoryMeta = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.TEATRO;
  const stateMeta = STATE_LABELS[event.state];
  const c = event.communication;
  const cleanPhone = event.responsible.phone.replace(/\D/g, '');

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de que deseas eliminar la actividad "${event.title}" de la agenda?`)) {
      deleteEvent(event.id);
      onClose();
    }
  };

  const handleStateChange = (newState: EventState) => {
    updateEvent(event.id, { state: newState });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
        {/* Cabecera con banner de categoría */}
        <div className="p-6 bg-slate-900 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${categoryMeta.badge}`}>
              {categoryMeta.label}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${stateMeta.badge}`}>
              {stateMeta.label}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white leading-tight">
            {event.title}
          </h2>

          <p className="text-xs text-slate-300 mt-1">
            {event.description}
          </p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Horario y Espacio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                Espacio Asignado:
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{space?.name}</span>
              </div>
              <span className="text-slate-500 text-[11px] block">{space?.description}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                Fecha y Horario:
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {new Date(event.startDate).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </span>
              </div>
              <span className="text-slate-500 text-[11px] block">
                {new Date(event.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} a {new Date(event.endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
              </span>
            </div>
          </div>

          {/* Estado de Contrato */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
              Contrato y Trámite:
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800">{CONTRACT_LABELS[event.contractType]}</span>
              </div>
              
              {/* Selector de transición de estado */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Cambiar estado:</span>
                <select
                  value={event.state}
                  onChange={(e) => handleStateChange(e.target.value as EventState)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-semibold focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.entries(STATE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Responsable & WhatsApp */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                Contacto del Responsable:
              </span>
              <div className="font-bold text-slate-900 text-sm">{event.responsible.name}</div>
              <div className="text-slate-600">{event.responsible.organization}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Tel: {event.responsible.phone} {event.responsible.email ? `· ${event.responsible.email}` : ''}
              </div>
            </div>

            <a
              href={`https://wa.me/549${cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </a>
          </div>

          {/* Información para Prensa y Boletería */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                Material de Comunicación:
              </span>
              <ul className="space-y-1 text-slate-700">
                <li>{c.hasPhotos ? '✓' : '✗'} Fotos alta resolución</li>
                <li>{c.hasPressRelease ? '✓' : '✗'} Gacetilla de prensa</li>
                <li>{c.hasLogo ? '✓' : '✗'} Logo oficial</li>
                <li>{c.hasSocialCopy ? '✓' : '✗'} Copy para redes</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                Boletería & Entradas:
              </span>
              {event.ticketing.isFree ? (
                <p className="font-bold text-emerald-700">Entrada Libre y Gratuita</p>
              ) : (
                <p className="font-bold text-slate-900">
                  General: ${event.ticketing.priceGeneral?.toLocaleString('es-AR')}
                </p>
              )}
              <p className="text-slate-500 text-[11px]">{event.ticketing.saleConditions}</p>
              <div className="pt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.ticketing.isPublishedOnWeb ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                  {event.ticketing.isPublishedOnWeb ? 'Publicado en Web' : 'No publicado en Web'}
                </span>
              </div>
            </div>
          </div>

          {/* Auditoría / Trazabilidad */}
          <div className="bg-slate-100/70 p-3 rounded-lg text-slate-500 text-[11px] space-y-0.5">
            <div><strong>Cargado por:</strong> {event.audit.createdByName}</div>
            <div><strong>Fecha de carga:</strong> {new Date(event.audit.createdAt).toLocaleString('es-AR')}</div>
            {event.audit.isExtensionAgreement && (
              <div className="text-amber-800 font-semibold">
                Actividad originada por Secretaría de Extensión. {event.audit.acknowledgedByDirector ? '✓ Con visto bueno de Dirección.' : '⚠️ Pendiente de visado de Dirección.'}
              </div>
            )}
          </div>

          {/* Acciones de Edición y Borrado */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Actividad</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  onClose();
                  onEdit(event);
                }}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Datos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
