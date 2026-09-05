import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  EventItem, 
  UserRole, 
  SpaceId, 
  ActivityCategory, 
  CommunicationMaterial, 
  TicketingInfo 
} from '../domain/types';
import { INITIAL_EVENTS } from '../infrastructure/mockData';

interface VirlaContextType {
  events: EventItem[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedSpaceFilter: SpaceId | 'ALL';
  setSelectedSpaceFilter: (space: SpaceId | 'ALL') => void;
  selectedCategoryFilter: ActivityCategory | 'ALL';
  setSelectedCategoryFilter: (cat: ActivityCategory | 'ALL') => void;
  
  // Acciones de dominio
  addEvent: (eventData: Omit<EventItem, 'id' | 'audit'>) => { success: boolean; conflictEvent?: EventItem };
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
  
  // Específicos por rol
  acknowledgeExtensionEvent: (id: string, notes?: string) => void;
  updateCommunicationMaterial: (id: string, materials: Partial<CommunicationMaterial>) => void;
  updateTicketing: (id: string, ticketing: Partial<TicketingInfo>) => void;
  checkSpaceConflict: (spaceId: SpaceId, startDate: string, endDate: string, excludeEventId?: string) => EventItem | null;
  resetDemoData: () => void;
  
  // Alertas
  extensionPendingCount: number;
}

const STORAGE_KEY = 'virla_agenda_events_v1';
const ROLE_STORAGE_KEY = 'virla_active_role_v1';

const VirlaContext = createContext<VirlaContextType | undefined>(undefined);

export const VirlaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error al parsear eventos de localStorage', e);
      }
    }
    return INITIAL_EVENTS;
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole;
    return savedRole || 'DIRECCION';
  });

  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<SpaceId | 'ALL'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<ActivityCategory | 'ALL'>('ALL');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, currentRole);
  }, [currentRole]);

  // Detector de colisión temporal en el mismo espacio físico
  const checkSpaceConflict = (
    spaceId: SpaceId, 
    startDate: string, 
    endDate: string, 
    excludeEventId?: string
  ): EventItem | null => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    for (const evt of events) {
      if (excludeEventId && evt.id === excludeEventId) continue;
      if (evt.spaceId !== spaceId) continue;
      if (evt.state === 'CANCELADO') continue;

      const evtStart = new Date(evt.startDate).getTime();
      const evtEnd = new Date(evt.endDate).getTime();

      // Condición de solapamiento: (StartA < EndB) y (EndA > StartB)
      if (start < evtEnd && end > evtStart) {
        return evt;
      }
    }
    return null;
  };

  const addEvent = (eventData: Omit<EventItem, 'id' | 'audit'>) => {
    const conflict = checkSpaceConflict(eventData.spaceId, eventData.startDate, eventData.endDate);
    if (conflict) {
      return { success: false, conflictEvent: conflict };
    }

    const isFromExtension = currentRole === 'EXTENSION';
    const newEvent: EventItem = {
      ...eventData,
      id: `evt-${Date.now()}`,
      audit: {
        createdByRole: currentRole,
        createdByName: isFromExtension ? 'Marcelo Mirkin (Secretaría de Extensión)' : 'Dirección / Mesa de Entradas',
        isExtensionAgreement: isFromExtension,
        acknowledgedByDirector: !isFromExtension, // Si la crea Extensión, Dirección debe verla y darle el visto bueno
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    setEvents(prev => [newEvent, ...prev]);
    return { success: true };
  };

  const updateEvent = (id: string, updates: Partial<EventItem>) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id !== id) return evt;
      return {
        ...evt,
        ...updates,
        audit: {
          ...evt.audit,
          updatedAt: new Date().toISOString(),
        },
      };
    }));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const acknowledgeExtensionEvent = (id: string, notes?: string) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id !== id) return evt;
      return {
        ...evt,
        audit: {
          ...evt.audit,
          acknowledgedByDirector: true,
          directorNotes: notes || evt.audit.directorNotes,
          updatedAt: new Date().toISOString(),
        },
      };
    }));
  };

  const updateCommunicationMaterial = (id: string, materials: Partial<CommunicationMaterial>) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id !== id) return evt;
      return {
        ...evt,
        communication: {
          ...evt.communication,
          ...materials,
        },
      };
    }));
  };

  const updateTicketing = (id: string, ticketing: Partial<TicketingInfo>) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id !== id) return evt;
      return {
        ...evt,
        ticketing: {
          ...evt.ticketing,
          ...ticketing,
        },
      };
    }));
  };

  const resetDemoData = () => {
    setEvents(INITIAL_EVENTS);
    localStorage.removeItem(STORAGE_KEY);
  };

  const extensionPendingCount = events.filter(
    e => e.audit.isExtensionAgreement && !e.audit.acknowledgedByDirector
  ).length;

  return (
    <VirlaContext.Provider
      value={{
        events,
        currentRole,
        setCurrentRole,
        selectedSpaceFilter,
        setSelectedSpaceFilter,
        selectedCategoryFilter,
        setSelectedCategoryFilter,
        addEvent,
        updateEvent,
        deleteEvent,
        acknowledgeExtensionEvent,
        updateCommunicationMaterial,
        updateTicketing,
        checkSpaceConflict,
        resetDemoData,
        extensionPendingCount,
      }}
    >
      {children}
    </VirlaContext.Provider>
  );
};

export const useVirla = () => {
  const context = useContext(VirlaContext);
  if (!context) {
    throw new Error('useVirla debe ser utilizado dentro de un VirlaProvider');
  }
  return context;
};
