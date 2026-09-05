import React, { useState } from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES, CONTRACT_LABELS } from '../infrastructure/mockData';
import type { EventItem } from '../domain/types';
import { 
  Ticket, 
  Globe, 
  FileCheck2, 
  Save
} from 'lucide-react';

export const TicketingView: React.FC = () => {
  const { events, updateTicketing } = useVirla();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    isFree: boolean;
    priceGeneral: number;
    priceStudentDiscount: number;
    saleConditions: string;
    isPublishedOnWeb: boolean;
    ticketLink: string;
  }>({
    isFree: false,
    priceGeneral: 0,
    priceStudentDiscount: 0,
    saleConditions: '',
    isPublishedOnWeb: false,
    ticketLink: '',
  });

  const handleStartEdit = (event: EventItem) => {
    setEditingEventId(event.id);
    setFormState({
      isFree: event.ticketing.isFree,
      priceGeneral: event.ticketing.priceGeneral || 0,
      priceStudentDiscount: event.ticketing.priceStudentDiscount || 0,
      saleConditions: event.ticketing.saleConditions || '',
      isPublishedOnWeb: event.ticketing.isPublishedOnWeb,
      ticketLink: event.ticketing.ticketLink || '',
    });
  };

  const handleSave = (eventId: string) => {
    updateTicketing(eventId, formState);
    setEditingEventId(null);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Boletería & Web */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-teal-300" />
            <h2 className="text-lg font-bold">Módulo de Boletería, Tarifas y Publicación Web</h2>
          </div>
          <p className="text-xs text-teal-100/80 max-w-2xl">
            Gestiona los precios de las entradas, promociones para la comunidad universitaria/jubilados, 
            condiciones de venta por taquilla y el estado de publicación en el portal web oficial del Virla.
          </p>
        </div>
      </div>

      {/* Listado de actividades y configuración de entradas */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Actividades Programadas ({events.length})
          </h3>
          <span className="text-xs text-slate-500">
            Comodín de Taquilla & Carga Web
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {events.map(event => {
            const space = VIRLA_SPACES.find(s => s.id === event.spaceId);
            const isEditing = editingEventId === event.id;
            const t = event.ticketing;

            return (
              <div key={event.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info del Evento */}
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {space?.shortName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(event.startDate).toLocaleDateString('es-AR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })} · {new Date(event.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">
                      {event.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{CONTRACT_LABELS[event.contractType]}</span>
                      <span>•</span>
                      <span>Responsable: {event.responsible.name}</span>
                    </div>
                  </div>

                  {/* Estado de Tarifas & Web */}
                  {!isEditing ? (
                    <div className="flex flex-wrap items-center gap-6">
                      {/* Tarifas actuales */}
                      <div className="text-xs">
                        <span className="text-slate-400 font-medium block mb-0.5">Tarifa:</span>
                        {t.isFree ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                            Entrada Gratuita
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-sm">
                              ${t.priceGeneral?.toLocaleString('es-AR')}
                            </span>
                            {t.priceStudentDiscount ? (
                              <span className="text-slate-500 block text-[11px]">
                                Descuento UNT: ${t.priceStudentDiscount?.toLocaleString('es-AR')}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Estado Web */}
                      <div className="text-xs">
                        <span className="text-slate-400 font-medium block mb-0.5">Portal Web:</span>
                        {t.isPublishedOnWeb ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                            <Globe className="w-3 h-3" />
                            Publicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-200 font-medium px-2 py-0.5 rounded-full text-[11px]">
                            No Publicado
                          </span>
                        )}
                      </div>

                      {/* Botón Editar */}
                      <button
                        onClick={() => handleStartEdit(event)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
                      >
                        Configurar
                      </button>
                    </div>
                  ) : (
                    /* Formulario de Edición Rápida */
                    <div className="w-full lg:max-w-xl bg-slate-50 p-4 rounded-xl border border-teal-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-900">Editar Tarifas y Web:</span>
                        <label className="text-xs font-medium flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formState.isFree}
                            onChange={(e) => setFormState(prev => ({ ...prev, isFree: e.target.checked }))}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>Entrada Libre y Gratuita</span>
                        </label>
                      </div>

                      {!formState.isFree && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-600 font-medium mb-1">Precio General ($):</label>
                            <input
                              type="number"
                              value={formState.priceGeneral}
                              onChange={(e) => setFormState(prev => ({ ...prev, priceGeneral: Number(e.target.value) }))}
                              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-600 font-medium mb-1">Estudiantes / Jubilados ($):</label>
                            <input
                              type="number"
                              value={formState.priceStudentDiscount}
                              onChange={(e) => setFormState(prev => ({ ...prev, priceStudentDiscount: Number(e.target.value) }))}
                              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-xs">
                        <label className="block text-slate-600 font-medium mb-1">Condiciones de venta:</label>
                        <input
                          type="text"
                          value={formState.saleConditions}
                          onChange={(e) => setFormState(prev => ({ ...prev, saleConditions: e.target.value }))}
                          placeholder="Ej: Boletería de Lun a Vie de 18 a 21 hs..."
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <label className="text-xs font-semibold flex items-center gap-2 cursor-pointer text-slate-800">
                          <input
                            type="checkbox"
                            checked={formState.isPublishedOnWeb}
                            onChange={(e) => setFormState(prev => ({ ...prev, isPublishedOnWeb: e.target.checked }))}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <Globe className="w-3.5 h-3.5 text-teal-700" />
                          <span>Publicar en la Web del Virla</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingEventId(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSave(event.id)}
                            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
