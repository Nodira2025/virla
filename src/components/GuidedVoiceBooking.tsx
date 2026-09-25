import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, X } from 'lucide-react';
import { parseVoiceBooking, voiceRoomChoices } from '../domain/voiceBooking';
import { todayInTucuman } from '../domain/reservationValidation';
import { RESERVATION_ACTIVITY_TYPES, type ReservationInput } from '../domain/reservations';
import { AGENDA_CATEGORIES, type AgendaCategoryId } from '../domain/agendaCategories';
import { readGuide } from '../services/feedback';
import { getRecognition, type Recognition } from './VoiceInput';

export function GuidedVoiceBooking({ responsible, initial, onClose, onApply }: { responsible: string; initial: ReservationInput; onClose: () => void; onApply: (value: Partial<ReservationInput>) => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false); const [text, setText] = useState(''); const [error, setError] = useState('');
  const [draft, setDraft] = useState({ title: initial.title, date: '', spaceId: '', startTime: '', endTime: '' });
  const [kind, setKind] = useState(initial.activityType);
  const [category, setCategory] = useState(initial.category || 'unclassified');
  const available = Boolean(getRecognition()) && window.isSecureContext;
  const today = todayInTucuman();
  const example = `El día ${Number(today.slice(8))} de ${new Date(today+'T12:00:00Z').toLocaleString('es-AR',{ month:'long',timeZone:'UTC' })}, de 18 a 20 horas, necesito ocupar la Sala de Teatro para el evento Reunión de equipo. Solicitada por ${responsible || 'tu nombre'}.`;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; const node = dialog.current; node?.showModal();
    return () => { if (recognition.current) { recognition.current.onend = null; recognition.current.onerror = null; recognition.current.onresult = null; recognition.current.abort(); } window.speechSynthesis?.cancel(); node?.close(); previous?.focus(); };
  }, []);
  const start = (onlyTitle = false) => {
    if (listening) return;
    window.speechSynthesis?.cancel(); setError('');
    const Constructor = getRecognition(); if (!Constructor) return;
    const rec = new Constructor(); recognition.current = rec; rec.lang='es-AR'; rec.continuous=true; rec.interimResults=true;
    let captured = '';
    rec.onresult = (event) => { captured = Array.from(event.results).map((r) => r[0].transcript).join(' ').slice(0,1500); setText(captured); };
    rec.onerror = (e) => { setListening(false); setError(e.error === 'not-allowed' ? 'Habilitá el micrófono del navegador para dictar. También podés elegir de las listas o usar el formulario.' : 'No pudimos escucharte. Volvé a intentar o elegí de las listas.'); };
    rec.onend = () => {
      setListening(false); if (!captured.trim()) return;
      if (onlyTitle) setDraft((v) => ({ ...v, title: captured.trim().slice(0,100) }));
      else { const parsed = parseVoiceBooking(captured,today); setDraft({ title: parsed.title || '', date: parsed.date || '', spaceId: parsed.spaceId || '', startTime: parsed.startTime || '', endTime: parsed.endTime || '' }); }
    };
    try { rec.start(); setListening(true); setText(''); } catch { setError('No se pudo activar el micrófono. Volvé a intentar.'); }
  };
  const dates = Array.from({ length: 366 }, (_, i) => { const date = new Date(today+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+i); return { value: date.toISOString().slice(0,10), label: date.toLocaleDateString('es-AR',{ weekday:'short', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }) }; });
  if (draft.date && !dates.some((d) => d.value===draft.date)) dates.push({ value:draft.date,label:draft.date.split('-').reverse().join('/') });
  const times = [...new Set([...Array.from({length:96},(_,i)=>String(Math.floor(i/4)).padStart(2,'0')+':'+String((i%4)*15).padStart(2,'0')),draft.startTime,draft.endTime].filter(Boolean))].sort();
  const complete = draft.title.trim() && draft.date >= today && draft.spaceId && draft.startTime && draft.endTime && ((Date.parse('2000-01-01T'+draft.endTime+':00Z')-Date.parse('2000-01-01T'+draft.startTime+':00Z')) >= 1800000);
  return <dialog ref={dialog} className="guided-voice-dialog" aria-labelledby="dictation-title" onCancel={(e) => { e.preventDefault(); onClose(); }}><div className="guided-voice-header"><h2 id="dictation-title">Contame qué espacio necesitás</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar dictado"><X/></button></div><p>Podés decir una frase como esta, cambiando los datos:</p><blockquote>{example}</blockquote><button type="button" className="secondary-button" disabled={listening} onClick={() => { if (!readGuide(example)) setError('Este navegador no puede leer la guía.'); }}><Volume2 size={20}/>Escuchar ejemplo</button><p className="field-hint">Usá horas de 0 a 23 e indicá también a qué hora termina. Tu nombre y contacto se toman del perfil. El navegador puede procesar el audio con su servicio de voz.</p>
    {available ? <button type="button" className={'guided-mic '+(listening?'recording':'')} onClick={() => listening ? recognition.current?.stop() : start()}>{listening?<Square size={32}/>:<Mic size={32}/>} {listening?'Terminar dictado':'Tocar y hablar'}</button> : <p role="status">Este navegador no ofrece dictado. Probá Chrome o Edge, elegí de las listas o usá el formulario.</p>}
    <p role="status">{listening ? 'Te estoy escuchando… Al terminar, tocá «Terminar dictado».' : 'Revisá los datos antes de continuar. Todavía no se envió nada.'}</p>{text && <details><summary>Lo que escuchamos</summary><p>{text}</p></details>}{error && <p role="alert" className="field-error">{error}</p>}
    <fieldset disabled={listening} className="voice-review-fields"><legend>Revisar y elegir</legend><label>Evento<select value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})}><option value="">Elegir o dictar un nombre</option>{[...new Set([draft.title,'Reunión de equipo','Ensayo','Charla','Muestra','Montaje','Mantenimiento'].filter(Boolean))].map((v)=><option key={v}>{v}</option>)}</select></label>{available && <button type="button" className="secondary-button" onClick={()=>start(true)}><Mic size={19}/>Dictar solo el nombre del evento</button>}
    <label>Sala<select value={draft.spaceId} onChange={(e)=>setDraft({...draft,spaceId:e.target.value})}><option value="">Elegir sala</option>{voiceRoomChoices.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Día<select value={draft.date} onChange={(e)=>setDraft({...draft,date:e.target.value})}><option value="">Elegir día</option>{dates.map((d)=><option key={d.value} value={d.value}>{d.label}</option>)}</select></label><div className="voice-time-grid">{(['startTime','endTime'] as const).map((key)=><label key={key}>{key==='startTime'?'Desde':'Hasta'}<select value={draft[key]} onChange={(e)=>setDraft({...draft,[key]:e.target.value})}><option value="">Elegir hora</option>{times.map((t)=><option key={t}>{t}</option>)}</select></label>)}</div><p>Solicitada por <strong>{responsible || 'la persona que figura en tu perfil'}</strong>. Duración mínima: 30 minutos.</p></fieldset>
    <fieldset disabled={listening} className="voice-review-fields"><label>Tipo de actividad<select value={kind} onChange={(e)=>setKind(e.target.value as ReservationInput['activityType'])}>{RESERVATION_ACTIVITY_TYPES.map((v)=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label><label>Categoría<select value={category} onChange={(e)=>setCategory(e.target.value as AgendaCategoryId)}>{AGENDA_CATEGORIES.map((v)=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label></fieldset>
    <div className="team-actions"><button className="secondary-button" type="button" onClick={onClose}>Volver al formulario</button><button className="primary-button" type="button" disabled={listening || !complete} onClick={()=>onApply({...draft,activityType:kind,category,spaceId:draft.spaceId as ReservationInput['spaceId'],description:initial.description || 'Actividad: '+draft.title})}>Revisar solicitud</button></div></dialog>;
}
