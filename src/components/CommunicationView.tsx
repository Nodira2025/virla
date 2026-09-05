import React, { useState } from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES, CATEGORY_COLORS } from '../infrastructure/mockData';
import type { EventItem } from '../domain/types';
import { 
  Megaphone, 
  CheckSquare, 
  Square, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';

export const CommunicationView: React.FC = () => {
  const { events, updateCommunicationMaterial } = useVirla();
  const [filterMissingOnly, setFilterMissingOnly] = useState(true);

  // Generador de mensaje dinámico para WhatsApp
  const generateWhatsAppMessage = (event: EventItem) => {
    const missing: string[] = [];
    if (!event.communication.hasPhotos) missing.push('• Fotos en alta resolución para cartelera');
    if (!event.communication.hasPressRelease) missing.push('• Gacetilla de prensa o reseña de la obra/evento');
    if (!event.communication.hasLogo) missing.push('• Logo oficial de la compañía / organizador');
    if (!event.communication.hasSocialCopy) missing.push('• Texto / sinopsis para difusión en redes sociales');

    const dateFormatted = new Date(event.startDate).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
    });

    const intro = `¡Hola ${event.responsible.name}! Te escribimos desde el área de Prensa y Comunicación del Centro Cultural Eugenio Flavio Virla (UNT).\n\nCon respecto a la actividad "${event.title}" programada para el ${dateFormatted} en el Virla:\n\n`;

    if (missing.length === 0) {
      return encodeURIComponent(
        `${intro}¡Queríamos confirmarte que ya tenemos todo el material de difusión completo y aprobado para salir en gacetilla y redes! Cualquier novedad nos avisas.`
      );
    }

    const body = `Para poder avanzar con la difusión en medios, redes institucionales y cartelera, necesitamos que nos envíes lo antes posible el siguiente material:\n\n${missing.join('\n')}\n\n¿Nos lo podrías pasar por este medio o por mail a prensa.virla@unt.edu.ar? ¡Muchas gracias!`;

    return encodeURIComponent(intro + body);
  };

  const activeEvents = events
    .filter(e => e.state !== 'CANCELADO')
    .filter(e => {
      if (!filterMissingOnly) return true;
      const c = e.communication;
      return !c.hasPhotos || !c.hasPressRelease || !c.hasLogo || !c.hasSocialCopy;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo Prensa */}
      <div className="bg-gradient-to-r from-pink-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-5 h-5 text-pink-300" />
            <h2 className="text-lg font-bold">Módulo de Prensa y Comunicación</h2>
          </div>
          <p className="text-xs text-pink-100/80 max-w-2xl">
            Monitorea el material gráfico y gacetillas requeridas para cada actividad de la agenda. 
            Envía mensajes de WhatsApp automatizados al responsable de cada evento para solicitar insumos pendientes.
          </p>
        </div>

        {/* Toggle para ver sólo faltantes */}
        <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
          <label className="text-xs font-medium cursor-pointer flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={filterMissingOnly}
              onChange={(e) => setFilterMissingOnly(e.target.checked)}
              className="rounded text-pink-500 focus:ring-pink-400 w-4 h-4 cursor-pointer"
            />
            <span>Mostrar sólo con material pendiente</span>
          </label>
        </div>
      </div>

      {/* Listado de Actividades con Checklist y WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeEvents.map(event => {
          const space = VIRLA_SPACES.find(s => s.id === event.spaceId);
          const categoryMeta = CATEGORY_COLORS[event.category];
          const c = event.communication;
          const isComplete = c.hasPhotos && c.hasPressRelease && c.hasLogo && c.hasSocialCopy;
          const cleanPhone = event.responsible.phone.replace(/\D/g, '');
          const waLink = `https://wa.me/549${cleanPhone}?text=${generateWhatsAppMessage(event)}`;

          return (
            <div 
              key={event.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isComplete ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-pink-300'
              }`}
            >
              <div>
                {/* Cabecera de la ficha */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${categoryMeta.badge}`}>
                      {categoryMeta.label}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1.5 leading-snug">
                      {event.title}
                    </h3>
                  </div>

                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                    isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {isComplete ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completo</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Incompleto</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Info básica: Espacio y Fecha */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(event.startDate).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} hs
                    </span>
                  </div>
                  <span>•</span>
                  <span className="font-medium text-slate-700">{space?.shortName}</span>
                </div>

                {/* Checklist de Materiales */}
                <div className="space-y-2 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Checklist de Insumos:
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Fotos */}
                    <button
                      type="button"
                      onClick={() => updateCommunicationMaterial(event.id, { hasPhotos: !c.hasPhotos })}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        c.hasPhotos 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.hasPhotos ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">Fotos Alta Resolución</span>
                    </button>

                    {/* Gacetilla */}
                    <button
                      type="button"
                      onClick={() => updateCommunicationMaterial(event.id, { hasPressRelease: !c.hasPressRelease })}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        c.hasPressRelease 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.hasPressRelease ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">Gacetilla / Reseña</span>
                    </button>

                    {/* Logo */}
                    <button
                      type="button"
                      onClick={() => updateCommunicationMaterial(event.id, { hasLogo: !c.hasLogo })}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        c.hasLogo 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.hasLogo ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">Logo / Compañía</span>
                    </button>

                    {/* Copy para Redes */}
                    <button
                      type="button"
                      onClick={() => updateCommunicationMaterial(event.id, { hasSocialCopy: !c.hasSocialCopy })}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                        c.hasSocialCopy 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.hasSocialCopy ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">Copy para Redes</span>
                    </button>
                  </div>
                </div>

                {/* Notas de Prensa */}
                {c.notes && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 mb-4">
                    <span className="font-semibold text-slate-700 block mb-0.5">Nota interna:</span>
                    {c.notes}
                  </div>
                )}
              </div>

              {/* Pie con Responsable y Botón de WhatsApp */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{event.responsible.name}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {event.responsible.organization} · Tel: {event.responsible.phone}
                  </div>
                </div>

                {/* Botón WhatsApp */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-2xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Pedir Insumos por WhatsApp</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
