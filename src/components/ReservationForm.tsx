import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarCheck, Check, ClipboardList, Clock3, LoaderCircle, MapPin, Mic, PencilLine, UserRound } from 'lucide-react';
import { AGENDA_CATEGORIES, getAgendaCategory, type AgendaCategoryId } from '../domain/agendaCategories';
import { RESERVATION_ACTIVITY_TYPES, RESERVABLE_SPACES, getReservableSpace, type PublicReservation, type ReservationInput } from '../domain/reservations';
import { RESERVATION_STEPS, stepForErrors, todayInTucuman, validateReservation, type ReservationFieldErrors } from '../domain/reservationValidation';
import { createReservation, ReservationRequestError } from '../services/reservations';
import { GuidedVoiceBooking } from './GuidedVoiceBooking';
import { usePersonalProfile } from '../context/PersonalProfileContext';
import { useAuth } from '../context/AuthContext';
import { canApprove } from '../domain/members';
import { fetchSpaceCatalog } from '../services/spaces';
import type { PublicSpaceProfile } from '../domain/spaceCatalog';

interface ReservationFormProps { initialSpaceId?: ReservationInput['spaceId']; onCancel: () => void; onSaved: (reservation: PublicReservation, showAgenda?: boolean) => void }
const STEPS = ['Actividad', 'Lugar y horario', 'Revisar y guardar'];
const initialForm = (): ReservationInput => ({ category: 'unclassified', title: '', activityType: 'function', description: '', spaceId: 'teatro-300', date: todayInTucuman(), startTime: '09:00', endTime: '10:00', responsibleName: '', contact: '', organization: '', notes: '', website: '' });

function Field({ label, required, error, hint, children, wide = false }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={'form-field' + (wide ? ' field-wide' : '')}><span>{label}{required && <span className="required-mark"> *</span>}</span>{children}{error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}</label>;
}

export function ReservationForm({ initialSpaceId, onCancel, onSaved }: ReservationFormProps) {
  const { member } = useAuth(); const manager = canApprove(member);
  const { profile } = usePersonalProfile();
  const [catalog, setCatalog] = useState<PublicSpaceProfile[]>([]);
  useEffect(() => { const controller = new AbortController(); void fetchSpaceCatalog(controller.signal).then(setCatalog).catch(() => undefined); return () => controller.abort(); }, []);
  const [form, setForm] = useState<ReservationInput>(() => ({ ...initialForm(), spaceId: initialSpaceId || 'teatro-300', responsibleName: profile?.name || member?.display_name || '', contact: profile?.contact || member?.email || '', organization: profile?.area || '' }));
  const [step, setStep] = useState(0);
  const [voiceOpen, setVoiceOpen] = useState(false);
  useEffect(() => { if (profile) setForm((current) => ({ ...current, responsibleName: !current.responsibleName || current.responsibleName === member?.display_name ? profile.name : current.responsibleName, contact: !current.contact || current.contact === member?.email ? profile.contact : current.contact, organization: current.organization || profile.area })); }, [profile, member?.display_name, member?.email]);
  const [errors, setErrors] = useState<ReservationFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const section = useRef<HTMLElement>(null);
  const selectedSpace = useMemo(() => ({ name: getReservableSpace(form.spaceId)?.name || 'Elegí un espacio', capacity: catalog.find((space) => space.id === form.spaceId)?.capacity ?? undefined }), [form.spaceId, catalog]);
  const setField = <Key extends keyof ReservationInput>(key: Key, value: ReservationInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError('');
  };
  const goToStep = (next: number, focusError = false) => {
    setStep(next);
    window.requestAnimationFrame(() => {
      const target = focusError ? section.current?.querySelector<HTMLElement>('[aria-invalid="true"]') : section.current?.querySelector<HTMLElement>('#form-step-title');
      target?.focus({ preventScroll: true });
      section.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };
  const invalid = (key: keyof ReservationInput) => ({ name: key, 'aria-invalid': Boolean(errors[key]) });
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current) return;
    const validation = validateReservation(form, todayInTucuman(), selectedSpace.capacity ?? null);
    if (step < 2) {
      const currentErrors = Object.fromEntries(Object.entries(validation).filter(([field]) => RESERVATION_STEPS[step].includes(field as keyof ReservationInput)));
      setErrors(currentErrors);
      if (Object.keys(currentErrors).length) { goToStep(step, true); return; }
      goToStep(step + 1);
      return;
    }
    setErrors(validation);
    if (Object.keys(validation).length) { goToStep(stepForErrors(validation), true); return; }
    saving.current = true;
    setIsSaving(true); setSubmitError('');
    try { onSaved(await createReservation(form), mounted.current); }
    catch (error) {
      if (error instanceof ReservationRequestError) {
        setSubmitError(error.message);
        if (error.fields && Object.keys(error.fields).length) { setErrors(error.fields); goToStep(stepForErrors(error.fields), true); }
        else window.requestAnimationFrame(() => section.current?.querySelector<HTMLElement>('#save-error')?.focus());
      } else { setSubmitError('No pudimos guardar la actividad. Revisá la conexión y volvé a intentar.'); }
    } finally { saving.current = false; setIsSaving(false); }
  };

  return <section ref={section} className="create-agenda" aria-labelledby="reservation-title">
    <button type="button" className="back-link" disabled={isSaving} onClick={onCancel}><ArrowLeft size={18} aria-hidden="true" />Volver a la agenda</button>
    <div className="page-heading"><p className="eyebrow">UNA NUEVA ACTIVIDAD</p><h1 id="reservation-title">{manager ? 'Crear agenda' : 'Solicitar un espacio'}</h1><p>{manager ? 'Al guardar, la actividad queda confirmada en la agenda.' : 'Completá los datos y enviá el pedido a dirección. El espacio se ocupa al aprobarse.'}</p></div>
    <ol className="form-steps" aria-label="Pasos para crear una actividad">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={index < step ? 'is-complete' : ''}><span>{index < step ? <Check size={17} aria-hidden="true" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>
    <form onSubmit={handleSubmit} noValidate className="create-form-layout">
      <div className="form-main-panel">
        <h2 id="form-step-title" tabIndex={-1}>{step === 0 ? '¿Qué actividad vas a crear?' : step === 1 ? '¿Dónde y cuándo?' : '¿Quién está a cargo?'}</h2>
        <p className="form-intro">{step === 0 ? 'Escribí o dictá la información de tu actividad.' : step === 1 ? 'Elegí el espacio, el día y la duración.' : 'Agregá el contacto y revisá el resumen antes de guardar.'}</p>
        {submitError && <div id="save-error" tabIndex={-1} role="alert" className="form-save-error"><AlertCircle size={22} aria-hidden="true" /><p><strong>No se guardó la actividad.</strong>{submitError}</p></div>}
        <fieldset disabled={isSaving} className="form-fields">
          <legend className="sr-only">{STEPS[step]}</legend>
          {step === 0 && <>
            <div className="entry-mode field-wide" aria-label="Forma de completar la actividad"><button type="button" aria-pressed={!voiceOpen} onClick={() => setVoiceOpen(false)}><PencilLine size={20} aria-hidden="true" />Formulario</button><button type="button" aria-haspopup="dialog" onClick={() => setVoiceOpen(true)}><Mic size={20} aria-hidden="true" />Dictado por voz</button></div>

            <Field label="Nombre de la actividad" required error={errors.title} wide><input {...invalid('title')} value={form.title} onChange={(event) => setField('title', event.target.value)} maxLength={100} placeholder="Ej.: Reunión de equipo" /></Field>
            <Field label="Descripción" required error={errors.description} hint="Esta descripción será visible en la agenda pública." wide><textarea {...invalid('description')} rows={3} value={form.description} onChange={(event) => setField('description', event.target.value)} maxLength={500} placeholder="Contá brevemente de qué se trata la actividad." /></Field>
            <Field label="Tipo de actividad" required error={errors.activityType}><select {...invalid('activityType')} value={form.activityType} onChange={(event) => setField('activityType', event.target.value as ReservationInput['activityType'])}>{RESERVATION_ACTIVITY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
            <Field label="Categoría" error={errors.category}><select {...invalid('category')} value={form.category} onChange={(event) => setField('category', event.target.value as AgendaCategoryId)}>{AGENDA_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          </>}
          {step === 1 && <>
            <Field label="Espacio" required error={errors.spaceId} wide><select {...invalid('spaceId')} value={form.spaceId} onChange={(event) => setField('spaceId', event.target.value as ReservationInput['spaceId'])}>{RESERVABLE_SPACES.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></Field>
            <Field label="Día" required error={errors.date}><input {...invalid('date')} type="date" min={todayInTucuman()} value={form.date} onChange={(event) => setField('date', event.target.value)} /></Field>
            <Field label="Cantidad de personas" error={errors.expectedAttendance} hint={selectedSpace?.capacity ? 'Capacidad: hasta ' + selectedSpace.capacity + ' personas.' : 'Opcional'}><input {...invalid('expectedAttendance')} type="number" min={1} max={selectedSpace?.capacity} value={form.expectedAttendance ?? ''} onChange={(event) => setField('expectedAttendance', event.target.value ? Number(event.target.value) : undefined)} placeholder="Opcional" /></Field>
            <Field label="Hora de inicio" required error={errors.startTime}><input {...invalid('startTime')} type="time" value={form.startTime} onChange={(event) => setField('startTime', event.target.value)} /></Field>
            <Field label="Hora de finalización" required error={errors.endTime}><input {...invalid('endTime')} type="time" value={form.endTime} onChange={(event) => setField('endTime', event.target.value)} /></Field>
            <p className="form-notice field-wide"><Clock3 size={19} aria-hidden="true" /><span>Horarios de Tucumán. Duración mínima de 30 minutos. Al guardar se verifica que el espacio no tenga otra ocupación interna.</span></p>
            <details className="field-wide form-details"><summary>Sobre las actividades de EntradaNet</summary><p>EntradaNet puede no informar sala ni duración. Revisá esas actividades en la agenda antes de ocupar el espacio.</p></details>
          </>}
          {step === 2 && <>
            <Field label="Nombre y apellido" required error={errors.responsibleName} hint="Aparecerá como responsable en la agenda." wide><input {...invalid('responsibleName')} autoComplete="name" value={form.responsibleName} onChange={(event) => setField('responsibleName', event.target.value)} maxLength={80} /></Field>
            <Field label="Teléfono o correo" required error={errors.contact} hint="Solo para coordinación. No se muestra en la agenda pública." wide><input {...invalid('contact')} value={form.contact} onChange={(event) => setField('contact', event.target.value)} maxLength={120} placeholder="Tu medio de contacto" /></Field>
            <details className="field-wide form-details"><summary>Agregar organización u observaciones</summary><div className="form-fields mt-4"><Field label="Área, grupo u organización" wide><input value={form.organization || ''} onChange={(event) => setField('organization', event.target.value)} maxLength={100} placeholder="Opcional" /></Field><Field label="Observaciones para coordinación" hint="Estas observaciones son privadas." wide><textarea rows={3} value={form.notes || ''} onChange={(event) => setField('notes', event.target.value)} maxLength={500} placeholder="Armado, equipos, proveedores…" /></Field></div></details>
          </>}
          <label className="sr-only" aria-hidden="true">Sitio web<input type="text" tabIndex={-1} autoComplete="off" value={form.website || ''} onChange={(event) => setField('website', event.target.value)} /></label>
        </fieldset>
        <div className="form-actions"><button type="button" className="secondary-button" disabled={isSaving} onClick={() => step === 0 ? onCancel() : goToStep(step - 1)}>{step === 0 ? 'Cancelar' : 'Atrás'}</button><button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? <LoaderCircle className="animate-spin" size={20} aria-hidden="true" /> : step === 2 ? <CalendarCheck size={20} aria-hidden="true" /> : null}{isSaving ? 'Guardando…' : step === 2 ? (manager ? 'Confirmar y ocupar espacio' : 'Enviar a dirección') : 'Continuar'}{step < 2 && <ArrowRight size={18} aria-hidden="true" />}</button></div>
      </div>
      <aside className={'form-summary' + (step === 2 ? ' is-final' : '')} aria-label="Resumen de la actividad">
        <div className="summary-label"><ClipboardList size={19} aria-hidden="true" />{step === 2 ? 'Revisá tu actividad' : 'Tu actividad'}</div>
        <h3>{form.title || 'Nueva actividad'}</h3>
        <span className="summary-category">{getAgendaCategory(form.category).label}</span>
        {form.description && <p className="summary-description">{form.description}</p>}
        <dl><div><MapPin size={20} aria-hidden="true" /><div><dt>Espacio</dt><dd>{selectedSpace?.name}</dd></div></div><div><CalendarCheck size={20} aria-hidden="true" /><div><dt>Día</dt><dd>{form.date ? form.date.split('-').reverse().join('/') : 'Sin definir'}</dd></div></div><div><Clock3 size={20} aria-hidden="true" /><div><dt>Horario</dt><dd>{form.startTime || '—'} a {form.endTime || '—'} hs</dd></div></div>{form.responsibleName && <div><UserRound size={20} aria-hidden="true" /><div><dt>Responsable</dt><dd>{form.responsibleName}</dd></div></div>}</dl>
        {step === 2 && <div className="summary-edit"><button type="button" disabled={isSaving} onClick={() => goToStep(0)}>Editar actividad</button><button type="button" disabled={isSaving} onClick={() => goToStep(1)}>Editar lugar y horario</button></div>}
        <p className="summary-note">{isSaving ? 'Esperando la confirmación del guardado…' : manager ? 'Al confirmar se ocupa el espacio y se actualiza la agenda.' : 'El pedido se envía a dirección. Todavía no ocupa el espacio.'}</p>
      </aside>
    </form>
    {voiceOpen && <GuidedVoiceBooking responsible={form.responsibleName} initial={form} onClose={() => setVoiceOpen(false)} onApply={(value) => { setForm((current) => ({ ...current, ...value })); setErrors({}); setSubmitError('' ); setVoiceOpen(false); goToStep(2); }} />}
  </section>;
}
