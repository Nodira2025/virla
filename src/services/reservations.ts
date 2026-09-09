import type {
  PublicReservation,
  ReservationApiError,
  ReservationCreatedResponse,
  ReservationInput,
  ReservationsResponse,
} from '../domain/reservations';

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

