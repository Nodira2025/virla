import React, { useState, useEffect } from 'react';
import { useVirla } from '../context/VirlaContext';
import { VIRLA_SPACES, CATEGORY_COLORS, STATE_LABELS, CONTRACT_LABELS } from '../infrastructure/mockData';
import type { 
  SpaceId, 
  ActivityCategory, 
  EventState, 
  ContractType, 
  EventItem 
} from '../domain/types';
import { 
  X, 
  AlertTriangle, 
  Calendar, 
  Palette
} from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventItem | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, eventToEdit }) => {
  const { addEvent, updateEvent, checkSpaceConflict, currentRole } = useVirla();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spaceId, setSpaceId] = useState<SpaceId>('teatro-300');
  const [category, setCategory] = useState<ActivityCategory>('TEATRO');
  const [state, setState] = useState<EventState>('RESERVA_PROVISORIA');
  const [contractType, setContractType] = useState<ContractType>('ALQUILER_SALA');
  const [startDate, setStartDate] = useState('2026-09-18T20:00');
  const [endDate, setEndDate] = useState('2026-09-18T22:30');
  
  // Responsable
  const [respName, setRespName] = useState('');
  const [respPhone, setRespPhone] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respOrg, setRespOrg] = useState('');

  // Muestras (subsuelo)
  const [isExhibition, setIsExhibition] = useState(false);
  const [mountingStart, setMountingStart] = useState('');
  const [mountingEnd, setMountingEnd] = useState('');
  const [vernissage, setVernissage] = useState('');
  const [curator, setCurator] = useState('');

  // Validación de conflicto en tiempo real
  const [conflict, setConflict] = useState<EventItem | null>(null);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description);
      setSpaceId(eventToEdit.spaceId);
      setCategory(eventToEdit.category);
      setState(eventToEdit.state);
      setContractType(eventToEdit.contractType);
      setStartDate(eventToEdit.startDate);
      setEndDate(eventToEdit.endDate);
      setRespName(eventToEdit.responsible.name);
      setRespPhone(eventToEdit.responsible.phone);
      setRespEmail(eventToEdit.responsible.email);
      setRespOrg(eventToEdit.responsible.organization);
      setIsExhibition(eventToEdit.exhibition.isExhibition);
      setMountingStart(eventToEdit.exhibition.mountingStart || '');
      setMountingEnd(eventToEdit.exhibition.mountingEnd || '');
      setVernissage(eventToEdit.exhibition.vernissage || '');
      setCurator(eventToEdit.exhibition.curator || '');
    } else {
      // Valores por defecto
      setTitle('');
      setDescription('');
      setSpaceId('teatro-300');
      setCategory('TEATRO');
      setState('RESERVA_PROVISORIA');
      setContractType('ALQUILER_SALA');
      setStartDate('2026-09-18T20:00');
      setEndDate('2026-09-18T22:30');
      setRespName('');
      setRespPhone('');
      setRespEmail('');
      setRespOrg('');
      setIsExhibition(false);
      setMountingStart('');
      setMountingEnd('');
      setVernissage('');
      setCurator('');
    }
  }, [eventToEdit, isOpen]);

  // Verificar conflicto cada vez que cambia sala o fecha
  useEffect(() => {
    if (!startDate || !endDate) return;
    const existingConflict = checkSpaceConflict(
      spaceId, 
      startDate, 
      endDate, 
      eventToEdit ? eventToEdit.id : undefined
    );
    setConflict(existingConflict);
  }, [spaceId, startDate, endDate, eventToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (conflict) {
      alert(`No se puede guardar: hay conflicto de horario en ${spaceId} con la actividad "${conflict.title}".`);
      return;
    }

    if (eventToEdit) {
      updateEvent(eventToEdit.id, {
        title,
        description,
        spaceId,
        category,
        state,
        contractType,
        startDate,
        endDate,
        responsible: {
          name: respName,
          phone: respPhone,
          email: respEmail,
          organization: respOrg,
        },
        exhibition: {
          isExhibition: isExhibition || category === 'MUESTRA' || spaceId === 'subsuelo-muestras',
          mountingStart,
          mountingEnd,
          vernissage,
          curator,
        },
      });
    } else {
      addEvent({
        title,
        description,
        spaceId,
        category,
        state,
        contractType,
        startDate,
        endDate,
        responsible: {
          name: respName,
          phone: respPhone,
          email: respEmail,
          organization: respOrg,
        },
        communication: {
          hasPhotos: false,
          hasPressRelease: false,
          hasLogo: false,
          hasSocialCopy: false,
          notes: 'Pendiente de solicitud inicial de material.',
        },
        exhibition: {
          isExhibition: isExhibition || category === 'MUESTRA' || spaceId === 'subsuelo-muestras',
          mountingStart,
          mountingEnd,
          vernissage,
          curator,
        },
        ticketing: {
          isFree: contractType === 'ALQUILER_SIN_COSTO' || category === 'UNIVERSITARIO',
          saleConditions: 'A definir en boletería.',
          isPublishedOnWeb: false,
        },
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fade-in">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">
              {eventToEdit ? 'Editar Actividad de Agenda' : 'Registrar Nueva Actividad en el Virla'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Rol Creando */}
        {currentRole === 'EXTENSION' && !eventToEdit && (
          <div className="bg-blue-50 px-6 py-2.5 border-b border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <span className="font-bold">Modo Extensión:</span>
            <span>Esta fecha se registrará a nombre de Marcelo Mirkin y enviará una alerta automática a Dirección.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Conflicto de Espacio */}
          {conflict && (
            <div className="bg-rose-50 border-2 border-rose-400 p-3.5 rounded-xl text-rose-900 flex items-start gap-2.5 animate-bounce-short">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold">¡Conflicto de Horario Detectado!</strong>
                <p className="mt-0.5">
                  El espacio seleccionado ya está ocupado en ese horario por: <strong>"{conflict.title}"</strong> ({new Date(conflict.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} a {new Date(conflict.endDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs).
                </p>
              </div>
            </div>
          )}

          {/* Título y Descripción */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Título de la Actividad / Espectáculo *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Obra teatral, Concierto de Jazz, Acto Académico..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Descripción / Sinopsis</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve reseña institucional o artística..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Espacio, Categoría y Tipo de Contrato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Espacio Físico */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Espacio Físico *</label>
              <select
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value as SpaceId)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {VIRLA_SPACES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Categoría de Actividad */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Categoría *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(CATEGORY_COLORS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Estado del Trámite */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estado de la Fecha *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value as EventState)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(STATE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Contrato */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Régimen / Tipo de Contrato *</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractType)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(CONTRACT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Horarios de inicio y fin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha y Hora de Inicio *</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fecha y Hora de Fin *</label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
              />
            </div>
          </div>

          {/* Datos del Responsable (Para Prensa / WhatsApp) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Datos del Responsable de la Actividad:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={respName}
                  onChange={(e) => setRespName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Teléfono Móvil (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  value={respPhone}
                  onChange={(e) => setRespPhone(e.target.value)}
                  placeholder="Ej: 3815123456"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={respEmail}
                  onChange={(e) => setRespEmail(e.target.value)}
                  placeholder="responsable@ejemplo.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Institución / Compañía</label>
                <input
                  type="text"
                  value={respOrg}
                  onChange={(e) => setRespOrg(e.target.value)}
                  placeholder="Ej: Elenco Independiente Tucumán"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Sección de Muestras (Subsuelo) */}
          {(spaceId === 'subsuelo-muestras' || category === 'MUESTRA' || isExhibition) && (
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-3">
              <span className="font-bold text-indigo-950 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-700" />
                Cronograma de Montaje (Subsuelo):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-indigo-900 text-[11px] font-semibold mb-1">Inicio de Montaje:</label>
                  <input
                    type="date"
                    value={mountingStart}
                    onChange={(e) => setMountingStart(e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded px-2.5 py-1 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-indigo-900 text-[11px] font-semibold mb-1">Fin de Montaje:</label>
                  <input
                    type="date"
                    value={mountingEnd}
                    onChange={(e) => setMountingEnd(e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded px-2.5 py-1 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-indigo-900 text-[11px] font-semibold mb-1">Curador / Encargado:</label>
                  <input
                    type="text"
                    value={curator}
                    onChange={(e) => setCurator(e.target.value)}
                    placeholder="Prof. Gabriel Quinteros"
                    className="w-full bg-white border border-indigo-300 rounded px-2.5 py-1 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(conflict)}
              className={`px-5 py-2.5 rounded-lg font-bold text-white shadow-sm transition-all ${
                conflict 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              {eventToEdit ? 'Guardar Cambios' : 'Agendar Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
