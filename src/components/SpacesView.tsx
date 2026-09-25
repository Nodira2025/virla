import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, DoorOpen, ImageIcon, Info, Lightbulb, LoaderCircle, Maximize, Monitor, RefreshCw, Ruler, Settings2, Users, Volume2, Wifi, type LucideIcon } from 'lucide-react';
import { SPACE_PROFILES } from '../domain/spaceProfiles';
import type { PublicSpaceProfile } from '../domain/spaceCatalog';
import { parseSpaceHash, spaceHash, type SpaceView } from '../domain/spaceRoutes';
import { fetchSpaceCatalog } from '../services/spaces';
import { spaceCatalogBackend } from '../infrastructure/supabase';
import './SpacesView.css';

const missing = (value?: string) => value || 'Por confirmar';
const capacityLabel = (space: PublicSpaceProfile) => space.capacity ? space.capacity + ' personas' : 'Capacidad por confirmar';

function SpacePhoto({ space, compact = false }: { space: PublicSpaceProfile; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [space.photoUrl]);
  return <div className={'space-photo' + (compact ? ' is-compact' : '')}>
    {!failed ? <img src={space.photoUrl || "/photos/illustrative-" + space.id + ".jpg"} alt={space.photoAlt || space.name} loading="lazy" onError={() => setFailed(true)} /> : <div className="space-photo-placeholder"><ImageIcon size={compact ? 28 : 43} aria-hidden="true" /><span>Foto pendiente</span></div>}
    {!space.photoUrl && !failed && <span className="illustrative-label">Imagen ilustrativa</span>}
  </div>;
}

function SpaceStatus({ space }: { space: PublicSpaceProfile }) {
  return <span className={'space-status status-' + space.status}>{space.status === 'demo' ? 'DEMO · Datos de ejemplo' : space.status === 'verified' ? <><CheckCircle2 size={14} aria-hidden="true" />Ficha verificada</> : 'Pendiente de verificación'}</span>;
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="space-fact"><Icon size={22} aria-hidden="true" /><dt>{label}</dt><dd>{value}</dd></div>;
}

function TechnicalGroup({ title, icon: Icon, preview, children, open = false }: { title: string; icon: LucideIcon; preview: string; children: React.ReactNode; open?: boolean }) {
  return <details className="technical-group" open={open || undefined}><summary><span className="technical-group-icon"><Icon size={24} aria-hidden="true" /></span><span><strong>{title}</strong><span>{preview}</span></span><ChevronDown size={20} aria-hidden="true" /></summary><div className="technical-group-content">{children}</div></details>;
}

export function SpacesView({ view = 'spaces' }: { view?: SpaceView }) {
  const [route, setRoute] = useState(() => parseSpaceHash(window.location.hash));
  const [storedSpaces, setStoredSpaces] = useState<PublicSpaceProfile[] | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'stored' | 'empty' | 'unavailable'>('loading');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const updateRoute = () => {
      setRoute(parseSpaceHash(window.location.hash));
      window.requestAnimationFrame(() => {
        document.getElementById('spaces-title')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    };
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('popstate', updateRoute);
    return () => { window.removeEventListener('hashchange', updateRoute); window.removeEventListener('popstate', updateRoute); };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    setCatalogState('loading');
    fetchSpaceCatalog(controller.signal).then((spaces) => {
      if (!active) return;
      setStoredSpaces(spaces);
      setCatalogState(spaces.length ? 'stored' : 'empty');
    }).catch(() => { if (active) setCatalogState('unavailable'); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [refreshKey]);

  const isDemo = spaceCatalogBackend !== 'supabase' && !storedSpaces?.length;
  const spaces = isDemo ? SPACE_PROFILES : storedSpaces || [];
  const selected = route.id ? spaces.find((space) => space.id === route.id) : undefined;
  const title = route.id ? route.full ? 'Ficha técnica completa' : selected?.name || 'Sala no encontrada' : view === 'technical' ? 'Datos técnicos de sala' : 'Salas y espacios';

  if (catalogState === 'loading' && storedSpaces === null) return <section className="space-loading" role="status"><LoaderCircle className="animate-spin" size={30} aria-hidden="true" /><h1>Consultando las fichas de las salas…</h1></section>;

  return <section className="spaces-view" aria-labelledby="spaces-title">
    <nav className="space-breadcrumbs" aria-label="Ubicación en las salas"><a href="#inicio">Inicio</a><ChevronRight size={15} aria-hidden="true" />{route.id ? <><a href={spaceHash(view)}>Salas</a><ChevronRight size={15} aria-hidden="true" /><span>{route.full ? 'Ficha técnica' : 'Resumen'}</span></> : <span>{view === 'technical' ? 'Datos técnicos de sala' : 'Salas y espacios'}</span>}</nav>
    {route.id && <a className="back-link" href={route.full && selected ? spaceHash(view, selected.id) : spaceHash(view)}><ArrowLeft size={18} aria-hidden="true" />{route.full && selected ? 'Volver al resumen de la sala' : 'Volver a las salas'}</a>}
    <div className="space-page-heading"><div className="page-heading"><p className="eyebrow">CONOCÉ EL VIRLA</p><h1 id="spaces-title" tabIndex={-1}>{title}</h1><p>{route.id ? route.full ? 'Toda la información, organizada por área.' : 'Lo que necesitás saber para tu actividad.' : 'Elegí un espacio para consultar su capacidad y equipamiento.'}</p></div>{!route.id && <span className="space-count"><Building2 size={18} aria-hidden="true" />{spaces.length} espacios</span>}</div>
    {isDemo && <div className="space-demo-notice" role="note"><Info size={21} aria-hidden="true" /><p><strong>Fichas de demostración.</strong> Las medidas, capacidades y equipos son ejemplos. Confirmá los datos con el Virla antes de planificar una actividad.</p></div>}
    {(catalogState === 'unavailable' || catalogState === 'empty' || catalogState === 'loading') && <div className="space-catalog-status" role="status"><span>{catalogState === 'loading' ? 'Actualizando las fichas…' : catalogState === 'empty' ? (isDemo ? 'Todavía no hay fichas guardadas en el catálogo. Se muestran ejemplos.' : 'Todavía no hay fichas guardadas. El admin debe completar el catálogo.') : isDemo ? 'No pudimos consultar el catálogo guardado. Estás viendo los ejemplos de la app.' : (storedSpaces?.length ? 'No pudimos actualizar el catálogo. Se conservan las últimas fichas consultadas.' : 'No pudimos consultar las salas. Volvé a intentar.')}</span><button type="button" disabled={catalogState === 'loading'} onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={16} aria-hidden="true" />Reintentar</button></div>}

    {selected && <div className="team-actions" style={{ marginBottom: 20 }}><a className="primary-button" href={"#crear-agenda/" + selected.id}>Elegir día y horario</a><a className="secondary-button" href={"#agenda/" + selected.id}>Ver agenda de esta sala</a></div>}
    {route.invalid || (route.id && !selected) ? <div className="space-not-found"><Building2 size={35} aria-hidden="true" /><h2>No encontramos esta sala.</h2><p>Volvé al listado para elegir una ficha disponible.</p><a className="primary-button" href={spaceHash(view)}>Ver todas las salas</a></div> : !selected ? <div className="space-catalog-grid">{spaces.map((space) => <article className="space-catalog-card" key={space.id}><a href={spaceHash(view, space.id)} aria-label={'Ver ficha de ' + space.name}><SpacePhoto space={space} compact /><div className="space-card-content"><SpaceStatus space={space} /><h2>{space.name}</h2><p className="space-card-capacity"><Users size={17} aria-hidden="true" />{capacityLabel(space)}</p><span className="space-card-action">Ver ficha<ArrowRight size={18} aria-hidden="true" /></span></div></a></article>)}</div> : route.full ? <>
      <div className="full-sheet-heading"><SpacePhoto space={selected} compact /><div><SpaceStatus space={selected} /><h2>{selected.name}</h2><p>{selected.verifiedAt ? 'Verificada el ' + new Date(selected.verifiedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Tucuman' }) : selected.status === 'demo' ? 'Ficha de referencia · información ficticia' : 'Datos pendientes de validación por el equipo'}</p></div></div>
      <div className="technical-sheet" key={selected.id}>
        <TechnicalGroup title="General" icon={ClipboardList} preview={capacityLabel(selected) + ' · ' + missing(selected.dimensions)} open><dl><div><dt>Capacidad de la ficha</dt><dd>{capacityLabel(selected)}</dd></div><div><dt>Superficie</dt><dd>{missing(selected.area)}</dd></div><div><dt>Dimensiones</dt><dd>{missing(selected.dimensions)}</dd></div><div><dt>Altura libre</dt><dd>{missing(selected.height)}</dd></div><div><dt>Distribución y mobiliario</dt><dd>{missing(selected.layout)}</dd></div></dl></TechnicalGroup>
        <TechnicalGroup title="Escenario" icon={Ruler} preview={missing(selected.technical.stage)}><p>{missing(selected.technical.stage)}</p></TechnicalGroup>
        <TechnicalGroup title="Sonido" icon={Volume2} preview={missing(selected.technical.sound)}><p>{missing(selected.technical.sound)}</p></TechnicalGroup>
        <TechnicalGroup title="Iluminación" icon={Lightbulb} preview={missing(selected.technical.lighting)}><p>{missing(selected.technical.lighting)}</p></TechnicalGroup>
        <TechnicalGroup title="Proyección" icon={Monitor} preview={missing(selected.technical.projection)}><p>{missing(selected.technical.projection)}</p></TechnicalGroup>
        <TechnicalGroup title="Conectividad y energía" icon={Wifi} preview={missing(selected.technical.connectivity)}><p>{missing(selected.technical.connectivity)}</p></TechnicalGroup>
        <TechnicalGroup title="Camarines, accesibilidad y otros" icon={DoorOpen} preview={missing(selected.technical.backstage)}><dl><div><dt>Camarines</dt><dd>{missing(selected.technical.backstage)}</dd></div><div><dt>Accesos y accesibilidad</dt><dd>{missing(selected.access)}</dd></div><div><dt>A tener en cuenta</dt><dd>{missing(selected.considerations)}</dd></div></dl>{selected.equipment.length > 0 && <><h3>Equipamiento y mobiliario informado</h3><ul>{selected.equipment.map((item) => <li key={item}>{item}</li>)}</ul></>}{selected.uses.length > 0 && <><h3>Usos sugeridos</h3><p>{selected.uses.join(' · ')}</p></>}</TechnicalGroup>
      </div>
      <a className="secondary-button space-return" href={spaceHash(view)}><ArrowLeft size={18} aria-hidden="true" />Volver a las salas</a>
    </> : <article className="space-overview">
      <div className="space-overview-main"><SpacePhoto space={selected} /><div className="space-overview-copy"><SpaceStatus space={selected} /><h2>{selected.name}</h2><p>{missing(selected.summary)}</p>{selected.uses.length > 0 && <ul className="space-uses">{selected.uses.map((use) => <li key={use}>{use}</li>)}</ul>}<div className="space-dimensions"><span><Maximize size={18} aria-hidden="true" />{missing(selected.area)}</span><span><Ruler size={18} aria-hidden="true" />{missing(selected.dimensions)}</span></div></div></div>
      <div className="space-overview-details"><h2><Settings2 size={22} aria-hidden="true" />Datos de la sala</h2><dl className="space-facts"><Fact icon={Users} label="Capacidad" value={capacityLabel(selected)} /><Fact icon={Ruler} label="Escenario" value={missing(selected.technical.stage)} /><Fact icon={Volume2} label="Sonido" value={missing(selected.technical.sound)} /><Fact icon={Lightbulb} label="Iluminación" value={missing(selected.technical.lighting)} /><Fact icon={Monitor} label="Proyección" value={missing(selected.technical.projection)} /><Fact icon={DoorOpen} label="Camarines" value={missing(selected.technical.backstage)} /></dl><a href={spaceHash(view, selected.id, true)} className="primary-button">Ver ficha técnica completa<ArrowRight size={20} aria-hidden="true" /></a><p className="space-overview-note">Incluye dimensiones, conectividad, accesibilidad y condiciones de uso.</p></div>
    </article>}
  </section>;
}
