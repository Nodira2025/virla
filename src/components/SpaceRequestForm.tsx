import { useState, type FormEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { RESERVABLE_SPACES } from '../domain/reservations';

const fields = [
  { name: 'name', label: 'Nombre y apellido', required: true, max: 100, autoComplete: 'name' },
  { name: 'phone', label: 'Teléfono de contacto', required: true, type: 'tel', max: 40, autoComplete: 'tel' },
  { name: 'email', label: 'Correo electrónico (opcional)', type: 'email', max: 150, autoComplete: 'email' },
  { name: 'organization', label: 'Grupo, artista o institución (opcional)', max: 120 },
  { name: 'title', label: 'Nombre de la propuesta', required: true, max: 150 },
  { name: 'dates', label: 'Fechas y horarios tentativos', required: true, max: 200, placeholder: 'Indicá fechas, horarios y duración; o si son a convenir.' },
] as const;

export function SpaceRequestForm() {
  const [opened, setOpened] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    for (const input of Array.from(form.elements)) {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        input.setCustomValidity(input.required && !input.value.trim() ? 'Completá este campo.' : '');
      }
    }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? '').trim() || 'No indicado';
    const message = [
      'SOLICITUD DE ESPACIO · CENTRO CULTURAL VIRLA',
      'Dirigida a Iván Alarcón, director.',
      'Presento esta propuesta para curaduría y evaluación:',
      '',
      ...fields.map(field => `${field.label.replace(' (opcional)', '')}: ${value(field.name)}`),
      `Tipo de actividad: ${value('activity')}`,
      `Espacio solicitado: ${value('space')}`,
      `Público estimado: ${value('attendance')}`,
      '',
      `Descripción de la propuesta:\n${value('description')}`,
      '',
      `Necesidades técnicas, equipamiento y montaje:\n${value('needs')}`,
      '',
      `Material para curaduría (enlaces):\n${value('links')}`,
      '',
      'Entiendo que esta solicitud está sujeta a evaluación del director y no confirma una reserva.',
    ].join('\n');
    window.open(`https://wa.me/543815878508?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setOpened(true);
  }

  const control = 'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base font-normal text-slate-900 outline-none focus:border-[#007F8C] focus:ring-2 focus:ring-[#007F8C]/25';

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="request-title">
      <p className="text-sm font-bold uppercase tracking-wide text-[#007F8C]">Propuestas para curaduría</p>
      <h1 id="request-title" className="mt-2 text-3xl font-bold text-[#003865]">Solicitar un espacio</h1>
      <p className="mt-3 leading-relaxed text-slate-600">Contanos qué querés realizar en el Virla. El director, Iván Alarcón, evaluará tu propuesta y decidirá si dar curso a la solicitud.</p>
      <form onSubmit={handleSubmit} onInput={event => {
        const input = event.target;
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.setCustomValidity('');
        setOpened(false);
      }} className="mt-6 space-y-6">
        <p className="text-sm text-slate-500">Los campos marcados con * son obligatorios.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(field => <label key={field.name} className="block text-sm font-semibold text-slate-700">
            {field.label}{'required' in field && field.required ? ' *' : ''}
            <input name={field.name} type={'type' in field ? field.type : 'text'} required={'required' in field && field.required} maxLength={field.max} autoComplete={'autoComplete' in field ? field.autoComplete : undefined} placeholder={'placeholder' in field ? field.placeholder : undefined} className={control} />
          </label>)}
          <label className="block text-sm font-semibold text-slate-700">Tipo de actividad *
            <select name="activity" required className={control} defaultValue="">
              <option value="" disabled>Seleccioná una opción</option>
              {['Exposición o muestra', 'Teatro', 'Música', 'Danza', 'Taller', 'Charla o presentación', 'Otra actividad'].map(activity => <option key={activity}>{activity}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Espacio de interés *
            <select name="space" required className={control} defaultValue="">
              <option value="" disabled>Seleccioná un espacio</option>
              <option>A definir con la dirección</option>
              {RESERVABLE_SPACES.map(space => <option key={space.id}>{space.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Cantidad estimada de asistentes (opcional)
            <input name="attendance" type="number" min="1" max="100000" step="1" className={control} />
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Descripción de la propuesta *
          <textarea name="description" required maxLength={1800} rows={5} placeholder="Describí la propuesta artística, sus objetivos, participantes y el público al que está dirigida." className={control} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Necesidades técnicas, equipamiento y montaje *
          <textarea name="needs" required maxLength={800} rows={3} placeholder="Sonido, iluminación, mobiliario, tiempo de montaje… Si no necesitás equipamiento, indicalo." className={control} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Enlaces a fotos, videos o dossier (opcional)
          <textarea name="links" maxLength={1000} rows={3} placeholder="Pegá enlaces al material de tu propuesta." className={control} />
          <span className="mt-2 block font-normal text-slate-500">Verificá que los enlaces permitan ver el material. También podés adjuntar archivos directamente en WhatsApp después de abrir el mensaje.</span>
        </label>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-relaxed text-slate-700">
          Esta solicitud está sujeta a curaduría y evaluación. No confirma disponibilidad ni reserva un espacio.
          Al continuar, se abrirá WhatsApp con toda la información dirigida a Iván Alarcón (+54 381 587-8508). Revisá el mensaje y presioná Enviar allí.
        </div>
        <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007F8C] px-6 py-3 text-base font-bold text-white hover:bg-[#006a75] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007F8C] sm:w-auto">
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> Continuar en WhatsApp
        </button>
        {opened && <p role="status" className="text-sm text-slate-600">El mensaje está preparado. Completá el envío en WhatsApp. Si no se abrió, permití abrir una nueva pestaña y volvé a presionar el botón.</p>}
      </form>
    </section>
  );
}
