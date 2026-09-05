import React from 'react';
import { useVirla } from '../context/VirlaContext';
import { 
  Palette, 
  Hammer, 
  Calendar, 
  User, 
  Sparkles, 
  PackageOpen
} from 'lucide-react';

export const ExhibitionView: React.FC = () => {
  const { events } = useVirla();

  // Filtrar eventos de muestras y los que ocupan el subsuelo
  const exhibitionEvents = events.filter(
    e => e.spaceId === 'subsuelo-muestras' || e.category === 'MUESTRA' || e.exhibition.isExhibition
  );

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo de Muestras */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-5 h-5 text-indigo-300" />
              <h2 className="text-lg font-bold">Gestión de Muestras & Exposiciones (Subsuelo)</h2>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-2xl">
              Panel exclusivo para el Encargado y Curador de Artes Visuales. 
              Permite coordinar el cronograma técnico: días de montaje, inauguración (vernissage), visitas y desmontaje para evitar superposiciones en el Subsuelo.
            </p>
          </div>

          <div className="bg-indigo-800/50 border border-indigo-700/50 p-3 rounded-xl text-xs">
            <span className="text-indigo-300 font-semibold block">Espacio asignado:</span>
            <span className="font-bold text-white text-sm">Sala de Muestras - Subsuelo</span>
          </div>
        </div>
      </div>

      {/* Lista de Exposiciones con su línea de tiempo operativa */}
      <div className="space-y-4">
        {exhibitionEvents.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border border-slate-200">
            <Palette className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No hay muestras programadas actualmente</p>
          </div>
        ) : (
          exhibitionEvents.map(event => {
            const ex = event.exhibition;
            const hasMounting = ex.mountingStart && ex.mountingEnd;

            return (
              <div 
                key={event.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all"
              >
                {/* Título y Estado */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                        Exposición Plástica
                      </span>
                      <span className="text-xs text-slate-500">
                        Curador: <strong className="text-slate-800">{ex.curator || 'A designar'}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {event.state}
                    </span>
                  </div>
                </div>

                {/* Línea de tiempo operativa: Montaje -> Vernissage -> Exposición -> Desmontaje */}
                <div className="mt-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                    Cronograma de Ocupación del Subsuelo:
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* 1. Días de Montaje */}
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 relative overflow-hidden">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1.5">
                        <Hammer className="w-4 h-4 text-amber-700" />
                        <span>1. Montaje de Obras</span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 mb-2">
                        Sala cerrada al público. Ingreso de artistas, iluminación y curaduría.
                      </p>
                      <div className="text-xs font-bold text-amber-950 bg-amber-100/80 px-2 py-1 rounded border border-amber-200 inline-block">
                        {hasMounting ? (
                          `${ex.mountingStart} al ${ex.mountingEnd}`
                        ) : (
                          'Sin definir'
                        )}
                      </div>
                    </div>

                    {/* 2. Inauguración / Vernissage */}
                    <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 relative overflow-hidden">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-700" />
                        <span>2. Vernissage (Inauguración)</span>
                      </div>
                      <p className="text-[11px] text-indigo-800/80 mb-2">
                        Apertura oficial, brindis y recepción de invitados y prensa.
                      </p>
                      <div className="text-xs font-bold text-indigo-950 bg-indigo-100/80 px-2 py-1 rounded border border-indigo-200 inline-block">
                        {ex.vernissage ? (
                          new Date(ex.vernissage).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) + ' hs'
                        ) : (
                          'Sin fecha'
                        )}
                      </div>
                    </div>

                    {/* 3. Período de Exhibición Abierta */}
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 relative overflow-hidden">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1.5">
                        <Calendar className="w-4 h-4 text-emerald-700" />
                        <span>3. Muestra Abierta</span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 mb-2">
                        Visitas de público y escuelas (Lun a Vie 9 a 13 y 17 a 21 hs).
                      </p>
                      <div className="text-xs font-bold text-emerald-950 bg-emerald-100/80 px-2 py-1 rounded border border-emerald-200 inline-block">
                        {new Date(event.startDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} al {new Date(event.endDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>

                    {/* 4. Desmontaje */}
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 relative overflow-hidden">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1.5">
                        <PackageOpen className="w-4 h-4 text-slate-700" />
                        <span>4. Desmontaje</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-2">
                        Retiro de obras, embalaje y acondicionamiento de sala.
                      </p>
                      <div className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                        {ex.unmountingDate || 'Día posterior a cierre'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datos del Artista / Colectivo */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Responsable: <strong className="text-slate-800">{event.responsible.name}</strong> ({event.responsible.organization})</span>
                  </div>
                  <div>
                    <span>Contacto: </span>
                    <a href={`tel:${event.responsible.phone}`} className="text-indigo-600 font-medium hover:underline">
                      {event.responsible.phone}
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
