import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Info,
  List,
  Plus,
  SlidersHorizontal,
  Share2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  UsersRound,
  UserRound,
  X,
} from 'lucide-react';
import { RESERVABLE_SPACES, type PublicReservation } from '../domain/reservations';
import { AGENDA_CATEGORIES, categoryFromTerms, categoryStyle, getAgendaCategory, reservationCategory, type AgendaCategoryId } from '../domain/agendaCategories';
import { ENTRADANET_BASE_URL, ENTRADANET_EVENTS_API, isEntradanetUrl } from '../infrastructure/entradanet';
import { fetchReservations } from '../services/reservations';

type CalendarMode = 'month' | 'week' | 'day';
type TimePreset = 'all' | 'morning' | 'afternoon' | 'evening' | 'custom';

interface EntradanetApiEvent {
  id: number;
  link: string;
  title: { rendered: string };
  excerpt?: { rendered: string };
  content?: { rendered: string };
  featured_media?: number;
  event_date_time: string;
  event_end_date_time: string;
  event_location: string;
  _embedded?: {
    'wp:term'?: Array<Array<{ name?: string; slug?: string; taxonomy?: string }>>;
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      alt_text?: string;
      media_details?: {
        sizes?: Record<string, { source_url?: string }>;
      };
    }>;
  };
}

interface PublicEvent {
  spaceId?: string;
  category: AgendaCategoryId;
  id: string;
  link?: string;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  location: string;
  source: 'entradanet' | 'reservation';
  responsibleName?: string;
  organization?: string;
  description?: string;
  activityTypeLabel?: string;
  expectedAttendance?: number;
  imageUrl?: string;
  imageAlt?: string;
}

interface CustomTimeRange {
  start: string;
  end: string;
}

const MODE_LABELS: Record<CalendarMode, string> = {
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
};

const TIME_OPTIONS: Array<{ value: TimePreset; label: string }> = [
  { value: 'all', label: 'Todo el día' },
  { value: 'morning', label: 'Mañana · 08 a 13 hs' },
  { value: 'afternoon', label: 'Tarde · 13 a 19 hs' },
  { value: 'evening', label: 'Noche · 19 a 24 hs' },
  { value: 'custom', label: 'Elegir otro horario' },
];

const decodeHtml = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const cleanEventTitle = (value: string) =>
  decodeHtml(value)
    .replace(/\s+[–-]\s+\d{2}\/\d{2}\/\d{4}\s+[–-]\s+\d{1,2}[.:]\d{2}\s*hs\s*$/i, '')
    .trim();

const cleanEventDescription = (value?: string) => {
  if (!value) return undefined;
  const withBreaks = value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n');
  const cleaned = decodeHtml(withBreaks)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned || undefined;
};

const parseVenueDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfWeek = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay() === 0 ? 7 : start.getDay();
  return addDays(start, 1 - weekday);
};

const sameDay = (first: Date, second: Date) => dateKey(first) === dateKey(second);

const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase('es-AR') + value.slice(1);

const formatFullDate = (date: Date) =>
  capitalize(date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const matchesTime = (event: PublicEvent, preset: TimePreset, customStart: string, customEnd: string) => {
  const minutes = event.startsAt.getHours() * 60 + event.startsAt.getMinutes();
  if (preset === 'all') return true;
  if (preset === 'morning') return minutes >= 8 * 60 && minutes < 13 * 60;
  if (preset === 'afternoon') return minutes >= 13 * 60 && minutes < 19 * 60;
  if (preset === 'evening') return minutes >= 19 * 60;

  const start = timeToMinutes(customStart);
  const end = timeToMinutes(customEnd);
  if (start === null || end === null) return true;
  if (start === end) return true;
  return start < end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
};

const toLocalDateTime = (date: Date) =>
  `${dateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const loadEntradanetEvents = async (signal: AbortSignal): Promise<PublicEvent[]> => {
  const firstResponse = await fetch(`${ENTRADANET_EVENTS_API}&page=1`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!firstResponse.ok) throw new Error(`HTTP ${firstResponse.status}`);

  const firstPage = (await firstResponse.json()) as EntradanetApiEvent[];
  const totalPages = Math.min(
    Math.max(Number(firstResponse.headers.get('X-WP-TotalPages') || '1'), 1),
    10,
  );
  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
      const response = await fetch(`${ENTRADANET_EVENTS_API}&page=${page}`, {
        signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as EntradanetApiEvent[];
    }),
  );

  return [...firstPage, ...otherPages.flat()]
    .map((event): PublicEvent | null => {
      const startsAt = parseVenueDate(event.event_date_time);
      if (!startsAt || !isEntradanetUrl(event.link)) return null;
      const parsedEnd = parseVenueDate(event.event_end_date_time);
      const endsAt = parsedEnd && parsedEnd.getTime() > startsAt.getTime() ? parsedEnd : undefined;
      const featuredMedia = event._embedded?.['wp:featuredmedia']?.[0];
      const embeddedImage = featuredMedia?.media_details?.sizes?.medium_large?.source_url
        || featuredMedia?.media_details?.sizes?.large?.source_url
        || featuredMedia?.source_url;
      const imageUrl = isEntradanetUrl(embeddedImage) ? embeddedImage : undefined;
      const description = cleanEventDescription(event.excerpt?.rendered)
        || cleanEventDescription(event.content?.rendered);
      return {
        id: `entradanet-${event.id}`,
        category: categoryFromTerms(event._embedded?.['wp:term']?.flat() || []),
        link: event.link,
        title: cleanEventTitle(event.title.rendered),
        startsAt,
        endsAt,
        location: event.event_location
          ? decodeHtml(event.event_location).replace(/<[^>]*>/g, '').trim()
          : 'Centro Cultural Virla · 25 de Mayo 265',
        source: 'entradanet',
        description,
        imageUrl,
        imageAlt: featuredMedia?.alt_text || `Imagen de ${cleanEventTitle(event.title.rendered)}`,
      };
    })
    .filter((event): event is PublicEvent => Boolean(event));
};

const reservationToEvent = (reservation: PublicReservation): PublicEvent | null => {
  const startsAt = parseVenueDate(`${reservation.date} ${reservation.startTime}`);
  const endsAt = parseVenueDate(`${reservation.date} ${reservation.endTime}`);
  if (!startsAt || !endsAt) return null;
  return {
    id: `reservation-${reservation.id}`,
    category: reservationCategory(reservation.category, reservation.activityType),
    title: reservation.title,
    startsAt,
    endsAt,
    location: reservation.spaceName,
    source: 'reservation',
    spaceId: reservation.spaceId,
    responsibleName: reservation.responsibleName,
    organization: reservation.organization,
    description: reservation.description,
    activityTypeLabel: reservation.activityTypeLabel,
    expectedAttendance: reservation.expectedAttendance,
  };
};

interface PublicAgendaViewProps {
  spaceId?: string;
  reservationRefreshKey?: number;
  onCreate?: () => void;
  focusDate?: string;
}

export const PublicAgendaView: React.FC<PublicAgendaViewProps> = ({ reservationRefreshKey = 0, onCreate, focusDate, spaceId }) => {
  const today = useMemo(() => new Date(), []);
  const selectedDayPanelRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<CalendarMode>('month');
  const [display, setDisplay] = useState<'calendar' | 'list'>('calendar');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [anchorDate, setAnchorDate] = useState(() => focusDate ? new Date(focusDate + 'T12:00:00') : today);
  const [selectedDate, setSelectedDate] = useState(() => focusDate ? new Date(focusDate + 'T12:00:00') : today);
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [categoryFilter, setCategoryFilter] = useState<AgendaCategoryId | 'all'>('all');
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('23:59');
  const [appliedCustomRange, setAppliedCustomRange] = useState<CustomTimeRange | null>(null);
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservationLoadError, setReservationLoadError] = useState(false);
  const [entradanetLoadError, setEntradanetLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRefreshKey((key) => key + 1); };
    const timer = window.setInterval(refresh, 30000); window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    if (!focusDate) return;
    const date = new Date(focusDate + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return;
    setAnchorDate(date);
    setSelectedDate(date);
  }, [focusDate, reservationRefreshKey]);

  const loadAgenda = useCallback(async (signal: AbortSignal) => {
    try {
      setError(null);
      const [entradanetResult, reservationsResult] = await Promise.allSettled([
        loadEntradanetEvents(signal),
        fetchReservations(signal),
      ]);
      if (signal.aborted) return;

      const entradanetEvents = entradanetResult.status === 'fulfilled' ? entradanetResult.value : [];
      const reservationEvents = reservationsResult.status === 'fulfilled'
        ? reservationsResult.value.map(reservationToEvent).filter((event): event is PublicEvent => Boolean(event))
        : [];
      setReservationLoadError(reservationsResult.status === 'rejected');
      setEntradanetLoadError(entradanetResult.status === 'rejected');

      if (entradanetResult.status === 'rejected' && reservationsResult.status === 'rejected') {
        throw new Error('All agenda sources unavailable');
      }

      setEvents([...entradanetEvents, ...reservationEvents]
        .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime()));
      setLastUpdatedAt(new Date());
    } catch (requestError) {
      if ((requestError as Error).name !== 'AbortError') {
        setError('No pudimos actualizar la agenda en este momento.');
      }
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { controller.abort(); setError('La conexión está demorando demasiado. Volvé a intentar.'); setIsLoading(false); }, 20000);
    void loadAgenda(controller.signal).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [loadAgenda, refreshKey, reservationRefreshKey]);

  const visibleEvents = useMemo(
    () => events.filter((event) => (!spaceId || event.spaceId === spaceId) && (categoryFilter === 'all' || event.category === categoryFilter) && matchesTime(
      event,
      timePreset,
      appliedCustomRange?.start || '',
      appliedCustomRange?.end || '',
    )),
    [appliedCustomRange, events, timePreset, categoryFilter, spaceId],
  );

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, PublicEvent[]>();
    visibleEvents.forEach((event) => {
      const key = dateKey(event.startsAt);
      grouped.set(key, [...(grouped.get(key) || []), event]);
    });
    return grouped;
  }, [visibleEvents]);

  const monthDays = useMemo(() => {
    const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const lastDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const firstGridDay = startOfWeek(firstDay);
    const lastWeekday = lastDay.getDay() === 0 ? 7 : lastDay.getDay();
    const lastGridDay = addDays(lastDay, 7 - lastWeekday);
    const days: Date[] = [];
    for (let day = firstGridDay; day <= lastGridDay; day = addDays(day, 1)) days.push(day);
    return days;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDate]);

  const periodLabel = useMemo(() => {
    if (mode === 'month') {
      return capitalize(anchorDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }));
    }
    if (mode === 'day') return formatFullDate(anchorDate);

    const start = startOfWeek(anchorDate);
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} al ${end.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return `${start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} al ${end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [anchorDate, mode]);

  const movePeriod = (direction: -1 | 1) => {
    let next: Date;
    if (mode === 'month') next = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1);
    else next = addDays(anchorDate, direction * (mode === 'week' ? 7 : 1));
    setAnchorDate(next);
    setSelectedDate(next);
  };

  const returnToToday = () => {
    const now = new Date();
    setAnchorDate(now);
    setSelectedDate(now);
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    setAnchorDate(date);
    window.requestAnimationFrame(() => {
      const panel = selectedDayPanelRef.current;
      if (!panel) return;
      panel.focus({ preventScroll: true });
      if (!window.matchMedia('(min-width: 1280px)').matches) panel.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const changeTimePreset = (preset: TimePreset) => {
    setTimePreset(preset);
    setCustomTimeError(null);
    if (preset !== 'custom') setAppliedCustomRange(null);
  };

  const applyCustomTime = () => {
    const start = timeToMinutes(customStart);
    const end = timeToMinutes(customEnd);
    if (start === null || end === null) {
      setCustomTimeError('Completá las dos horas para aplicar el filtro.');
      return;
    }
    if (start >= end) {
      setCustomTimeError('La hora “Hasta” debe ser posterior a la hora “Desde”.');
      return;
    }
    setAppliedCustomRange({ start: customStart, end: customEnd });
    setCustomTimeError(null);
  };

  const clearTimeFilter = () => {
    setCategoryFilter('all');
    setTimePreset('all');
    setAppliedCustomRange(null);
    setCustomTimeError(null);
  };

  const retryLoad = () => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((value) => value + 1);
  };

  const periodBounds = useMemo(() => {
    if (mode === 'month') {
      return {
        start: new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
        end: new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1),
      };
    }
    if (mode === 'week') {
      const start = startOfWeek(anchorDate);
      return { start, end: addDays(start, 7) };
    }
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
    return { start, end: addDays(start, 1) };
  }, [anchorDate, mode]);

  const periodEvents = useMemo(
    () => visibleEvents.filter((event) => event.startsAt >= periodBounds.start && event.startsAt < periodBounds.end),
    [periodBounds, visibleEvents],
  );
  const unfilteredPeriodEvents = useMemo(
    () => events.filter((event) => (!spaceId || event.spaceId === spaceId) && event.startsAt >= periodBounds.start && event.startsAt < periodBounds.end),
    [events, periodBounds, spaceId],
  );
  const nextEvent = useMemo(
    () => events.find((event) => (!spaceId || event.spaceId === spaceId) && event.startsAt >= periodBounds.end) || null,
    [events, periodBounds, spaceId],
  );

  const showNextEvent = () => {
    if (!nextEvent) return;
    setMode('day');
    setAnchorDate(nextEvent.startsAt);
    setSelectedDate(nextEvent.startsAt);
    clearTimeFilter();
  };

  const selectedDayEvents = eventsByDate.get(dateKey(selectedDate)) || [];

  return (
    <section aria-labelledby="agenda-title" className="space-y-5">
      <div className="team-actions" style={{ marginBottom: 16 }}><label>Sala <select aria-label="Filtrar agenda por sala" value={spaceId || ""} onChange={(event) => { window.location.hash = "#agenda" + (event.target.value ? "/" + event.target.value : ""); }}><option value="">Todas las salas</option>{RESERVABLE_SPACES.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>{spaceId && <a href={"#datos-tecnicos/" + spaceId}>Ver ficha de la sala</a>}</div>
      {spaceId && <p className="field-hint">Ocupaciones confirmadas de esta sala. Los eventos externos sin sala vinculada se consultan en «Todas las salas».</p>}
      <div className="agenda-heading">
        <div className="page-heading"><p className="eyebrow">ORGANIZAMOS LA CULTURA</p><h1 id="agenda-title">Mi agenda</h1><p>Todas las actividades del Virla. Horarios de Tucumán.</p></div>
        {onCreate && <button type="button" className="primary-button" onClick={onCreate}><Plus size={20} aria-hidden="true" />Crear agenda</button>}
      </div>
      <div className="agenda-toolbar">
        <div className="agenda-toolbar-top">
          <div className="view-switch" aria-label="Cómo ver la agenda"><button type="button" aria-pressed={display === 'calendar'} onClick={() => setDisplay('calendar')}><CalendarDays size={19} aria-hidden="true" />Calendario</button><button type="button" aria-pressed={display === 'list'} onClick={() => setDisplay('list')}><List size={19} aria-hidden="true" />Lista</button></div>
          <div className="agenda-tools"><button type="button" aria-expanded={filtersOpen} aria-controls="agenda-filters" className="secondary-button" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} aria-hidden="true" />Filtros{(categoryFilter !== 'all' || timePreset !== 'all') && <span className="filter-active">Activos</span>}</button><button type="button" className="icon-button" aria-label="Actualizar agenda" disabled={isLoading} onClick={retryLoad}><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" /></button></div>
        </div>
        <div className="agenda-datebar">
          <div className="agenda-period"><button type="button" className="icon-button" onClick={() => movePeriod(-1)} aria-label={MODE_LABELS[mode] + ' anterior'}><ChevronLeft size={20} /></button><strong aria-live="polite" aria-atomic="true">{periodLabel}</strong><button type="button" className="icon-button" onClick={() => movePeriod(1)} aria-label={MODE_LABELS[mode] + ' siguiente'}><ChevronRight size={20} /></button></div>
          <div className="agenda-period-options"><button type="button" className="today-button" onClick={returnToToday}>Hoy</button><label className="sr-only" htmlFor="calendar-period">Período de la agenda</label><select id="calendar-period" value={mode} onChange={(event) => setMode(event.target.value as CalendarMode)}>{(Object.keys(MODE_LABELS) as CalendarMode[]).map((value) => <option key={value} value={value}>{MODE_LABELS[value]}</option>)}</select></div>
        </div>
        {filtersOpen && <div id="agenda-filters" className="agenda-filters">
          <label>Categoría<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as AgendaCategoryId | 'all')}><option value="all">Todas las categorías</option>{AGENDA_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
          <label>Horario<select value={timePreset} onChange={(event) => changeTimePreset(event.target.value as TimePreset)}>{TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {timePreset === 'custom' && <div className="custom-time-fields"><label>Desde<input type="time" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>Hasta<input type="time" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label><button type="button" className="secondary-button" onClick={applyCustomTime}>Aplicar horario</button>{customTimeError && <p role="alert">{customTimeError}</p>}{appliedCustomRange && <p role="status">De {appliedCustomRange.start} a {appliedCustomRange.end} hs</p>}</div>}
          <button type="button" className="clear-filters" onClick={clearTimeFilter}>Quitar filtros</button>
          <ul className="category-legend" aria-label="Colores de las categorías">{AGENDA_CATEGORIES.map((category) => <li key={category.id}><span style={{ background: category.color }} aria-hidden="true" />{category.label}</li>)}</ul>
        </div>}
      </div>
      {entradanetLoadError && !error && <div className="agenda-source-warning" role="alert"><AlertCircle size={20} aria-hidden="true" /><p>No pudimos cargar las actividades de EntradaNet. La agenda puede estar incompleta.</p><button type="button" onClick={retryLoad}>Reintentar</button></div>}
      {reservationLoadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-base text-amber-950" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p><strong>Atención:</strong> no pudimos cargar las ocupaciones internas. Volvé a intentar antes de elegir un espacio.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center" role="status">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#0766f5]" aria-hidden="true" />
          <strong className="text-lg text-slate-900">Cargando la agenda…</strong>
          <span className="text-base text-slate-500">Puede demorar unos segundos.</span>
        </div>
      ) : error ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-amber-200 bg-white p-8 text-center" role="alert">
          <AlertCircle className="h-9 w-9 text-amber-600" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-slate-950">No pudimos mostrar la agenda</h2>
          <p className="mt-2 max-w-lg text-base leading-relaxed text-slate-600">{error} Podés volver a intentar o consultar EntradaNet.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={retryLoad}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0766f5] px-5 text-base font-bold text-white hover:bg-[#0655cf]"
            >
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              Volver a intentar
            </button>
            <a
              href={ENTRADANET_BASE_URL}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-base font-bold text-slate-800 hover:bg-slate-50"
              aria-label="Ir a EntradaNet"
            >
              Ver EntradaNet
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : (display === 'list' || mode === 'week') && periodEvents.length === 0 ? (
        <EmptyPeriodState
          mode={mode}
          hasHiddenEvents={unfilteredPeriodEvents.length > 0}
          nextEvent={nextEvent}
          onClearTimeFilter={clearTimeFilter}
          onShowNextEvent={showNextEvent}
        />
      ) : display === 'list' ? (
        <div className="space-y-4">{Array.from(new Set(periodEvents.map((event) => dateKey(event.startsAt)))).map((key) => <DayPanel key={key} date={new Date(key + 'T12:00:00')} events={eventsByDate.get(key) || []} isToday={key === dateKey(today)} onSelectEvent={setSelectedEvent} />)}</div>
      ) : mode === 'month' ? (
        <MonthCalendar
          anchorDate={anchorDate}
          days={monthDays}
          eventsByDate={eventsByDate}
          selectedDate={selectedDate}
          today={today}
          onSelectDay={selectDay}
          selectedDayEvents={selectedDayEvents}
          selectedDayPanelRef={selectedDayPanelRef}
          onSelectEvent={setSelectedEvent}
        />
      ) : mode === 'week' ? (
        <div className="space-y-3">
          {weekDays.map((day) => (
            <DayPanel key={dateKey(day)} date={day} events={eventsByDate.get(dateKey(day)) || []} isToday={sameDay(day, today)} onSelectEvent={setSelectedEvent} />
          ))}
        </div>
      ) : (
        <DayPanel date={anchorDate} events={eventsByDate.get(dateKey(anchorDate)) || []} isToday={sameDay(anchorDate, today)} expanded onSelectEvent={setSelectedEvent} />
      )}

      <div className="agenda-footnote"><span><Info size={16} aria-hidden="true" /> Incluye ocupaciones internas y actividades de EntradaNet.</span>{lastUpdatedAt && !isLoading && !error && <span>Actualizada {lastUpdatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>}</div>
      <details className="agenda-data-note"><summary>Antes de reservar un espacio</summary><p>EntradaNet puede no informar la sala ni la duración. Confirmá esos datos antes de registrar otra ocupación. Los eventos sin categoría informada se muestran como “Sin clasificar”.</p></details>
      {selectedEvent && <AgendaEventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </section>
  );
};

interface EmptyPeriodStateProps {
  mode: CalendarMode;
  hasHiddenEvents: boolean;
  nextEvent: PublicEvent | null;
  onClearTimeFilter: () => void;
  onShowNextEvent: () => void;
}

const EmptyPeriodState: React.FC<EmptyPeriodStateProps> = ({
  mode,
  hasHiddenEvents,
  nextEvent,
  onClearTimeFilter,
  onShowNextEvent,
}) => (
  <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm" role="status">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
      <CalendarDays className="h-7 w-7 text-slate-400" aria-hidden="true" />
    </span>
    <h2 className="mt-4 text-xl font-bold text-slate-950">
      {hasHiddenEvents
        ? 'Hay actividades, pero no coinciden con los filtros'
        : `No hay ocupaciones ni actividades ${mode === 'month' ? 'este mes' : mode === 'week' ? 'esta semana' : 'este día'}`}
    </h2>
    <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
      {hasHiddenEvents
        ? 'Quitá los filtros de categoría y horario para ver todas las actividades.'
        : 'Podés cambiar de fecha con los botones Anterior y Siguiente.'}
    </p>
    {nextEvent && !hasHiddenEvents && (
      <p className="mt-3 text-sm font-semibold text-slate-600">
        Próxima actividad u ocupación: {formatFullDate(nextEvent.startsAt)}, {nextEvent.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs.
      </p>
    )}
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      {hasHiddenEvents && (
        <button
          type="button"
          onClick={onClearTimeFilter}
          className="min-h-11 rounded-xl bg-[#0766f5] px-5 text-base font-bold text-white hover:bg-[#0655cf]"
        >
          Mostrar todas las actividades
        </button>
      )}
      {nextEvent && !hasHiddenEvents && (
        <button
          type="button"
          onClick={onShowNextEvent}
          className="min-h-11 rounded-xl bg-[#0766f5] px-5 text-base font-bold text-white hover:bg-[#0655cf]"
        >
          Ver lo próximo
        </button>
      )}
    </div>
  </section>
);

interface MonthCalendarProps {
  anchorDate: Date;
  days: Date[];
  eventsByDate: Map<string, PublicEvent[]>;
  selectedDate: Date;
  today: Date;
  onSelectDay: (date: Date) => void;
  selectedDayEvents: PublicEvent[];
  selectedDayPanelRef: React.Ref<HTMLElement>;
  onSelectEvent: (event: PublicEvent) => void;
}

const MonthCalendar: React.FC<MonthCalendarProps> = ({
  anchorDate,
  days,
  eventsByDate,
  selectedDate,
  today,
  onSelectDay,
  selectedDayEvents,
  selectedDayPanelRef,
  onSelectEvent,
}) => (
  <div className="month-layout">
    <div className="month-grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-600">
        Elegí un día para ver sus actividades.
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-blue-50 text-center text-xs font-bold uppercase tracking-wide text-blue-800 sm:text-sm">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <div key={day} className="px-1 py-3">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {days.map((day) => {
          const dayEvents = eventsByDate.get(dateKey(day)) || [];
          const belongsToMonth = day.getMonth() === anchorDate.getMonth();
          const isSelected = sameDay(day, selectedDate);
          const isToday = sameDay(day, today);
          const eventLabel = dayEvents.length === 0
            ? 'sin ocupaciones ni actividades'
            : `${dayEvents.length} ${dayEvents.length === 1 ? 'actividad u ocupación' : 'actividades u ocupaciones'}`;

          return (
            <button
              key={dateKey(day)}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={`${formatFullDate(day)}, ${eventLabel}`}
              aria-pressed={isSelected}
              aria-controls="selected-day-details"
              className={`calendar-day min-h-16 min-w-0 p-1.5 text-left transition sm:min-h-24 sm:p-2 ${
                belongsToMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'
              } ${isSelected ? 'relative z-10 ring-3 ring-inset ring-[#0766f5]' : 'hover:bg-blue-50'}`}
            >
              <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-base font-bold ${
                isToday ? 'bg-[#0766f5] text-white' : belongsToMonth ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {day.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <>
                  <span className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    {Array.from(new Set(dayEvents.map((event) => event.category))).map((category) => (
                      <span key={category} className="h-2 w-3 rounded-sm" style={{ backgroundColor: getAgendaCategory(category).color }} aria-hidden="true" />
                    ))}
                    <span className="w-full text-sm font-bold text-slate-700">{dayEvents.length}</span>
                  </span>
                  <span className="mt-1 hidden space-y-1 sm:block">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span key={event.id} style={categoryStyle(event.category)} className="block truncate rounded-md border-l-4 px-1.5 py-1 text-xs font-bold" title={`${getAgendaCategory(event.category).label} · ${event.title}`}>
                        {event.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {event.title}
                        <span className="block truncate font-normal">{getAgendaCategory(event.category).label}</span>
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="block px-1 text-xs font-bold text-slate-500">+ {dayEvents.length - 2} más</span>}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>

    <DayPanel
      date={selectedDate}
      events={selectedDayEvents}
      isToday={sameDay(selectedDate, today)}
      expanded
      panelId="selected-day-details"
      panelRef={selectedDayPanelRef}
      onSelectEvent={onSelectEvent}
    />
  </div>
);

interface DayPanelProps {
  date: Date;
  events: PublicEvent[];
  isToday: boolean;
  expanded?: boolean;
  panelId?: string;
  panelRef?: React.Ref<HTMLElement>;
  onSelectEvent: (event: PublicEvent) => void;
}

const DayPanel: React.FC<DayPanelProps> = ({ date, events, isToday, expanded = false, panelId, panelRef, onSelectEvent }) => (
  <section
    id={panelId}
    ref={panelRef}
    tabIndex={panelRef ? -1 : undefined}
    className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-3 focus:ring-[#0766f5]"
    aria-labelledby={`day-${dateKey(date)}`}
  >
    <div className={`flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${isToday ? 'bg-blue-50' : 'bg-slate-50'}`}>
      <h2 id={`day-${dateKey(date)}`} className={`${expanded ? 'text-xl' : 'text-lg'} font-bold text-slate-950`}>{formatFullDate(date)}</h2>
      <span className="text-sm font-semibold text-slate-500">
        {isToday ? 'Hoy · ' : ''}{events.length} {events.length === 1 ? 'actividad' : 'actividades'}
      </span>
    </div>
    {events.length === 0 ? (
      <div className="flex min-h-24 items-center gap-3 px-4 py-5 text-base text-slate-500 sm:px-5">
        <CalendarDays className="h-6 w-6 shrink-0 text-slate-300" aria-hidden="true" />
        <span>No hay ocupaciones ni actividades para este día con los filtros elegidos.</span>
      </div>
    ) : (
      <div className="divide-y divide-slate-100">
        {events.map((event) => <EventRow key={event.id} event={event} onOpen={() => onSelectEvent(event)} />)}
      </div>
    )}
  </section>
);

const EventRow: React.FC<{ event: PublicEvent; onOpen: () => void }> = ({ event, onOpen }) => (
  <button type="button" onClick={onOpen} aria-label={"Ver ficha completa de " + event.title} style={categoryStyle(event.category)} className="event-row">
    <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-white/80 px-3 py-2 font-bold">
      <Clock3 className="h-5 w-5" aria-hidden="true" />
      <time dateTime={toLocalDateTime(event.startsAt)}>
        {event.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        {event.endsAt ? `–${event.endsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''} hs
      </time>
    </div>
    <div className="min-w-0">
      <span className="mb-2 mr-2 inline-flex rounded-full border bg-white/80 px-2.5 py-1 text-sm font-bold" style={{ borderColor: getAgendaCategory(event.category).color }}>
        {getAgendaCategory(event.category).label}
      </span>
      <span className="mb-2 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-sm text-slate-600">
        {event.source === 'reservation' ? 'Espacio ocupado' : 'Actividad publicada'}
      </span>
      <h3 className="text-lg font-bold leading-snug text-slate-950">{event.title}</h3>
      <p className="mt-2 flex items-start gap-2 text-base leading-relaxed text-slate-600">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#0766f5]" aria-hidden="true" />
        <span>{event.location}</span>
      </p>
      {event.responsibleName && (
        <p className="mt-2 flex items-start gap-2 text-base leading-relaxed text-slate-600">
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#0766f5]" aria-hidden="true" />
          <span>Responsable: <strong className="text-slate-800">{event.responsibleName}</strong>{event.organization ? ` · ${event.organization}` : ''}</span>
        </p>
      )}
    </div>
    <ChevronRight className="event-row-arrow" size={20} aria-hidden="true" />
  </button>
);

const AgendaEventDetail: React.FC<{ event: PublicEvent; onClose: () => void }> = ({ event, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose();
      if (keyboardEvent.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]');
        if (!focusable?.length) { keyboardEvent.preventDefault(); return; }
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (keyboardEvent.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { keyboardEvent.preventDefault(); last.focus(); }
        else if (!keyboardEvent.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { keyboardEvent.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  const dateLabel = formatFullDate(event.startsAt);
  const timeLabel = `${event.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}${
    event.endsAt ? ` a ${event.endsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''
  } hs`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
        tabIndex={-1}
        style={{ borderTopColor: getAgendaCategory(event.category).color }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t-8 bg-white p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span style={categoryStyle(event.category)} className="mr-2 inline-flex rounded-full border px-3 py-1 text-sm font-bold">{getAgendaCategory(event.category).label}</span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {event.source === 'reservation' ? 'Espacio ocupado · Confirmado' : 'Publicado en EntradaNet'}
            </span>
            <h2 id="event-detail-title" className="mt-3 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{event.title}</h2>
            {event.activityTypeLabel && <p className="mt-2 text-base font-semibold text-[#0766f5]">{event.activityTypeLabel}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            aria-label="Cerrar ficha"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.imageAlt || ''}
            className="mt-6 max-h-80 w-full rounded-2xl border border-slate-200 bg-slate-100 object-contain"
          />
        )}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <h3 className="font-bold text-slate-950">Descripción</h3>
          {event.description ? (
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-slate-700">{event.description}</p>
          ) : (
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              EntradaNet no publicó una descripción adicional para esta actividad. Podés consultar la información de entradas desde el botón al final de la ficha.
            </p>
          )}
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-5 w-5 text-[#0766f5]" aria-hidden="true" />
              Fecha
            </dt>
            <dd className="mt-2 text-base font-bold text-slate-950">{dateLabel}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Clock3 className="h-5 w-5 text-[#0766f5]" aria-hidden="true" />
              Horario
            </dt>
            <dd className="mt-2 text-base font-bold text-slate-950">{timeLabel}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
            <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Building2 className="h-5 w-5 text-[#0766f5]" aria-hidden="true" />
              Espacio
            </dt>
            <dd className="mt-2 text-base font-bold text-slate-950">{event.location}</dd>
          </div>
          {event.responsibleName && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <UserRound className="h-5 w-5 text-[#0766f5]" aria-hidden="true" />
                Responsable
              </dt>
              <dd className="mt-2 text-base font-bold text-slate-950">{event.responsibleName}</dd>
              {event.organization && <dd className="mt-1 text-base text-slate-600">{event.organization}</dd>}
            </div>
          )}
          {event.expectedAttendance && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <UsersRound className="h-5 w-5 text-[#0766f5]" aria-hidden="true" />
                Asistencia estimada
              </dt>
              <dd className="mt-2 text-base font-bold text-slate-950">{event.expectedAttendance} personas</dd>
            </div>
          )}
        </dl>

        {event.source === 'entradanet' && !event.endsAt && (
          <p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-base leading-relaxed text-blue-950">
            EntradaNet informa el horario de inicio, pero no la sala ni la duración. Confirmá esos datos antes de registrar otra ocupación.
          </p>
        )}

        {shareStatus && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-blue-50 p-3 text-blue-900" role="status">{shareStatus}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="secondary-button" onClick={async () => {
            const text = [event.title, dateLabel, timeLabel, event.location, event.description, event.link].filter(Boolean).join('\n');
            try { if (navigator.share) await navigator.share({ title: event.title, text }); else { await navigator.clipboard.writeText(text); setShareStatus('Información copiada. Ya podés compartirla.'); } }
            catch (error) { if ((error as Error).name !== 'AbortError') setShareStatus('Podés copiar esta información para compartirla:\n' + text); }
          }}><Share2 size={18} aria-hidden="true" />Compartir</button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
          {event.link && (
            <a
              href={event.link}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0766f5] px-6 text-base font-bold text-white hover:bg-[#0655cf]"
            >
              Ver entradas en EntradaNet
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
