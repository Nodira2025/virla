export type SpaceId = 
  | 'teatro-300'
  | 'subsuelo-muestras'
  | 'bar'
  | 'radio'
  | 'boleteria'
  | 'recepcion';

export interface Space {
  id: SpaceId;
  name: string;
  shortName: string;
  capacity?: number;
  badgeColor: string;
  description: string;
}

export type EventState = 
  | 'SOLICITUD'
  | 'RESERVA_PROVISORIA'
  | 'CONTRATO_EMITIDO'
  | 'EN_PRODUCCION'
  | 'CONFIRMADO'
  | 'REALIZADO'
  | 'CANCELADO';

export type ContractType = 
  | 'ALQUILER_SALA'
  | 'ALQUILER_SIN_COSTO'
  | 'ACTIVIDAD_UNIVERSITARIA'
  | 'COPRODUCCION'
  | 'MUESTRA_EXPOSICION'
  | 'OTRO';

export type ActivityCategory = 
  | 'TEATRO'
  | 'MUESTRA'
  | 'UNIVERSITARIO'
  | 'MUSICA'
  | 'DANZA'
  | 'CONFERENCIA'
  | 'RADIO_ENVIVO';

export interface ResponsibleContact {
  name: string;
  phone: string; // Formato E.164 o local con código de área (ej: 3815123456)
  email: string;
  organization: string;
}

export interface CommunicationMaterial {
  hasPhotos: boolean;
  hasPressRelease: boolean;
  hasLogo: boolean;
  hasSocialCopy: boolean;
  notes: string;
  lastContactedAt?: string;
}

export interface ExhibitionSchedule {
  isExhibition: boolean;
  mountingStart?: string; // YYYY-MM-DD
  mountingEnd?: string;
  vernissage?: string; // Fecha de inauguración
  unmountingDate?: string;
  curator?: string;
}

export interface TicketingInfo {
  isFree: boolean;
  priceGeneral?: number;
  priceStudentDiscount?: number;
  saleConditions: string;
  isPublishedOnWeb: boolean;
  ticketLink?: string;
}

export interface AuditRecord {
  createdByRole: string;
  createdByName: string;
  isExtensionAgreement: boolean; // Acordado por Extensión (Marcelo Mirkin)
  acknowledgedByDirector: boolean;
  directorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  spaceId: SpaceId;
  category: ActivityCategory;
  state: EventState;
  contractType: ContractType;
  startDate: string; // YYYY-MM-DDTHH:mm
  endDate: string;   // YYYY-MM-DDTHH:mm
  responsible: ResponsibleContact;
  communication: CommunicationMaterial;
  exhibition: ExhibitionSchedule;
  ticketing: TicketingInfo;
  audit: AuditRecord;
}

export type UserRole = 
  | 'DIRECCION'
  | 'EXTENSION' // Marcelo Mirkin
  | 'COMUNICACION'
  | 'MUESTRAS'
  | 'BOLETERIA_WEB'
  | 'RECEPCION';

export interface RoleConfig {
  id: UserRole;
  title: string;
  personName: string;
  badge: string;
  description: string;
}
