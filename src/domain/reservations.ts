import type { AgendaCategoryId } from './agendaCategories';

export const RESERVABLE_SPACES = [
  { id: 'teatro-300', name: 'Sala de Teatro', detail: '300 butacas', capacity: 300 },
  { id: 'subsuelo-muestras', name: 'Sala de Muestras', detail: 'Subsuelo', capacity: 120 },
  { id: 'bar', name: 'Bar Cultural y Patio', detail: 'Hasta 80 personas', capacity: 80 },
  { id: 'radio', name: 'Estudio Radio Universidad', detail: 'Hasta 15 personas', capacity: 15 },
  { id: 'boleteria', name: 'Boletería del Virla', detail: 'Punto de atención', capacity: undefined },
  { id: 'recepcion', name: 'Recepción y Hall Central', detail: 'Hasta 100 personas', capacity: 100 },
] as const;

export type ReservableSpaceId = (typeof RESERVABLE_SPACES)[number]['id'];

export const RESERVATION_ACTIVITY_TYPES = [
  { id: 'function', label: 'Función o espectáculo' },
  { id: 'rehearsal', label: 'Ensayo' },
  { id: 'meeting', label: 'Reunión o charla' },
  { id: 'exhibition', label: 'Muestra o exposición' },
  { id: 'academic', label: 'Actividad académica' },
  { id: 'assembly', label: 'Armado o montaje' },
  { id: 'maintenance', label: 'Mantenimiento' },
  { id: 'other', label: 'Otra actividad' },
] as const;

export type ReservationActivityType = (typeof RESERVATION_ACTIVITY_TYPES)[number]['id'];

export interface ReservationInput {
  category?: AgendaCategoryId;
  title: string;
  activityType: ReservationActivityType;
  description: string;
  spaceId: ReservableSpaceId;
  date: string;
  startTime: string;
  endTime: string;
  responsibleName: string;
  contact: string;
  organization?: string;
  expectedAttendance?: number;
  notes?: string;
  website?: string;
}

export interface PublicReservation {
  category?: AgendaCategoryId;
  id: string;
  title: string;
  activityType: ReservationActivityType;
  activityTypeLabel: string;
  description: string;
  spaceId: ReservableSpaceId;
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  responsibleName: string;
  organization?: string;
  expectedAttendance?: number;
  createdAt: string;
  status: 'confirmed';
}

export interface StoredReservation extends PublicReservation {
  contact: string;
  notes?: string;
}

export interface ReservationsResponse {
  reservations: PublicReservation[];
}

export interface ReservationCreatedResponse {
  reservation: PublicReservation;
}

export interface ReservationApiError {
  error: string;
  conflict?: PublicReservation;
  fields?: Record<string, string>;
}

export const getReservableSpace = (spaceId: string) =>
  RESERVABLE_SPACES.find((space) => space.id === spaceId);

export const getReservationActivityType = (activityType: string) =>
  RESERVATION_ACTIVITY_TYPES.find((item) => item.id === activityType);
