import { getReservableSpace, type ReservationInput } from './reservations';

export type ReservationFieldErrors = Partial<Record<keyof ReservationInput, string>>;
export const RESERVATION_STEPS: Array<Array<keyof ReservationInput>> = [
  ['title', 'description', 'category', 'activityType'],
  ['spaceId', 'date', 'startTime', 'endTime', 'expectedAttendance'],
  ['responsibleName', 'contact', 'organization', 'notes'],
];

export function todayInTucuman(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Argentina/Tucuman', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}

export function validateReservation(form: ReservationInput, today = todayInTucuman(), capacityOverride?: number | null): ReservationFieldErrors {
  const errors: ReservationFieldErrors = {};
  if (!form.title.trim()) errors.title = 'Escribí el nombre de la actividad.';
  if (form.description.trim().length < 10) errors.description = 'Contá de qué se trata en al menos 10 caracteres.';
  const parsedDate = new Date(form.date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== form.date) errors.date = 'Elegí una fecha válida.';
  else if (form.date < today) errors.date = 'La fecha no puede ser anterior a hoy.';
  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(form.startTime)) errors.startTime = 'Elegí la hora de inicio.';
  if (!validTime(form.endTime)) errors.endTime = 'Elegí la hora de finalización.';
  if (validTime(form.startTime) && validTime(form.endTime)) {
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    if (minutes(form.endTime) - minutes(form.startTime) < 30) errors.endTime = 'La actividad debe durar al menos 30 minutos, dentro del mismo día.';
  }
  const space = getReservableSpace(form.spaceId);
  if (!space) errors.spaceId = 'Elegí un espacio de la lista.';
  if (!form.responsibleName.trim()) errors.responsibleName = 'Indicá quién se hace responsable.';
  if (form.contact.trim().length < 6) errors.contact = 'Ingresá un teléfono o correo de contacto.';
  if (form.expectedAttendance !== undefined) {
    if (!Number.isInteger(form.expectedAttendance) || form.expectedAttendance < 1) errors.expectedAttendance = 'Ingresá una cantidad válida.';
    else { const capacity = capacityOverride === undefined ? space?.capacity : capacityOverride; if (capacity && form.expectedAttendance > capacity) errors.expectedAttendance = `Este espacio admite hasta ${capacity} personas.`; }
  }
  return errors;
}

export function stepForErrors(errors: ReservationFieldErrors) {
  return Math.max(0, RESERVATION_STEPS.findIndex((fields) => fields.some((field) => Boolean(errors[field]))));
}
