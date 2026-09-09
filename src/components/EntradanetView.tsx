import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Link2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
} from 'lucide-react';
import { useVirla } from '../context/VirlaContext';
import {
  ENTRADANET_BASE_URL,
  ENTRADANET_EVENTS_API,
  isEntradanetUrl,
} from '../infrastructure/entradanet';

interface EntradanetEvent {
  id: number;
  link: string;
  title: { rendered: string };
  event_date_time: string;
  event_end_date_time: string;
  event_location: string;
}

const decodeHtml = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const cleanEventTitle = (value: string) =>
  decodeHtml(value)
    .replace(/\s+[–-]\s+\d{2}\/\d{2}\/\d{4}\s+[–-]\s+\d{1,2}[.:]\d{2}\s*hs\s*$/i, '')
    .trim();

const parseEntradanetDate = (value: string) => new Date(value.replace(' ', 'T'));

const isUpcoming = (value: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = parseEntradanetDate(value);
  return !Number.isNaN(eventDate.getTime()) && eventDate >= today;
};

export const EntradanetView: React.FC = () => {
  const { events } = useVirla();
  const [publicEvents, setPublicEvents] = useState<EntradanetEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPublicAgenda = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const firstResponse = await fetch(`${ENTRADANET_EVENTS_API}&page=1`, {
        signal,
        headers: { Accept: 'application/json' },
      });

      if (!firstResponse.ok) throw new Error(`HTTP ${firstResponse.status}`);

      const firstPage = (await firstResponse.json()) as EntradanetEvent[];
      const totalPages = Math.min(
        Math.max(Number(firstResponse.headers.get('X-WP-TotalPages') || '1'), 1),
        10,
      );

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
          const response = await fetch(`${ENTRADANET_EVENTS_API}&page=${page}`, {
            signal,
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return (await response.json()) as EntradanetEvent[];
        }),
      );

      const upcoming = [...firstPage, ...remainingPages.flat()]
        .filter((event) => isUpcoming(event.event_date_time))
        .sort(
          (a, b) =>
            parseEntradanetDate(a.event_date_time).getTime() -
            parseEntradanetDate(b.event_date_time).getTime(),
        );

      setPublicEvents(upcoming);
      setLastUpdatedAt(new Date());
    } catch (requestError) {
      if ((requestError as Error).name !== 'AbortError') {
        setError('No pudimos leer la agenda pública en este momento.');
      }
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPublicAgenda(controller.signal);
    return () => controller.abort();
  }, [loadPublicAgenda, refreshKey]);

  const filteredPublicEvents = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('es-AR');
    if (!query) return publicEvents;

    return publicEvents.filter((event) => {
      const title = cleanEventTitle(event.title.rendered).toLocaleLowerCase('es-AR');
      const location = event.event_location.toLocaleLowerCase('es-AR');
      return title.includes(query) || location.includes(query);
    });
  }, [publicEvents, searchTerm]);

  const internalUpcoming = events.filter(
    (event) => !['REALIZADO', 'CANCELADO'].includes(event.state),
  );
  const publishedCount = internalUpcoming.filter(
    (event) => event.ticketing.isPublishedOnWeb,
  ).length;
  const linkedCount = internalUpcoming.filter(
    (event) => event.ticketing.isPublishedOnWeb && isEntradanetUrl(event.ticketing.ticketLink),
  ).length;
  const needsLink = internalUpcoming.filter(
    (event) => event.ticketing.isPublishedOnWeb && !isEntradanetUrl(event.ticketing.ticketLink),
  );

  return (
    <section className="space-y-6" aria-labelledby="entradanet-heading">
      <div className="entradanet-grid relative overflow-hidden rounded-3xl bg-[#061f35] text-white shadow-lg shadow-slate-900/10">
        <div className="relative grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-9 lg:py-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-200/10 px-3 py-1 text-sm font-semibold text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-[#62BCFF]" aria-hidden="true" />
              Plataforma oficial de agenda y entradas
            </div>
            <h2 id="entradanet-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Agenda pública <span className="text-[#62BCFF]">EntradaNet</span>
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-200">
              Consultá lo que ya ve el público y verificá que cada actividad interna tenga su enlace de publicación antes de difundirla.
            </p>
          </div>

          <a
            href={ENTRADANET_BASE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir la agenda pública de EntradaNet (se abre en otra pestaña)"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#061f35] shadow-sm transition hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:self-center"
          >
            Abrir agenda pública
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid border-t border-white/10 bg-white/5 sm:grid-cols-3">
          <div className="border-b border-white/10 px-5 py-4 sm:border-b-0 sm:border-r sm:px-7">
            <span className="text-sm text-slate-300">Próximos en EntradaNet</span>
            <strong className="mt-1 flex items-center gap-2 text-2xl">
              <CalendarCheck2 className="h-5 w-5 text-[#62BCFF]" aria-hidden="true" />
              {isLoading ? '—' : publicEvents.length}
            </strong>
          </div>
          <div className="border-b border-white/10 px-5 py-4 sm:border-b-0 sm:border-r sm:px-7">
            <span className="text-sm text-slate-300">Marcados como publicados</span>
            <strong className="mt-1 flex items-center gap-2 text-2xl">
              <Globe2 className="h-5 w-5 text-[#62BCFF]" aria-hidden="true" />
              {publishedCount}
            </strong>
          </div>
          <div className="px-5 py-4 sm:px-7">
            <span className="text-sm text-slate-300">Con enlace de EntradaNet</span>
            <strong className="mt-1 flex items-center gap-2 text-2xl">
              <Link2 className="h-5 w-5 text-[#62BCFF]" aria-hidden="true" />
              {linkedCount}
            </strong>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.7fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Cartelera publicada</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Datos en vivo desde elvirla.entradanet.com
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative block min-w-0 sm:w-64">
                <span className="sr-only">Buscar en la cartelera pública</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar espectáculo…"
                  className="min-h-10 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#007F8C] focus:ring-2 focus:ring-[#007F8C]/20"
                />
              </label>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={isLoading}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-wait disabled:opacity-60"
                aria-label="Actualizar agenda pública"
                title="Actualizar agenda pública"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-12 text-slate-500" role="status">
              <LoaderCircle className="h-7 w-7 animate-spin text-[#007F8C]" aria-hidden="true" />
              <span className="text-sm font-semibold">Leyendo la agenda pública…</span>
            </div>
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-amber-600" aria-hidden="true" />
              <h4 className="mt-3 text-base font-bold text-slate-900">Agenda temporalmente no disponible</h4>
              <p className="mt-1 max-w-md text-sm text-slate-500">{error} Podés abrir EntradaNet o volver a intentar.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#004a7f] px-4 py-2 text-sm font-bold text-white hover:bg-[#003865]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </button>
                <a
                  href={ENTRADANET_BASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ir a EntradaNet (se abre en otra pestaña)"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Ir a EntradaNet
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          ) : filteredPublicEvents.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <Ticket className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <h4 className="mt-3 text-base font-bold text-slate-900">Sin resultados</h4>
              <p className="mt-1 text-sm text-slate-500">Probá con otro nombre o quitá la búsqueda.</p>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {filteredPublicEvents.map((event) => {
                const start = parseEntradanetDate(event.event_date_time);
                const title = cleanEventTitle(event.title.rendered);

                return (
                  <article key={event.id} className="ticket-card group relative flex min-h-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-[#3F82BC] hover:bg-white hover:shadow-md">
                    <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-dashed border-slate-300 bg-[#eaf5fb] px-2 text-center text-[#003865]">
                      <span className="text-xs font-bold uppercase tracking-[0.12em]">
                        {start.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}
                      </span>
                      <strong className="text-3xl leading-none">{start.getDate()}</strong>
                      <span className="mt-1 text-xs font-semibold capitalize">
                        {start.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <h4 className="line-clamp-2 text-base font-bold leading-snug text-slate-950">{title}</h4>
                      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 shrink-0 text-[#007F8C]" aria-hidden="true" />
                          <span>{start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#007F8C]" aria-hidden="true" />
                          <span className="line-clamp-1">{event.event_location || 'Centro Cultural Virla'}</span>
                        </div>
                      </div>
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-[#004a7f] transition group-hover:text-[#007F8C]"
                        aria-label={`Ver ${title} en EntradaNet (se abre en otra pestaña)`}
                      >
                        Ver evento y entradas
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {lastUpdatedAt && !isLoading && !error && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:px-6">
              Actualizado a las {lastUpdatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="publication-check-heading">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf5fb] text-[#004a7f]">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="publication-check-heading" className="text-base font-bold text-slate-950">Control de publicación</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Un evento queda listo cuando está marcado como publicado y tiene su URL oficial.
              </p>
            </div>
          </div>

          {needsLink.length > 0 ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900">
                {needsLink.length} {needsLink.length === 1 ? 'actividad necesita' : 'actividades necesitan'} enlace de EntradaNet.
              </div>
              <ul className="divide-y divide-slate-100">
                {needsLink.slice(0, 4).map((event) => (
                  <li key={event.id} className="py-3">
                    <span className="block text-sm font-bold leading-snug text-slate-800">{event.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {new Date(event.startDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-relaxed text-slate-500">
                Completá los enlaces desde <strong>Boletería &amp; EntradaNet</strong>.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong className="block">Publicaciones vinculadas</strong>
              <span className="mt-1 block leading-relaxed text-emerald-800">Todas las actividades publicadas tienen un enlace oficial válido.</span>
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-5">
            <a
              href={`${ENTRADANET_BASE_URL}ayuda-rapida/`}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir la ayuda de compra de EntradaNet (se abre en otra pestaña)"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#004a7f] hover:text-[#007F8C]"
            >
              Ver ayuda de compra
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
};
