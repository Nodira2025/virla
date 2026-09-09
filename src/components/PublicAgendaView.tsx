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
  LoaderCircle,
  MapPin,
  RefreshCw,
  UsersRound,
  UserRound,
  X,
} from 'lucide-react';
import type { PublicReservation } from '../domain/reservations';
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
    title: reservation.title,
    startsAt,
    endsAt,
    location: reservation.spaceName,
    source: 'reservation',
    responsibleName: reservation.responsibleName,
    organization: reservation.organization,
    description: reservation.description,
    activityTypeLabel: reservation.activityTypeLabel,
    expectedAttendance: reservation.expectedAttendance,
  };
};

interface PublicAgendaViewProps {
  reservationRefreshKey?: number;
}

export const PublicAgendaView: React.FC<PublicAgendaViewProps> = ({ reservationRefreshKey = 0 }) => {
  const today = useMemo(() => new Date(), []);
  const selectedDayPanelRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('23:59');
  const [appliedCustomRange, setAppliedCustomRange] = useState<CustomTimeRange | null>(null);
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservationLoadError, setReservationLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);

  const loadAgenda = useCallback(async (signal: AbortSignal) => {
    try {
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
    void loadAgenda(controller.signal);
    return () => controller.abort();
  }, [loadAgenda, refreshKey, reservationRefreshKey]);

  const visibleEvents = useMemo(
    () => events.filter((event) => matchesTime(
      event,
      timePreset,
      appliedCustomRange?.start || '',
      appliedCustomRange?.end || '',
    )),
    [appliedCustomRange, events, timePreset],
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
      panel.scrollIntoView({
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
    () => events.filter((event) => event.startsAt >= periodBounds.start && event.startsAt < periodBounds.end),
    [events, periodBounds],
  );
  const nextEvent = useMemo(
    () => events.find((event) => event.startsAt >= periodBounds.end) || null,
    [events, periodBounds],
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-bold uppercase tracking-[0.12em] text-[#007F8C]">Centro Cultural Virla</p>
          <h1 id="agenda-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Agenda del Virla</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            Elegí cómo querés verla. Todos los horarios corresponden a Tucumán.
          </p>
        </div>
        {lastUpdatedAt && !isLoading && !error && (
          <p className="text-sm text-slate-500" aria-live="polite">
            Actualizada hoy a las {lastUpdatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">Ver agenda por</legend>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1" aria-label="Elegir vista de calendario">
              {(Object.keys(MODE_LABELS) as CalendarMode[]).map((calendarMode) => (
                <button
                  key={calendarMode}
                  type="button"
                  onClick={() => setMode(calendarMode)}
                  aria-pressed={mode === calendarMode}
                  className={`min-h-11 rounded-lg px-4 py-2 text-base font-bold transition ${
                    mode === calendarMode
                      ? 'bg-[#004a7f] text-white shadow-sm'
                      : 'bg-transparent text-slate-700 hover:bg-white'
                  }`}
                >
                  {MODE_LABELS[calendarMode]}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <span className="mb-2 block text-sm font-bold text-slate-700">Fecha</span>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <button
                type="button"
                onClick={() => movePeriod(-1)}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-700 hover:bg-slate-50"
                aria-label={`${mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'} anterior`}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <strong className="px-2 text-center text-base leading-tight text-slate-950 sm:text-lg" aria-live="polite" aria-atomic="true">{periodLabel}</strong>
              <button
                type="button"
                onClick={() => movePeriod(1)}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-700 hover:bg-slate-50"
                aria-label={`${mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'} siguiente`}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:block">
            <label className="block text-sm font-bold text-slate-700">
              Horario
              <select
                value={timePreset}
                onChange={(event) => changeTimePreset(event.target.value as TimePreset)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-800 outline-none focus:border-[#007F8C] focus:ring-2 focus:ring-[#007F8C]/20 lg:min-w-56"
              >
                {TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={returnToToday}
              className="min-h-11 self-end rounded-xl border border-[#004a7f] bg-white px-4 text-base font-bold text-[#004a7f] hover:bg-blue-50 lg:mt-3 lg:w-full"
            >
              Ir a hoy
            </button>
          </div>
        </div>

        {timePreset === 'custom' && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-sm font-bold text-slate-700">
              Desde
              <input
                type="time"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Hasta
              <input
                type="time"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={applyCustomTime}
                className="min-h-11 rounded-xl bg-[#004a7f] px-5 text-base font-bold text-white hover:bg-[#003865]"
              >
                Aplicar horario
              </button>
              <button
                type="button"
                onClick={clearTimeFilter}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-base font-bold text-slate-700 hover:bg-slate-50"
              >
                Quitar filtro
              </button>
            </div>
            <div className="basis-full">
              {customTimeError ? (
                <p className="font-semibold text-red-700" role="alert">{customTimeError}</p>
              ) : appliedCustomRange ? (
                <p className="font-semibold text-[#004a7f]" role="status">
                  Mostrando actividades que comienzan entre {appliedCustomRange.start} y {appliedCustomRange.end} hs.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600">Elegí las dos horas y tocá “Aplicar horario”.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-base leading-relaxed text-blue-950">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#004a7f]" aria-hidden="true" />
        <p><strong>Qué muestra esta agenda:</strong> las ocupaciones cargadas por el equipo y las actividades publicadas en EntradaNet. Como EntradaNet no informa la sala ni la duración, esas actividades deben confirmarse antes de ocupar un espacio.</p>
      </div>

      {reservationLoadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-base text-amber-950" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p><strong>Atención:</strong> no pudimos cargar las ocupaciones internas. Volvé a intentar antes de elegir un espacio.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center" role="status">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#007F8C]" aria-hidden="true" />
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004a7f] px-5 text-base font-bold text-white hover:bg-[#003865]"
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
      ) : mode !== 'day' && periodEvents.length === 0 ? (
        <EmptyPeriodState
          mode={mode}
          hasHiddenEvents={unfilteredPeriodEvents.length > 0}
          nextEvent={nextEvent}
          onClearTimeFilter={clearTimeFilter}
          onShowNextEvent={showNextEvent}
        />
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

      {selectedEvent && <AgendaEventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </section>
  );
};

interface EmptyPeriodStateProps {
  mode: Exclude<CalendarMode, 'day'>;
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
        ? 'Hay actividades, pero no dentro del horario elegido'
        : `No hay ocupaciones ni actividades ${mode === 'month' ? 'este mes' : 'esta semana'}`}
    </h2>
    <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
      {hasHiddenEvents
        ? 'Podés volver a ver el día completo.'
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
          className="min-h-11 rounded-xl bg-[#004a7f] px-5 text-base font-bold text-white hover:bg-[#003865]"
        >
          Mostrar todo el día
        </button>
      )}
      {nextEvent && !hasHiddenEvents && (
        <button
          type="button"
          onClick={onShowNextEvent}
          className="min-h-11 rounded-xl bg-[#004a7f] px-5 text-base font-bold text-white hover:bg-[#003865]"
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
  <div className="space-y-4">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-600">
        Tocá un día para ver sus actividades debajo del calendario.
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-[#061f35] text-center text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
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
              className={`min-h-20 min-w-0 p-1.5 text-left transition sm:min-h-32 sm:p-2 ${
                belongsToMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'
              } ${isSelected ? 'relative z-10 ring-3 ring-inset ring-[#007F8C]' : 'hover:bg-blue-50'}`}
            >
              <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-base font-bold ${
                isToday ? 'bg-[#004a7f] text-white' : belongsToMonth ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {day.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <>
                  <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e1f2fb] text-sm font-bold text-[#004a7f] sm:hidden">{dayEvents.length}</span>
                  <span className="mt-1 hidden space-y-1 sm:block">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span key={event.id} className={`block truncate rounded-md px-1.5 py-1 text-xs font-bold ${
                        event.source === 'reservation'
                          ? 'bg-amber-100 text-amber-950'
                          : 'bg-[#e1f2fb] text-[#003865]'
                      }`}>
                        {event.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {event.title}
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
    className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-3 focus:ring-[#007F8C]"
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
        <span>No hay ocupaciones ni actividades para este día y horario.</span>
      </div>
    ) : (
      <div className="divide-y divide-slate-100">
        {events.map((event) => <EventRow key={event.id} event={event} onOpen={() => onSelectEvent(event)} />)}
      </div>
    )}
  </section>
);

const EventRow: React.FC<{ event: PublicEvent; onOpen: () => void }> = ({ event, onOpen }) => (
  <article className="grid gap-4 px-4 py-5 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:px-5">
    <div className={`inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 font-bold ${
      event.source === 'reservation' ? 'bg-amber-100 text-amber-950' : 'bg-[#e1f2fb] text-[#003865]'
    }`}>
      <Clock3 className="h-5 w-5" aria-hidden="true" />
      <time dateTime={toLocalDateTime(event.startsAt)}>
        {event.startsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        {event.endsAt ? `–${event.endsAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''} hs
      </time>
    </div>
    <div className="min-w-0">
      <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-sm font-bold ${
        event.source === 'reservation'
          ? 'bg-amber-100 text-amber-950'
          : 'bg-blue-100 text-blue-900'
      }`}>
        {event.source === 'reservation' ? 'Espacio ocupado' : 'Actividad publicada'}
      </span>
      <h3 className="text-lg font-bold leading-snug text-slate-950">{event.title}</h3>
      <p className="mt-2 flex items-start gap-2 text-base leading-relaxed text-slate-600">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#007F8C]" aria-hidden="true" />
        <span>{event.location}</span>
      </p>
      {event.responsibleName && (
        <p className="mt-2 flex items-start gap-2 text-base leading-relaxed text-slate-600">
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#007F8C]" aria-hidden="true" />
          <span>Responsable: <strong className="text-slate-800">{event.responsibleName}</strong>{event.organization ? ` · ${event.organization}` : ''}</span>
        </p>
      )}
    </div>
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#004a7f] px-4 text-base font-bold text-white transition hover:bg-[#003865]"
      aria-label={`Ver ficha completa de ${event.title}`}
    >
      Ver ficha completa
    </button>
  </article>
);

const AgendaEventDetail: React.FC<{ event: PublicEvent; onClose: () => void }> = ({ event, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
              event.source === 'reservation' ? 'bg-amber-100 text-amber-950' : 'bg-blue-100 text-blue-900'
            }`}>
              {event.source === 'reservation' ? 'Espacio ocupado · Confirmado' : 'Publicado en EntradaNet'}
            </span>
            <h2 id="event-detail-title" className="mt-3 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{event.title}</h2>
            {event.activityTypeLabel && <p className="mt-2 text-base font-semibold text-[#007F8C]">{event.activityTypeLabel}</p>}
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
              <CalendarDays className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
              Fecha
            </dt>
            <dd className="mt-2 text-base font-bold text-slate-950">{dateLabel}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Clock3 className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
              Horario
            </dt>
            <dd className="mt-2 text-base font-bold text-slate-950">{timeLabel}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
            <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Building2 className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
              Espacio
            </dt>
            <dd className="mt-2 text-base font-bold text-slate-950">{event.location}</dd>
          </div>
          {event.responsibleName && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <UserRound className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
                Responsable
              </dt>
              <dd className="mt-2 text-base font-bold text-slate-950">{event.responsibleName}</dd>
              {event.organization && <dd className="mt-1 text-base text-slate-600">{event.organization}</dd>}
            </div>
          )}
          {event.expectedAttendance && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <UsersRound className="h-5 w-5 text-[#007F8C]" aria-hidden="true" />
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

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#004a7f] px-6 text-base font-bold text-white hover:bg-[#003865]"
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
