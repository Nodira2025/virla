import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, type Member, type MemberRole } from '../domain/members';
import { RESERVABLE_SPACES } from '../domain/reservations';
import { getSupabase } from '../infrastructure/supabase';
import { bookingError } from '../services/reservations';

const roomFields = { summary: 'Descripción', area: 'Superficie', dimensions: 'Dimensiones', height: 'Altura', layout: 'Distribución y mobiliario', access: 'Accesos y accesibilidad', stage: 'Escenario', sound: 'Sonido', lighting: 'Iluminación', projection: 'Proyección', connectivity: 'Conectividad y energía', backstage: 'Camarines', considerations: 'Condiciones de uso' };
type Room = { id: string; capacity: number | null; status: 'pending' | 'verified'; photo_url: string | null; photo_alt: string | null; equipment: string[]; uses: string[] } & Record<keyof typeof roomFields, string>;
export function AdminView() {
  const { member } = useAuth(); const [members, setMembers] = useState<Member[]>([]); const [rooms, setRooms] = useState<Room[]>([]);
  const [tab, setTab] = useState<'rooms' | 'members'>('rooms'); const [selected, setSelected] = useState('teatro-300');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<File | null>(null); const [preview, setPreview] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    void Promise.all([getSupabase().from('virla_profiles').select('*').order('created_at'), getSupabase().from('virla_space_profiles').select('*')]).then(([people, spaces]) => {
      if (!live) return; if (people.error || spaces.error) setError('No pudimos cargar la administración. Actualizá la página para reintentar.');
      else { setMembers(people.data as Member[]); setRooms(spaces.data as Room[]); } setLoading(false);
    }).catch(() => { if (live) { setError('No pudimos conectar con la administración.'); setLoading(false); } });
    return () => { live = false; };
  }, []);
  useEffect(() => { if (!photo) { setPreview(''); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  if (member?.role !== 'admin') return <p>No tenés acceso a la administración.</p>;
  const room = rooms.find((item) => item.id === selected);
  const changeRoom = (patch: Partial<Room>) => setRooms((items) => items.map((item) => item.id === selected ? { ...item, ...patch } : item));
  const saveRoom = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !room) return; setBusy(true); setError(''); setMessage('');
    try {
      let photoUrl = room.photo_url;
      if (photo) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) throw new Error('Elegí una foto JPG, PNG o WebP de hasta 5 MB.');
        const path = room.id + '/' + crypto.randomUUID() + '.' + ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[photo.type]);
        const upload = await getSupabase().storage.from('virla-room-photos').upload(path, photo, { contentType: photo.type, upsert: false });
        if (upload.error) throw new Error('No pudimos subir la foto. La ficha conserva la foto anterior.');
        photoUrl = getSupabase().storage.from('virla-room-photos').getPublicUrl(path).data.publicUrl;
      }
      const values = { ...room, photo_url: photoUrl, photo_alt: RESERVABLE_SPACES.find((item) => item.id === room.id)?.name, verified_at: room.status === 'verified' ? new Date().toISOString() : null };
      const { data, error: failure } = await getSupabase().from('virla_space_profiles').update(values).eq('id', room.id).select('id').single();
      if (failure || !data) throw new Error('No pudimos guardar la ficha. Revisá tu acceso de administrador.');
      changeRoom(values); setPhoto(null); setMessage('Ficha guardada. El equipo ya puede consultar los datos y la foto.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos guardar la sala.'); }
    finally { setBusy(false); }
  };
  const saveMember = async (person: Member) => {
    if (busy || !person.role) return; setBusy(true); setError(''); setMessage('');
    try { const { error: failure } = await getSupabase().rpc('virla_set_member', { member_id: person.id, member_role: person.role, member_active: person.active }); if (failure) setError(bookingError(failure)); else setMessage('Acceso actualizado para ' + person.email + '.'); }
    catch { setError('No pudimos actualizar el acceso.'); } finally { setBusy(false); }
  };
  return <section className="team-view"><div><p className="eyebrow">ADMIN VIRLA</p><h1>Administración</h1><p>Gestioná el equipo y mantené las fichas de las salas actualizadas.</p></div><div className="team-actions"><button className={tab === 'rooms' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('rooms')}>Salas y fotos</button><button className={tab === 'members' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('members')}>Usuarios y permisos</button></div>
    {error && <p className="team-error" role="alert">{error}</p>}{message && <p className="team-message" role="status">{message}</p>}{loading ? <p>Cargando administración…</p> : tab === 'members' ? <><p>La persona debe crear su cuenta e ingresar una vez. Después aparecerá aquí para habilitarla.</p>{members.map((person) => <article className="team-card" key={person.id}><h2>{person.display_name || person.email}</h2><p>{person.email}</p><label>Perfil<select disabled={busy || person.id === member.id} value={person.role || ''} onChange={(event) => setMembers((items) => items.map((item) => item.id === person.id ? { ...item, role: event.target.value as MemberRole } : item))}><option value="" disabled>Elegir perfil</option>{Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label><label className="team-actions"><input style={{ width: 20 }} type="checkbox" disabled={busy || person.id === member.id} checked={person.active} onChange={(event) => setMembers((items) => items.map((item) => item.id === person.id ? { ...item, active: event.target.checked } : item))} />Acceso habilitado</label><button disabled={busy || !person.role || person.id === member.id} className="primary-button" onClick={() => { void saveMember(person); }}>Guardar acceso de esta persona</button></article>)}</> : <><label>Sala<select disabled={busy} value={selected} onChange={(event) => { setSelected(event.target.value); setPhoto(null); setMessage(''); }}>{RESERVABLE_SPACES.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>{room && <form onSubmit={saveRoom} className="team-card"><h2>{RESERVABLE_SPACES.find((space) => space.id === room.id)?.name}</h2><img className="team-thumbnail" src={preview || room.photo_url || '/photos/illustrative-' + room.id + '.jpg'} alt="Vista previa de la sala" />{!room.photo_url && !preview && <p>Imagen ilustrativa. Reemplazala por una foto real de esta sala.</p>}<label>Cambiar foto<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></label><p>JPG, PNG o WebP · hasta 5 MB. La foto será visible mediante su enlace público.</p><div className="team-grid"><label>Capacidad<input type="number" min={1} max={100000} value={room.capacity ?? ''} onChange={(event) => changeRoom({ capacity: event.target.value ? Number(event.target.value) : null })} /></label><label>Estado de la ficha<select value={room.status} onChange={(event) => changeRoom({ status: event.target.value as Room['status'] })}><option value="pending">Datos por confirmar</option><option value="verified">Datos verificados por el admin</option></select></label>{Object.entries(roomFields).map(([field, label]) => <label key={field}>{label}<textarea rows={2} maxLength={field === 'summary' ? 1500 : 2000} value={room[field as keyof typeof roomFields]} onChange={(event) => changeRoom({ [field]: event.target.value })} /></label>)}<label>Equipamiento (uno por línea)<textarea value={room.equipment.join('\n')} onChange={(event) => changeRoom({ equipment: event.target.value.split('\n') })} /></label><label>Usos sugeridos (uno por línea)<textarea value={room.uses.join('\n')} onChange={(event) => changeRoom({ uses: event.target.value.split('\n') })} /></label></div><button disabled={busy} className="primary-button">{busy ? 'Guardando…' : 'Guardar ficha y foto'}</button><a href={'#datos-tecnicos/' + room.id + '/ficha'}>Ver ficha en la app</a></form>}</>}
  </section>;
}
