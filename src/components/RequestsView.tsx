import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { canApprove } from '../domain/members';
import { getReservableSpace } from '../domain/reservations';
import { getSupabase } from '../infrastructure/supabase';
import { bookingError, type BookingRow } from '../services/reservations';
import { playFeedback } from '../services/feedback';

const labels = { pending: 'Pendiente de aprobación', confirmed: 'Espacio confirmado', rejected: 'Rechazada' };
export function RequestsView({ onChanged }: { onChanged: () => void }) {
  const { member } = useAuth(); const manager = canApprove(member);
  const [rows, setRows] = useState<BookingRow[]>([]); const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<string, string>>({}); const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    let query = getSupabase().from('virla_bookings').select('*,virla_booking_private(contact,notes)').order('created_at', { ascending: false });
    if (!manager) query = query.eq('created_by', member!.id);
    const { data, error: failure } = await query;
    if (failure) setError('No pudimos consultar las solicitudes. Volvé a intentar.');
    else { setRows(data as BookingRow[]); setError(''); }
    setLoading(false);
  }, [manager, member]);
  useEffect(() => { void load(); const timer = window.setInterval(() => { void load(); }, 30000); return () => clearInterval(timer); }, [load]);
  const decide = async (row: BookingRow, approve: boolean) => {
    if (busy) return; const reason = (reasons[row.id] || '').trim();
    if (!approve && reason.length < 3) { setError('Escribí un motivo antes de rechazar la solicitud.'); return; }
    setBusy(row.id); setError(''); setMessage('');
    try {
      const { error: failure } = await getSupabase().rpc('virla_decide_booking', { booking_id: row.id, approve, reason });
      if (failure) { setError(bookingError(failure)); return; }
      playFeedback(approve ? 'confirmed' : 'sent');
      setMessage(approve ? 'Espacio confirmado. La actividad ya está en la agenda y se avisó al solicitante.' : 'Solicitud rechazada. El solicitante recibirá el motivo.');
      await load(); onChanged();
    } catch { setError('No pudimos conectar. Revisá el estado de la solicitud antes de volver a intentar.'); }
    finally { setBusy(null); }
  };
  const sorted = [...rows].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
  return <section className="team-view"><div><p className="eyebrow">EQUIPO VIRLA</p><h1>{manager ? 'Solicitudes de espacios' : 'Mis solicitudes'}</h1><p>Los pedidos pendientes no ocupan la sala. La aprobación reserva el horario en la agenda.</p></div>
    <div className="team-actions"><a href="#crear-agenda" className="primary-button">{manager ? 'Crear actividad' : 'Solicitar un espacio'}</a><button className="secondary-button" onClick={() => { void load(); }}>Actualizar</button></div>
    {error && <p role="alert" className="team-error">{error}</p>}{message && <p role="status" className="team-message">{message}</p>}
    {loading ? <p role="status">Consultando solicitudes…</p> : !rows.length ? <p className="team-empty">Todavía no hay solicitudes.</p> : sorted.map((row) => <article className="team-card" key={row.id}>
      <span className={'team-status ' + row.status}>{labels[row.status]}</span><h2>{row.title}</h2><p><strong>{getReservableSpace(row.space_id)?.name}</strong> · {row.date.split('-').reverse().join('/')} · {row.start_time.slice(0, 5)} a {row.end_time.slice(0, 5)}</p><p>{row.description}</p><p>Responsable: {row.responsible_name}{row.expected_attendance ? ' · ' + row.expected_attendance + ' personas' : ''}</p>
      {row.virla_booking_private && <p>Contacto: {row.virla_booking_private.contact}{row.virla_booking_private.notes && <><br />Notas: {row.virla_booking_private.notes}</>}</p>}{row.decision_note && <p><strong>Respuesta:</strong> {row.decision_note}</p>}
      <div className="team-actions"><a className="secondary-button" href={'#agenda/' + row.space_id}>Ver agenda de la sala</a><a href={'#datos-tecnicos/' + row.space_id}>Ficha técnica</a></div>
      {manager && row.status === 'pending' && <><label>Motivo si se rechaza / observación<input maxLength={500} value={reasons[row.id] || ''} onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })} /></label><div className="team-actions"><button disabled={!!busy} className="primary-button" onClick={() => { void decide(row, true); }}>{busy === row.id ? 'Guardando…' : 'Aprobar y ocupar espacio'}</button><button disabled={!!busy} className="secondary-button" onClick={() => { void decide(row, false); }}>Rechazar solicitud</button></div></>}
    </article>)}
  </section>;
}
