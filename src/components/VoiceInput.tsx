import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Check } from 'lucide-react';

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;
export const getRecognition = () => {
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
};

export function VoiceInput({ onApply }: { onApply: (field: 'title' | 'description', value: string) => void }) {
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [target, setTarget] = useState<'title' | 'description'>('title');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const available = Boolean(getRecognition()) && window.isSecureContext;

  useEffect(() => () => {
    if (recognition.current) {
      recognition.current.onresult = null;
      recognition.current.onerror = null;
      recognition.current.onend = null;
      recognition.current.abort();
    }
  }, []);

  const start = () => {
    const Constructor = getRecognition();
    if (!Constructor) return;
    setError(''); setMessage('');
    const session = new Constructor();
    recognition.current = session;
    session.lang = 'es-AR'; session.continuous = false; session.interimResults = true;
    const previous = transcript.trim();
    session.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0].transcript).join(' ');
      setTranscript([previous, text].filter(Boolean).join(' ').slice(0, target === 'title' ? 100 : 500));
    };
    session.onerror = (event) => {
      setListening(false);
      setError(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'No se habilitó el micrófono. Podés escribir en el formulario.' : event.error === 'no-speech' ? 'No escuchamos una voz. Intentá nuevamente o escribí el texto.' : 'El dictado no está disponible en este momento. Podés escribir el texto.');
    };
    session.onend = () => setListening(false);
    try { session.start(); setListening(true); } catch { setListening(false); setError('No pudimos iniciar el micrófono. Usá el formulario.'); }
  };

  return <div className="voice-panel">
    <div className="voice-panel-heading"><Mic size={24} aria-hidden="true" /><div><h2>Decilo con tu voz</h2><p>Dictá el nombre o la descripción. Después elegís el día y el horario.</p></div></div>
    <p className="voice-privacy">Dictá solo información de la actividad: será pública. El navegador puede procesar el audio mediante su servicio de voz.</p>
    {!available ? <p role="status" className="voice-fallback">Este navegador no permite dictado. Podés completar los mismos datos en el formulario.</p> : <>
      <label className="form-field">Quiero dictar<select value={target} disabled={listening} onChange={(event) => { setTarget(event.target.value as 'title' | 'description'); setTranscript(''); setMessage(''); }}><option value="title">Nombre de la actividad</option><option value="description">Descripción de la actividad</option></select></label>
      <button type="button" className={'voice-record ' + (listening ? 'is-recording' : '')} onClick={() => listening ? recognition.current?.stop() : start()}>{listening ? <Square size={22} aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}{listening ? 'Terminar dictado' : 'Presioná para dictar'}</button>
      <span role="status" className="voice-status">{listening ? 'Escuchando…' : 'El micrófono se activa solo al presionar el botón.'}</span>
      <label className="form-field">Revisá el texto<textarea value={transcript} disabled={listening} maxLength={target === 'title' ? 100 : 500} onChange={(event) => setTranscript(event.target.value)} placeholder={target === 'title' ? 'Ej.: Reunión de equipo' : 'Ej.: Revisión de actividades y propuestas de la semana'} rows={3} /></label>
      <button type="button" className="secondary-button" disabled={listening || !transcript.trim()} onClick={() => { onApply(target, transcript.trim()); setTranscript(''); setMessage('Texto agregado al formulario. Podés corregirlo antes de continuar.'); }}><Check size={18} aria-hidden="true" />Usar este texto</button>
    </>}
    {error && <p role="alert" className="field-error">{error}</p>}{message && <p role="status" className="voice-status">{message}</p>}
  </div>;
}
