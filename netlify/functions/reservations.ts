import { getStore } from '@netlify/blobs';
import { AGENDA_CATEGORIES, reservationCategory } from '../../src/domain/agendaCategories';
import type { Context } from '@netlify/functions';
import {
  getReservableSpace,
  getReservationActivityType,
  type ReservationApiError,
  type ReservationInput,
  type StoredReservation,
} from '../../src/domain/reservations';

const STORE_NAME = 'virla-space-reservations';
const BOOKING_PREFIX = 'bookings/';
const LOCK_PREFIX = 'locks/';
const MAX_BODY_LENGTH = 20_000;
const LOCK_TIMEOUT_MS = 20_000;

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : '';

const validDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);
};

const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const todayInTucuman = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Tucuman',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const toPublicReservation = ({ contact: _contact, notes: _notes, ...reservation }: StoredReservation) => reservation;

const listStoredReservations = async () => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const keys: string[] = [];
  for await (const page of store.list({ prefix: BOOKING_PREFIX, paginate: true })) {
    keys.push(...page.blobs.map((blob) => blob.key));
  }

  const values = await Promise.all(keys.map((key) => store.get(key, { type: 'json' }) as Promise<StoredReservation | null>));
  return values
    .filter((reservation): reservation is StoredReservation => Boolean(reservation?.id))
    .sort((first, second) => `${first.date}T${first.startTime}`.localeCompare(`${second.date}T${second.startTime}`));
};

const validateInput = (body: unknown) => {
  const raw = (body && typeof body === 'object' ? body : {}) as Partial<ReservationInput>;
  const input: ReservationInput = {
    category: reservationCategory(cleanText(raw.category, 40), raw.activityType),
    title: cleanText(raw.title, 100),
    activityType: cleanText(raw.activityType, 40) as ReservationInput['activityType'],
    description: cleanText(raw.description, 500),
    spaceId: cleanText(raw.spaceId, 40) as ReservationInput['spaceId'],
    date: cleanText(raw.date, 10),
    startTime: cleanText(raw.startTime, 5),
    endTime: cleanText(raw.endTime, 5),
    responsibleName: cleanText(raw.responsibleName, 80),
    contact: cleanText(raw.contact, 120),
    organization: cleanText(raw.organization, 100) || undefined,
    expectedAttendance: raw.expectedAttendance === undefined || raw.expectedAttendance === null
      ? undefined
      : Number(raw.expectedAttendance),
    notes: cleanText(raw.notes, 500) || undefined,
    website: cleanText(raw.website, 100),
  };
  const fields: Record<string, string> = {};
  if (raw.category !== undefined && !AGENDA_CATEGORIES.some((item) => item.id === raw.category)) {
    fields.category = 'Elegí una categoría de la lista.';
  }
  const space = getReservableSpace(input.spaceId);
  const activityType = getReservationActivityType(input.activityType);

  if (!input.title) fields.title = 'Escribí la actividad o motivo.';
  if (!activityType) fields.activityType = 'Elegí un tipo de actividad.';
  if (input.description.length < 10) fields.description = 'Contá brevemente de qué se trata la actividad.';
  if (!space) fields.spaceId = 'Elegí un espacio de la lista.';
  if (!validDate(input.date)) fields.date = 'Elegí una fecha válida.';
  else if (input.date < todayInTucuman()) fields.date = 'La fecha no puede ser anterior a hoy.';
  if (!validTime(input.startTime)) fields.startTime = 'Elegí una hora de inicio.';
  if (!validTime(input.endTime)) fields.endTime = 'Elegí una hora de finalización.';
  if (validTime(input.startTime) && validTime(input.endTime)) {
    const duration = timeToMinutes(input.endTime) - timeToMinutes(input.startTime);
    if (duration < 30) fields.endTime = 'La ocupación debe durar al menos 30 minutos.';
  }
  if (!input.responsibleName) fields.responsibleName = 'Indicá quién se hace responsable.';
  if (input.contact.length < 6) fields.contact = 'Ingresá un teléfono o correo de contacto.';
  if (input.expectedAttendance !== undefined) {
    if (!Number.isInteger(input.expectedAttendance) || input.expectedAttendance < 1) {
      fields.expectedAttendance = 'Ingresá una cantidad válida.';
    } else if (space?.capacity && input.expectedAttendance > space.capacity) {
      fields.expectedAttendance = `Este espacio admite hasta ${space.capacity} personas.`;
    }
  }

  return { input, fields, space, activityType };
};

const overlaps = (input: ReservationInput, reservation: StoredReservation) =>
  reservation.status === 'confirmed'
  && reservation.spaceId === input.spaceId
  && reservation.date === input.date
  && timeToMinutes(input.startTime) < timeToMinutes(reservation.endTime)
  && timeToMinutes(input.endTime) > timeToMinutes(reservation.startTime);

const acquireLock = async (lockKey: string) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const attempt = await store.setJSON(lockKey, { createdAt: Date.now() }, { onlyIfNew: true });
  if (attempt.modified) return true;

  const existing = await store.get(lockKey, { type: 'json' }) as { createdAt?: number } | null;
  if (existing?.createdAt && Date.now() - existing.createdAt > LOCK_TIMEOUT_MS) {
    await store.delete(lockKey);
    const retry = await store.setJSON(lockKey, { createdAt: Date.now() }, { onlyIfNew: true });
    return retry.modified;
  }
  return false;
};

const createReservation = async (input: ReservationInput, spaceName: string, activityTypeLabel: string) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const lockKey = `${LOCK_PREFIX}${input.spaceId}/${input.date}`;
  const locked = await acquireLock(lockKey);
  if (!locked) return { busy: true as const };

  try {
    const reservations = await listStoredReservations();
    const conflict = reservations.find((reservation) => overlaps(input, reservation));
    if (conflict) return { conflict: toPublicReservation(conflict) };

    const id = crypto.randomUUID();
    const reservation: StoredReservation = {
      id,
      category: input.category,
      title: input.title,
      activityType: input.activityType,
      activityTypeLabel,
      description: input.description,
      spaceId: input.spaceId,
      spaceName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      responsibleName: input.responsibleName,
      contact: input.contact,
      organization: input.organization,
      expectedAttendance: input.expectedAttendance,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    const written = await store.setJSON(`${BOOKING_PREFIX}${id}`, reservation, { onlyIfNew: true });
    if (!written.modified) throw new Error('Reservation could not be written');
    return { reservation: toPublicReservation(reservation) };
  } finally {
    await store.delete(lockKey);
  }
};

export default async (request: Request, _context: Context) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } });
  }

  try {
    if (request.method === 'GET') {
      const reservations = (await listStoredReservations()).map(toPublicReservation);
      return json({ reservations });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido.' } satisfies ReservationApiError, 405);
    }

    // Once Supabase is active, authenticated RPCs are the only writing path.
    // Keep the old store available for an explicitly authorized historical import.
    if ((process.env.VITE_SPACE_CATALOG_BACKEND || 'supabase') === 'supabase') {
      return json({ error: 'Ingresá a Virla para enviar o confirmar una solicitud.' }, 410);
    }

    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > MAX_BODY_LENGTH) return json({ error: 'La solicitud es demasiado grande.' }, 413);
    const text = await request.text();
    if (text.length > MAX_BODY_LENGTH) return json({ error: 'La solicitud es demasiado grande.' }, 413);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: 'No pudimos leer los datos enviados.' } satisfies ReservationApiError, 400);
    }

    const { input, fields, space, activityType } = validateInput(body);
    if (input.website) return json({ error: 'No pudimos registrar la ocupación.' } satisfies ReservationApiError, 400);
    if (Object.keys(fields).length > 0 || !space || !activityType) {
      return json({ error: 'Revisá los datos marcados.', fields } satisfies ReservationApiError, 400);
    }

    const result = await createReservation(input, space.name, activityType.label);
    if ('busy' in result) {
      return json({ error: 'Otra persona está reservando ese espacio. Esperá unos segundos y volvé a intentar.' } satisfies ReservationApiError, 409);
    }
    if ('conflict' in result && result.conflict) {
      return json({
        error: `El espacio ya está ocupado de ${result.conflict.startTime} a ${result.conflict.endTime} hs.`,
        conflict: result.conflict,
      } satisfies ReservationApiError, 409);
    }

    return json({ reservation: result.reservation }, 201);
  } catch (error) {
    console.error('Virla reservations error', error);
    return json({ error: 'No pudimos guardar la ocupación. Volvé a intentar.' } satisfies ReservationApiError, 500);
  }
};
