import React, { useMemo, useState } from 'react';
import { useVirla } from '../context/VirlaContext';
import { CONTRACT_LABELS, VIRLA_SPACES } from '../infrastructure/mockData';
import type { EventItem } from '../domain/types';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  FileCheck2,
  Globe2,
  Link2,
  Save,
  Ticket,
} from 'lucide-react';
import { ENTRADANET_BASE_URL, isEntradanetUrl } from '../infrastructure/entradanet';

interface TicketingFormState {
  isFree: boolean;
  priceGeneral: number;
  priceStudentDiscount: number;
  saleConditions: string;
  isPublishedOnWeb: boolean;
  ticketLink: string;
}

const EMPTY_FORM: TicketingFormState = {
  isFree: false,
  priceGeneral: 0,
  priceStudentDiscount: 0,
  saleConditions: '',
  isPublishedOnWeb: false,
  ticketLink: '',
};

export const TicketingView: React.FC = () => {
  const { events, updateTicketing } = useVirla();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formState, setFormState] = useState<TicketingFormState>(EMPTY_FORM);
  const [linkError, setLinkError] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [events],
  );
  const publishedCount = events.filter((event) => event.ticketing.isPublishedOnWeb).length;
  const linkedCount = events.filter(
    (event) => event.ticketing.isPublishedOnWeb && isEntradanetUrl(event.ticketing.ticketLink),
  ).length;
  const pendingCount = events.filter((event) => !event.ticketing.isPublishedOnWeb).length;

  const handleStartEdit = (event: EventItem) => {
    setEditingEventId(event.id);
    setLinkError(null);
    setFormState({
      isFree: event.ticketing.isFree,
      priceGeneral: event.ticketing.priceGeneral || 0,
      priceStudentDiscount: event.ticketing.priceStudentDiscount || 0,
      saleConditions: event.ticketing.saleConditions || '',
      isPublishedOnWeb: event.ticketing.isPublishedOnWeb,
      ticketLink: event.ticketing.ticketLink || '',
    });
  };

  const handleCancel = () => {
    setEditingEventId(null);
    setLinkError(null);
  };

  const handleSave = (eventId: string) => {
    const ticketLink = formState.ticketLink.trim();

    if (formState.isPublishedOnWeb && !ticketLink) {
      setLinkError('Pegá el enlace público de esta actividad antes de marcarla como publicada.');
      return;
    }

    if (ticketLink && !isEntradanetUrl(ticketLink)) {
      setLinkError('El enlace debe pertenecer a elvirla.entradanet.com y comenzar con https://');
      return;
    }

    updateTicketing(eventId, { ...formState, ticketLink });
    setEditingEventId(null);
    setLinkError(null);
  };

  return (
    <section className="space-y-6" aria-labelledby="ticketing-heading">
      <div className="relative overflow-hidden rounded-3xl bg-[#061f35] text-white shadow-lg shadow-slate-900/10">
        <div className="entradanet-grid absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-9 lg:py-8">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Ticket className="h-5 w-5 text-[#62BCFF]" aria-hidden="true" />
              Boletería digital del Centro Cultural Virla
            </div>
            <h2 id="ticketing-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              Boletería &amp; <span className="text-[#62BCFF]">EntradaNet</span>
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-200">
              Administrá tarifas y vinculá cada actividad con su ficha oficial. La compra, el carrito y los pagos continúan de forma segura en EntradaNet.
            </p>
          </div>

          <a
            href={ENTRADANET_BASE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir EntradaNet (se abre en otra pestaña)"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#061f35] shadow-sm transition hover:bg-cyan-50 lg:self-center"
          >
            Abrir EntradaNet
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={<BadgeCheck className="h-5 w-5" />} label="Con enlace oficial" value={linkedCount} tone="emerald" />
        <MetricCard icon={<Globe2 className="h-5 w-5" />} label="Publicadas" value={publishedCount} tone="blue" />
        <MetricCard icon={<AlertCircle className="h-5 w-5" />} label="Pendientes" value={pendingCount} tone="amber" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Actividades programadas</h3>
            <p className="mt-0.5 text-sm text-slate-500">{events.length} actividades en la agenda interna</p>
          </div>
          <a
            href={ENTRADANET_BASE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Revisar la agenda pública en EntradaNet (se abre en otra pestaña)"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#004a7f] hover:text-[#007F8C]"
          >
            Revisar agenda pública
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="divide-y divide-slate-100">
          {sortedEvents.map((event) => {
            const space = VIRLA_SPACES.find((item) => item.id === event.spaceId);
            const isEditing = editingEventId === event.id;
            const ticketing = event.ticketing;
            const hasOfficialLink = isEntradanetUrl(ticketing.ticketLink);

            return (
              <article key={event.id} className="p-4 transition-colors hover:bg-slate-50/60 sm:p-5">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div className="min-w-0 max-w-xl space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{space?.shortName}</span>
                      <span className="text-slate-500">
                        {new Date(event.startDate).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}{' '}
                        · {new Date(event.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                      </span>
                    </div>
                    <h4 className="text-base font-bold leading-snug text-slate-950">{event.title}</h4>
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                      <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3F82BC]" aria-hidden="true" />
                      <span>{CONTRACT_LABELS[event.contractType]} · {event.responsible.name}</span>
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
                      <div className="min-w-32 text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifa</span>
                        {ticketing.isFree ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">Entrada gratuita</span>
                        ) : (
                          <div>
                            <strong className="text-base text-slate-950">${ticketing.priceGeneral?.toLocaleString('es-AR')}</strong>
                            {ticketing.priceStudentDiscount ? (
                              <span className="block text-xs text-slate-500">Comunidad UNT: ${ticketing.priceStudentDiscount.toLocaleString('es-AR')}</span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="min-w-40 text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">EntradaNet</span>
                        {ticketing.isPublishedOnWeb && hasOfficialLink ? (
                          <a
                            href={ticketing.ticketLink}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Ver ${event.title} en EntradaNet (se abre en otra pestaña)`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-bold text-[#004a7f] hover:bg-blue-100"
                          >
                            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                            Ver publicación
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : ticketing.isPublishedOnWeb ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-800">
                            <AlertCircle className="h-4 w-4" aria-hidden="true" /> Falta el enlace
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">Pendiente de publicar</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(event)}
                        className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-[#3F82BC] hover:bg-blue-50"
                      >
                        Configurar
                      </button>
                    </div>
                  ) : (
                    <TicketingEditor
                      event={event}
                      formState={formState}
                      setFormState={setFormState}
                      linkError={linkError}
                      clearLinkError={() => setLinkError(null)}
                      onCancel={handleCancel}
                      onSave={() => handleSave(event.id)}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'emerald' | 'blue' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, tone }) => {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-[#004a7f]',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`} aria-hidden="true">{icon}</span>
        <div>
          <span className="block text-sm text-slate-500">{label}</span>
          <strong className="text-2xl text-slate-950">{value}</strong>
        </div>
      </div>
    </div>
  );
};

interface TicketingEditorProps {
  event: EventItem;
  formState: TicketingFormState;
  setFormState: React.Dispatch<React.SetStateAction<TicketingFormState>>;
  linkError: string | null;
  clearLinkError: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const TicketingEditor: React.FC<TicketingEditorProps> = ({
  event,
  formState,
  setFormState,
  linkError,
  clearLinkError,
  onCancel,
  onSave,
}) => (
  <div className="w-full rounded-2xl border border-[#62BCFF]/60 bg-[#f3f9fd] p-4 lg:max-w-2xl">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-bold text-[#003865]">Tarifas y publicación</span>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={formState.isFree}
            onChange={(changeEvent) => setFormState((previous) => ({ ...previous, isFree: changeEvent.target.checked }))}
            className="h-4 w-4 rounded text-[#007F8C] focus:ring-[#007F8C]"
          />
          Entrada libre y gratuita
        </label>
      </div>

      {!formState.isFree && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Precio general ($)
            <span className="relative mt-1 block">
              <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="number"
                min="0"
                value={formState.priceGeneral}
                onChange={(changeEvent) => setFormState((previous) => ({ ...previous, priceGeneral: Number(changeEvent.target.value) }))}
                className="min-h-10 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-[#007F8C] focus:ring-2 focus:ring-[#007F8C]/20"
              />
            </span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Estudiantes / jubilados ($)
            <input
              type="number"
              min="0"
              value={formState.priceStudentDiscount}
              onChange={(changeEvent) => setFormState((previous) => ({ ...previous, priceStudentDiscount: Number(changeEvent.target.value) }))}
              className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[#007F8C] focus:ring-2 focus:ring-[#007F8C]/20"
            />
          </label>
        </div>
      )}

      <label className="text-sm font-semibold text-slate-700">
        Condiciones de venta
        <input
          type="text"
          value={formState.saleConditions}
          onChange={(changeEvent) => setFormState((previous) => ({ ...previous, saleConditions: changeEvent.target.value }))}
          placeholder="Ej.: descuento presentando credencial en boletería"
          className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[#007F8C] focus:ring-2 focus:ring-[#007F8C]/20"
        />
      </label>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-slate-900">
          <input
            type="checkbox"
            checked={formState.isPublishedOnWeb}
            onChange={(changeEvent) => {
              setFormState((previous) => ({ ...previous, isPublishedOnWeb: changeEvent.target.checked }));
              clearLinkError();
            }}
            className="h-4 w-4 rounded text-[#007F8C] focus:ring-[#007F8C]"
          />
          <Globe2 className="h-4 w-4 text-[#007F8C]" aria-hidden="true" />
          Publicado en EntradaNet
        </label>

        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Enlace público de la actividad
          <span className="relative mt-1 block">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="url"
              value={formState.ticketLink}
              onChange={(changeEvent) => {
                setFormState((previous) => ({ ...previous, ticketLink: changeEvent.target.value }));
                clearLinkError();
              }}
              placeholder="https://elvirla.entradanet.com/tc-events/..."
              aria-invalid={Boolean(linkError)}
              aria-describedby={linkError ? `ticket-link-error-${event.id}` : `ticket-link-help-${event.id}`}
              className={`min-h-10 w-full rounded-xl border bg-white py-2 pl-9 pr-3 text-sm text-slate-950 outline-none focus:ring-2 ${
                linkError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#007F8C] focus:ring-[#007F8C]/20'
              }`}
            />
          </span>
        </label>
        {linkError ? (
          <p id={`ticket-link-error-${event.id}`} className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-rose-700" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {linkError}
          </p>
        ) : (
          <p id={`ticket-link-help-${event.id}`} className="mt-2 text-xs leading-relaxed text-slate-500">
            Copiá la dirección de la ficha del evento en elvirla.entradanet.com.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          Cancelar
        </button>
        <button type="button" onClick={onSave} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#004a7f] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#003865]">
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar cambios
        </button>
      </div>
    </div>
  </div>
);
