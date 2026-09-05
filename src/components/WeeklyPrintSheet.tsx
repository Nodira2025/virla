import React, { useState } from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES, CONTRACT_LABELS } from '../infrastructure/mockData';
import { 
  Printer, 
  Send, 
  CheckCircle2, 
  Building2
} from 'lucide-react';

export const WeeklyPrintSheet: React.FC = () => {
  const { events } = useVirla();
  const [sentBroadcast, setSentBroadcast] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleBroadcast = () => {
    setSentBroadcast(true);
    setTimeout(() => setSentBroadcast(false), 4000);
  };

  // Ordenar por fecha cronológica
  const sortedEvents = [...events]
    .filter(e => e.state !== 'CANCELADO')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="space-y-6">
      {/* Controles de la Hoja de los Viernes (Oculto al imprimir) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-base">
              Programación Semanal Institucional (Rutina de los Viernes)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Esta hoja resume todas las actividades de la semana para el personal de Recepción, Maestranza, 
            Técnica, Seguridad y Administración. Al imprimir, se adapta automáticamente a formato A4 sin cabeceras web.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón de difusión digital a empleados */}
          <button
            onClick={handleBroadcast}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-300 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            <span>Enviar Resumen Digital a Trabajadores</span>
          </button>

          {/* Botón Imprimir */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Hoja Semanal</span>
          </button>
        </div>
      </div>

      {sentBroadcast && (
        <div className="no-print bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>¡Resumen enviado con éxito!</strong> Se notificó por WhatsApp/Email al personal de Recepción, Técnica, Sonido y Seguridad con el cronograma semanal.
          </span>
        </div>
      )}

      {/* PLANILLA SEMANAL IMPRIMIBLE (Optimizada para papel y pantalla) */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none">
        {/* Encabezado Oficial Institucional */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-slate-900" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                Centro Cultural Eugenio Flavio Virla
              </h1>
              <p className="text-xs text-slate-600 font-semibold tracking-wider uppercase">
                Universidad Nacional de Tucumán · Secretaría de Extensión Universitaria
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 block uppercase">
              Programación Semanal de Actividades
            </span>
            <span className="text-[11px] text-slate-500">
              Emitido el viernes {new Date().toLocaleDateString('es-AR')}
            </span>
          </div>
        </div>

        {/* Tabla estructurada de actividades */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 border-y border-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Día & Horario</th>
                <th className="py-2.5 px-3">Espacio / Sala</th>
                <th className="py-2.5 px-3">Actividad / Evento</th>
                <th className="py-2.5 px-3">Tipo & Contrato</th>
                <th className="py-2.5 px-3">Responsable</th>
                <th className="py-2.5 px-3">Condición / Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {sortedEvents.map(event => {
                const space = VIRLA_SPACES.find(s => s.id === event.spaceId);
                const startDate = new Date(event.startDate);
                const endDate = new Date(event.endDate);

                return (
                  <tr key={event.id} className="hover:bg-slate-50/80">
                    {/* Día & Horario */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium">
                      <div className="font-bold text-slate-900">
                        {startDate.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {startDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} a {endDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                      </div>
                    </td>

                    {/* Espacio */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <span className="bg-slate-100 print:border print:border-slate-300 px-2 py-0.5 rounded text-[11px]">
                        {space?.shortName}
                      </span>
                    </td>

                    {/* Actividad */}
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-bold text-slate-900 text-xs">
                        {event.title}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {event.description}
                      </div>
                    </td>

                    {/* Tipo & Contrato */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {event.category}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {CONTRACT_LABELS[event.contractType]}
                      </div>
                    </td>

                    {/* Responsable */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{event.responsible.name}</div>
                      <div className="text-[10px] text-slate-500">{event.responsible.phone}</div>
                    </td>

                    {/* Entradas */}
                    <td className="py-3 px-3">
                      {event.ticketing.isFree ? (
                        <span className="text-[11px] font-bold text-emerald-800">Gratuita</span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-900">
                          ${event.ticketing.priceGeneral?.toLocaleString('es-AR')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pie de página institucional para la copia impresa */}
        <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 flex items-center justify-between">
          <div>
            <span>Distribución interna: Recepción · Mesa de Entradas · Técnica & Sonido · Maestranza · Seguridad · Dirección</span>
          </div>
          <div>
            <span>Página 1 de 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
