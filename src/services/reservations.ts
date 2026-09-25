import type {
  PublicReservation,
  ReservationApiError,
  ReservationCreatedResponse,
  ReservationInput,
  ReservationsResponse,
} from '../domain/reservations';
import { getReservableSpace, getReservationActivityType } from '../domain/reservations';
import { getSupabase, spaceCatalogBackend } from '../infrastructure/supabase';

export interface BookingRow {
  id: string; space_id: PublicReservation['spaceId']; title: string; description: string;
  activity_type: PublicReservation['activityType']; category: PublicReservation['category'];
  date: string; start_time: string; end_time: string; responsible_name: string; organization: string;
  expected_attendance: number | null; status: PublicReservation['status']; created_at: string;
  created_by: string; decision_note: string;
  virla_booking_private?: { contact: string; notes: string } | null;
}
export function toReservation(row: BookingRow): PublicReservation {
  return { id: row.id, spaceId: row.space_id, spaceName: getReservableSpace(row.space_id)?.name || row.space_id,
    title: row.title, description: row.description, activityType: row.activity_type,
    activityTypeLabel: getReservationActivityType(row.activity_type)?.label || 'Actividad', category: row.category,
    date: row.date, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5),
    responsibleName: row.responsible_name, organization: row.organization,
    expectedAttendance: row.expected_attendance ?? undefined, status: row.status, createdAt: row.created_at };
}
export function bookingError(error: { code?: string; message: string }) {
  if (error.code === '23P01') return 'El espacio ya está ocupado en ese horario. Elegí otro horario.';
  if (error.code === 'P0001' || error.code === '42501') return error.message;
  if (error.code === 'PGRST205' || error.code === 'PGRST202') return 'La base de datos todavía no tiene habilitada esta función.';
  return 'No pudimos guardar los cambios. Revisá los datos y la conexión e intentá nuevamente.';
}

export class ReservationRequestError extends Error {
  fields?: Record<string, string>;
  conflict?: PublicReservation;

  constructor(message: string, details?: ReservationApiError) {
    super(message);
    this.name = 'ReservationRequestError';
    this.fields = details?.fields;
    this.conflict = details?.conflict;
  }
}

const readJson = async <T>(response: Response): Promise<T> => {
  try {
    return await response.json() as T;
  } catch {
    throw new ReservationRequestError('La agenda respondió de una forma inesperada.');
  }
};

export const fetchReservations = async (signal?: AbortSignal) => {
  if (spaceCatalogBackend === 'supabase') {
    let query = getSupabase().from('virla_bookings').select('*').eq('status', 'confirmed').order('date');
    let archiveQuery = getSupabase().from('virla_booking_archive').select('payload');
    if (signal) { query = query.abortSignal(signal); archiveQuery = archiveQuery.abortSignal(signal); }
    const [current, archive] = await Promise.all([query, archiveQuery]);
    if (current.error || archive.error) throw new ReservationRequestError('No pudimos cargar las ocupaciones internas.');
    const reservations = (current.data as BookingRow[]).map(toReservation);
    const ids = new Set(reservations.map((row) => row.id));
    const historical = (archive.data as Array<{ payload: PublicReservation }>).map((row) => row.payload).filter((row) => row.status === 'confirmed' && !ids.has(row.id));
    return [...reservations, ...historical].sort((a, b) => a.date.localeCompare(b.date));
  }
  const response = await fetch('/api/reservations', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  const body = await readJson<ReservationsResponse | ReservationApiError>(response);
  if (!response.ok || !('reservations' in body)) {
    throw new ReservationRequestError('No pudimos cargar las ocupaciones internas.', body as ReservationApiError);
  }
  return body.reservations;
};

export const createReservation = async (input: ReservationInput) => {
  if (spaceCatalogBackend === 'supabase') {
    const { data, error } = await getSupabase().rpc('virla_create_booking', { input });
    if (error) throw new ReservationRequestError(bookingError(error));
    return toReservation(data as BookingRow);
  }
  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const body = await readJson<ReservationCreatedResponse | ReservationApiError>(response);
  if (!response.ok || !('reservation' in body)) {
    const details = body as ReservationApiError;
    throw new ReservationRequestError(details.error || 'No pudimos guardar la ocupación.', details);
  }
  return body.reservation;
};
