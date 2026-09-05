import React, { useState } from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES } from '../infrastructure/mockData';
import { 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ShieldAlert
} from 'lucide-react';

export const ExtensionAlertsView: React.FC = () => {
  const { events, acknowledgeExtensionEvent } = useVirla();
  const [directorNotes, setDirectorNotes] = useState<{ [id: string]: string }>({});

  const extensionEvents = events.filter(e => e.audit.isExtensionAgreement);
  const pendingEvents = extensionEvents.filter(e => !e.audit.acknowledgedByDirector);
  const acknowledgedEvents = extensionEvents.filter(e => e.audit.acknowledgedByDirector);

  const handleAcknowledge = (id: string) => {
    acknowledgeExtensionEvent(id, directorNotes[id] || '');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Panel de Alertas Extensión */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-bold">Módulo de Coordinación Institucional: Extensión vs Dirección</h2>
          </div>
          <p className="text-xs text-amber-100/80 max-w-2xl">
            Registra y alerta automáticamente cada vez que la <strong>Secretaría de Extensión Universitaria (Marcelo Mirkin)</strong> acuerda 
            o bloquea fechas en la agenda del Virla, garantizando trazabilidad total para que el Director del espacio esté al tanto y pueda dar su visto bueno.
          </p>
        </div>

        <div className="bg-amber-800/60 border border-amber-600/50 p-3 rounded-xl text-xs flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-300 shrink-0" />
          <div>
            <span className="text-amber-200 block text-[11px]">Fechas pendientes de visto bueno:</span>
            <span className="font-extrabold text-white text-base">
              {pendingEvents.length} {pendingEvents.length === 1 ? 'actividad' : 'actividades'}
            </span>
          </div>
        </div>
      </div>

      {/* Actividades Pendientes de Visto Bueno */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Fechas Acordadas por Extensión Pendientes de Aprobación ({pendingEvents.length})</span>
        </h3>

        {pendingEvents.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border border-slate-200 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <span>No hay fechas de Extensión pendientes de visto bueno. Todas están coordinadas con Dirección.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingEvents.map(event => {
              const space = VIRLA_SPACES.find(s => s.id === event.spaceId);

              return (
                <div 
                  key={event.id}
                  className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-xs relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Alerta de Coordinación
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                          {event.category}
                        </span>
                        <span className="text-xs text-slate-500">
                          Originado por: <strong className="text-slate-900">{event.audit.createdByName}</strong>
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">
                        {event.title}
                      </h4>

                      <p className="text-xs text-slate-600">
                        {event.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{space?.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(event.startDate).toLocaleDateString('es-AR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                            })} · {new Date(event.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} a {new Date(event.endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Dirección */}
                    <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3 min-w-[280px]">
                      <span className="text-xs font-bold text-amber-900 block">
                        Visto Bueno de Dirección:
                      </span>

                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">
                          Observación técnica o comentario para la fecha:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Aprobado. Coordinar sonido con técnica..."
                          value={directorNotes[event.id] ?? event.audit.directorNotes ?? ''}
                          onChange={(e) => setDirectorNotes({ ...directorNotes, [event.id]: e.target.value })}
                          className="w-full text-xs bg-white border border-amber-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <button
                        onClick={() => handleAcknowledge(event.id)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 rounded-lg shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Dar Visto Bueno / Notificado</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de Acuerdos de Extensión Aprobados */}
      {acknowledgedEvents.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fechas de Extensión con Visto Bueno de Dirección ({acknowledgedEvents.length})</span>
          </h3>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {acknowledgedEvents.map(event => (
              <div key={event.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{event.title}</span>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {new Date(event.startDate).toLocaleDateString('es-AR')} · Acordado por Marcelo Mirkin · Observación Dirección: {event.audit.directorNotes || 'Sin observaciones'}
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Auditado ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
