import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CalendarCheck, Info, LoaderCircle, MapPin, UsersRound } from 'lucide-react';
import {
  RESERVATION_ACTIVITY_TYPES,
  RESERVABLE_SPACES,
  getReservableSpace,
  type PublicReservation,
  type ReservationInput,
} from '../domain/reservations';
import { createReservation, ReservationRequestError } from '../services/reservations';

interface ReservationFormProps {
  onCancel: () => void;
  onSaved: (reservation: PublicReservation) => void;
}

type FieldErrors = Partial<Record<keyof ReservationInput, string>>;

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialForm = (): ReservationInput => ({
  title: '',
  activityType: 'function',
  description: '',
  spaceId: 'teatro-300',
  date: localDateKey(new Date()),
  startTime: '09:00',
  endTime: '10:00',
  responsibleName: '',
  contact: '',
  organization: '',
  expectedAttendance: undefined,
  notes: '',
  website: '',
});

const inputClass = (hasError?: boolean) =>
  `mt-2 min-h-12 w-full rounded-xl border bg-white px-3 text-base text-slate-900 outline-none transition focus:ring-3 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-300 focus:border-[#007F8C] focus:ring-[#007F8C]/15'
  }`;

export const ReservationForm: React.FC<ReservationFormProps> = ({ onCancel, onSaved }) => {
  const [form, setForm] = useState<ReservationInput>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedSpace = useMemo(() => getReservableSpace(form.spaceId), [form.spaceId]);

  const setField = <Key extends keyof ReservationInput>(key: Key, value: ReservationInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const errors: FieldErrors = {};
    if (!form.title.trim()) errors.title = 'Escribí la actividad o motivo.';
    if (!form.description.trim() || form.description.trim().length < 10) {
      errors.description = 'Contá brevemente de qué se trata la actividad.';
    }
    if (!form.date) errors.date = 'Elegí una fecha.';
    if (!form.startTime) errors.startTime = 'Elegí la hora de inicio.';
    if (!form.endTime) errors.endTime = 'Elegí la hora de finalización.';
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      errors.endTime = 'La hora “Hasta” debe ser posterior a “Desde”.';
    }
    if (!form.responsibleName.trim()) errors.responsibleName = 'Indicá quién se hace responsable.';
    if (form.contact.trim().length < 6) errors.contact = 'Ingresá un teléfono o correo.';
    if (form.expectedAttendance !== undefined) {
      if (!Number.isInteger(form.expectedAttendance) || form.expectedAttendance < 1) {
        errors.expectedAttendance = 'Ingresá una cantidad válida.';
      } else if (selectedSpace?.capacity && form.expectedAttendance > selectedSpace.capacity) {
        errors.expectedAttendance = `Este espacio admite hasta ${selectedSpace.capacity} personas.`;
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setSubmitError(null);
    try {
      const reservation = await createReservation(form);
      onSaved(reservation);
    } catch (error) {
      if (error instanceof ReservationRequestError) {
        setSubmitError(error.message);
        if (error.fields) setFieldErrors(error.fields);
      } else {
        setSubmitError('No pudimos guardar la ocupación. Volvé a intentar.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-labelledby="reservation-title" className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={onCancel}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver a la agenda
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e1f2fb] text-[#004a7f]">
            <CalendarCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold uppercase tracking-[0.12em] text-[#007F8C]">Agenda interna</p>
            <h1 id="reservation-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Ocupar un espacio</h1>
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              Completá los datos y confirmá. La ocupación quedará visible en la agenda de todo el equipo.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-base leading-relaxed text-blue-950">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#004a7f]" aria-hidden="true" />
          <p>
            El sistema impide dos ocupaciones internas en el mismo espacio y horario. Las actividades de EntradaNet no informan sala ni duración, por eso conviene revisarlas también en la agenda.
          </p>
        </div>

        {submitError && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <strong>No pudimos guardar la ocupación</strong>
              <p className="mt-1">{submitError}</p>
            </div>
          </div>
        )}

        <form className="mt-7 space-y-7" onSubmit={handleSubmit} noValidate>
          <fieldset className="space-y-5">
            <legend className="flex items-center gap-2 text-xl font-bold text-slate-950">
              <MapPin className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
              Qué espacio y cuándo
            </legend>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block font-bold text-slate-800 sm:col-span-2">
                Actividad o motivo <span className="text-red-700">*</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  className={inputClass(Boolean(fieldErrors.title))}
                  placeholder="Ej.: Ensayo del Coro Universitario"
                  maxLength={100}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                />
                {fieldErrors.title && <span id="title-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.title}</span>}
              </label>

              <label className="block font-bold text-slate-800 sm:col-span-2">
                Tipo de actividad <span className="text-red-700">*</span>
                <select
                  value={form.activityType}
                  onChange={(event) => setField('activityType', event.target.value as ReservationInput['activityType'])}
                  className={inputClass(Boolean(fieldErrors.activityType))}
                  aria-invalid={Boolean(fieldErrors.activityType)}
                >
                  {RESERVATION_ACTIVITY_TYPES.map((activityType) => (
                    <option key={activityType.id} value={activityType.id}>{activityType.label}</option>
                  ))}
                </select>
              </label>

              <label className="block font-bold text-slate-800 sm:col-span-2">
                Descripción breve <span className="text-red-700">*</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                  className={`${inputClass(Boolean(fieldErrors.description))} min-h-24 py-3`}
                  placeholder="Qué actividad se hará y qué necesita del espacio"
                  maxLength={500}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                />
                {fieldErrors.description && <span id="description-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.description}</span>}
              </label>

              <label className="block font-bold text-slate-800 sm:col-span-2">
                Espacio <span className="text-red-700">*</span>
                <select
                  value={form.spaceId}
                  onChange={(event) => setField('spaceId', event.target.value as ReservationInput['spaceId'])}
                  className={inputClass(Boolean(fieldErrors.spaceId))}
                  aria-invalid={Boolean(fieldErrors.spaceId)}
                >
                  {RESERVABLE_SPACES.map((space) => (
                    <option key={space.id} value={space.id}>{space.name} · {space.detail}</option>
                  ))}
                </select>
              </label>

              <label className="block font-bold text-slate-800">
                Fecha <span className="text-red-700">*</span>
                <input
                  type="date"
                  min={localDateKey(new Date())}
                  value={form.date}
                  onChange={(event) => setField('date', event.target.value)}
                  className={inputClass(Boolean(fieldErrors.date))}
                  aria-invalid={Boolean(fieldErrors.date)}
                  aria-describedby={fieldErrors.date ? 'date-error' : undefined}
                />
                {fieldErrors.date && <span id="date-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.date}</span>}
              </label>

              <label className="block font-bold text-slate-800">
                Cantidad estimada de personas
                <input
                  type="number"
                  min={1}
                  max={selectedSpace?.capacity}
                  value={form.expectedAttendance ?? ''}
                  onChange={(event) => setField('expectedAttendance', event.target.value ? Number(event.target.value) : undefined)}
                  className={inputClass(Boolean(fieldErrors.expectedAttendance))}
                  placeholder="Opcional"
                  aria-invalid={Boolean(fieldErrors.expectedAttendance)}
                  aria-describedby={fieldErrors.expectedAttendance ? 'attendance-error' : undefined}
                />
                {fieldErrors.expectedAttendance && <span id="attendance-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.expectedAttendance}</span>}
              </label>

              <label className="block font-bold text-slate-800">
                Desde <span className="text-red-700">*</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setField('startTime', event.target.value)}
                  className={inputClass(Boolean(fieldErrors.startTime))}
                  aria-invalid={Boolean(fieldErrors.startTime)}
                  aria-describedby={fieldErrors.startTime ? 'start-error' : undefined}
                />
                {fieldErrors.startTime && <span id="start-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.startTime}</span>}
              </label>

              <label className="block font-bold text-slate-800">
                Hasta <span className="text-red-700">*</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setField('endTime', event.target.value)}
                  className={inputClass(Boolean(fieldErrors.endTime))}
                  aria-invalid={Boolean(fieldErrors.endTime)}
                  aria-describedby={fieldErrors.endTime ? 'end-error' : undefined}
                />
                {fieldErrors.endTime && <span id="end-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.endTime}</span>}
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-5 border-t border-slate-200 pt-7">
            <legend className="flex items-center gap-2 text-xl font-bold text-slate-950">
              <UsersRound className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
              Responsable
            </legend>
            <p className="text-base text-slate-600">No hace falta crear una cuenta. Estos datos permiten saber quién se hace cargo.</p>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block font-bold text-slate-800">
                Nombre y apellido <span className="text-red-700">*</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={form.responsibleName}
                  onChange={(event) => setField('responsibleName', event.target.value)}
                  className={inputClass(Boolean(fieldErrors.responsibleName))}
                  maxLength={80}
                  aria-invalid={Boolean(fieldErrors.responsibleName)}
                  aria-describedby={fieldErrors.responsibleName ? 'responsible-error' : undefined}
                />
                {fieldErrors.responsibleName && <span id="responsible-error" className="mt-1 block text-sm font-semibold text-red-700">{fieldErrors.responsibleName}</span>}
              </label>

              <label className="block font-bold text-slate-800">
                Teléfono o correo <span className="text-red-700">*</span>
                <input
                  type="text"
                  autoComplete="email"
                  value={form.contact}
                  onChange={(event) => setField('contact', event.target.value)}
                  className={inputClass(Boolean(fieldErrors.contact))}
                  placeholder="Solo lo guarda coordinación"
                  maxLength={120}
                  aria-invalid={Boolean(fieldErrors.contact)}
                  aria-describedby="contact-help"
                />
                <span id="contact-help" className={`mt-1 block text-sm ${fieldErrors.contact ? 'font-semibold text-red-700' : 'font-normal text-slate-500'}`}>
                  {fieldErrors.contact || 'No se muestra en la agenda pública.'}
                </span>
              </label>

              <label className="block font-bold text-slate-800 sm:col-span-2">
                Área, grupo u organización
                <input
                  type="text"
                  value={form.organization || ''}
                  onChange={(event) => setField('organization', event.target.value)}
                  className={inputClass()}
                  placeholder="Opcional"
                  maxLength={100}
                />
              </label>

              <label className="block font-bold text-slate-800 sm:col-span-2">
                Observaciones para coordinación
                <textarea
                  value={form.notes || ''}
                  onChange={(event) => setField('notes', event.target.value)}
                  className={`${inputClass()} min-h-28 py-3`}
                  placeholder="Opcional: armado, equipos, ingreso de proveedores…"
                  maxLength={500}
                />
              </label>
            </div>
          </fieldset>

          <label className="sr-only" aria-hidden="true">
            Sitio web
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website || ''}
              onChange={(event) => setField('website', event.target.value)}
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#004a7f] px-7 text-base font-bold text-white shadow-sm hover:bg-[#003865] disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <CalendarCheck className="h-5 w-5" aria-hidden="true" />}
              {isSaving ? 'Guardando…' : 'Confirmar ocupación'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
