import { useState, type FormEvent } from 'react';
import { Camera, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePersonalProfile } from '../context/PersonalProfileContext';
import type { PersonalProfile } from '../domain/personalProfile';

async function smallPortrait(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Elegí una foto JPG, PNG o WebP de hasta 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 320;
    const context = canvas.getContext('2d'); if (!context) throw new Error('No pudimos preparar la foto.');
    const side = Math.min(bitmap.width, bitmap.height);
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 320, 320);
    context.drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 320, 320);
    const photo = canvas.toDataURL('image/jpeg', .8);
    if (photo.length > 180000) throw new Error('Elegí una foto más sencilla.');
    return photo;
  } finally { bitmap.close(); }
}
export function ProfileView() {
  const { member } = useAuth(); const personal = usePersonalProfile();
  if (personal.loading) return <p role="status">Cargando tu perfil…</p>;
  if (personal.error) return <div className="team-card"><p role="alert">{personal.error}</p><button className="primary-button" onClick={personal.reload}>Volver a intentar</button><a href="#menu">Ir al menú</a></div>;
  return <ProfileEditor key={personal.profile?.updatedAt || member?.id} initial={personal.profile || { name: member?.display_name || '', contact: member?.email?.endsWith('.invalid') ? '' : member?.email || '', area: '', photo: '' }} />;
}
function ProfileEditor({ initial }: { initial: PersonalProfile }) {
  const { save } = usePersonalProfile();
  const [form, setForm] = useState(initial); const [busy, setBusy] = useState(false); const [photoBusy, setPhotoBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); if (busy || photoBusy) return; setBusy(true); setError(''); try { await save(form); window.location.hash = '#inicio'; } catch (e) { setError(e instanceof Error ? e.message : 'No se guardó el perfil.'); } finally { setBusy(false); } };
  return <section className="team-view profile-page"><div className="page-heading"><p className="eyebrow">TUS DATOS, UNA SOLA VEZ</p><h1>Mi perfil</h1><p>Se completarán automáticamente en tus próximas solicitudes. Podés cambiarlos cuando quieras.</p></div><form className="team-card" onSubmit={submit}><fieldset disabled={busy || photoBusy}>
    <div className="profile-photo-preview">{form.photo ? <img src={form.photo} alt="Tu foto de perfil"/> : <UserRound size={65}/>}</div><label className="profile-upload"><Camera size={22}/>Subir o cambiar mi foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setPhotoBusy(true); setError(''); void smallPortrait(file).then((photo) => setForm((v) => ({ ...v, photo }))).catch((e) => setError(e.message)).finally(() => setPhotoBusy(false)); event.target.value = ''; }}/></label>{form.photo && <button className="auth-switch" type="button" onClick={() => setForm((v) => ({ ...v, photo: '' }))}>Quitar foto</button>}
    <label className="form-field">Nombre y apellido<input required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
    <label className="form-field">Teléfono o correo de contacto<input required minLength={6} maxLength={120} autoComplete="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}/></label>
    <label className="form-field">Área o sector (opcional)<input maxLength={100} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}/></label><p>La foto y el contacto quedan en tu perfil privado. El nombre se usa como responsable en tus actividades.</p>
    </fieldset>{error && <p role="alert" className="field-error">{error}</p>}<div className="team-actions"><a className="secondary-button" href="#inicio">Volver</a><button className="primary-button" disabled={busy || photoBusy}>{photoBusy ? 'Preparando foto…' : busy ? 'Guardando…' : 'Guardar mi perfil'}</button></div></form></section>;
}
