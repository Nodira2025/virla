import { RESERVABLE_SPACES, type ReservableSpaceId } from './reservations';
import type { PublicSpaceProfile, TechnicalSection } from './spaceCatalog';

interface SpaceProfile {
  summary: string;
  area: string;
  dimensions: string;
  height: string;
  layout: string;
  access: string;
  equipment: string[];
  uses: string[];
  considerations: string;
}

// Contenido ficticio para la demo. No constituye una ficha técnica verificada.
const DEMO_PROFILES: Record<ReservableSpaceId, SpaceProfile> = {
  'teatro-300': {
    summary: 'Una sala frontal para proyectos que necesitan escenario, atención del público y una puesta técnica completa.',
    area: '360 m²', dimensions: '24 × 15 m', height: '6 m',
    layout: '300 butacas fijas. Escenario de 10 × 7 m, con boca de 9 m y dos camarines.',
    access: 'Ingreso por rampa, 4 lugares para sillas de ruedas y sanitario accesible en la misma planta.',
    equipment: ['Sonido PA estéreo, consola de 16 canales y 4 micrófonos.', '12 reflectores LED y consola de iluminación DMX.', 'Proyector Full HD y pantalla de 5 × 3 m.', 'Climatización y alimentación eléctrica de 220 V.'],
    uses: ['Teatro', 'Danza', 'Conciertos', 'Conferencias'],
    considerations: 'Las butacas no se retiran. Para escenografías grandes, revisar el acceso de carga de 1,80 × 2,40 m. La operación de sonido y luces requiere coordinación técnica.',
  },
  'subsuelo-muestras': {
    summary: 'Un espacio abierto y flexible para recorrer obras, armar instalaciones y organizar encuentros alrededor del arte.',
    area: '180 m²', dimensions: '18 × 10 m', height: '3,2 m',
    layout: 'Planta libre en subsuelo. Hasta 120 personas de pie o 60 sentadas, con paneles móviles.',
    access: 'Escalera y ascensor de 0,90 m de ancho de puerta. Circulación interior sin desniveles.',
    equipment: ['Rieles con 20 spots LED orientables.', 'Sistema de colgado y 10 paneles expositivos móviles.', '8 tomas de 220 V distribuidas en el perímetro.', 'Proyector portátil y 2 parlantes activos.'],
    uses: ['Artes visuales', 'Fotografía', 'Instalaciones', 'Presentaciones'],
    considerations: 'No cuenta con luz natural. Las obras de gran formato deben poder pasar por el ascensor o la escalera. No se permite perforar muros en este montaje de referencia.',
  },
  bar: {
    summary: 'Un entorno informal que combina mesas y patio para encuentros cercanos y propuestas de pequeño formato.',
    area: '110 m²', dimensions: 'Interior: 10 × 6 m · patio: 10 × 5 m', height: '3 m en interior',
    layout: 'Hasta 80 personas de pie o 48 sentadas. Mesas y sillas móviles; patio a cielo abierto.',
    access: 'Acceso a nivel desde el hall y paso al patio de 1,20 m de ancho.',
    equipment: ['2 parlantes activos y consola de 6 canales.', '2 micrófonos y pies de micrófono.', 'Iluminación cálida ambiental.', '12 mesas, 48 sillas y tomas de 220 V.'],
    uses: ['Lecturas', 'Música acústica', 'Encuentros', 'Café cultural'],
    considerations: 'El patio depende del clima. No tiene aislamiento acústico ni oscuridad total; conviene para propuestas de volumen moderado.',
  },
  radio: {
    summary: 'Un ambiente de escucha controlada para producir entrevistas, conversaciones y contenidos sonoros.',
    area: '32 m²', dimensions: '8 × 4 m', height: '2,6 m',
    layout: 'Hasta 15 personas entre estudio y control. Mesa de conversación con 6 puestos de micrófono.',
    access: 'Ingreso por puerta de 0,90 m y circulación a nivel. Espacio de giro reducido junto a la mesa.',
    equipment: ['6 micrófonos dinámicos y 6 auriculares.', 'Consola de 12 canales e interfaz de audio USB.', 'Computadora para grabación multipista.', 'Tratamiento acústico y climatización silenciosa.'],
    uses: ['Podcast', 'Entrevistas', 'Radio', 'Grabación de voz'],
    considerations: 'Pensado para voz y grupos pequeños. No dispone de escenario ni espacio para público numeroso. La grabación requiere asistencia técnica.',
  },
  boleteria: {
    summary: 'Un punto de apoyo para recibir asistentes, entregar entradas y organizar la acreditación de una actividad.',
    area: '12 m²', dimensions: '4 × 3 m', height: '2,8 m',
    layout: '2 puestos de atención. Área operativa, sin aforo de público sentado.',
    access: 'Atención desde el hall, con un sector de mostrador bajo a 0,80 m.',
    equipment: ['Mostrador y 2 sillas de trabajo.', 'Computadora, conexión a internet e impresora.', '2 tomas de 220 V.', 'Luz de trabajo y espacio para material de acreditación.'],
    uses: ['Acreditaciones', 'Entrega de entradas', 'Atención al público'],
    considerations: 'Es un espacio de apoyo, no una sala para actividades. Las filas deben organizarse sin obstruir la circulación del hall.',
  },
  recepcion: {
    summary: 'Un lugar de bienvenida y circulación para presentar un proyecto, recibir invitados o iniciar un recorrido.',
    area: '140 m²', dimensions: '14 × 10 m', height: '4,5 m',
    layout: 'Hasta 100 personas de pie o 50 sentadas. Planta abierta con mobiliario móvil.',
    access: 'Entrada a nivel, puertas de doble hoja y conexión con las áreas principales.',
    equipment: ['Iluminación general LED y luz natural.', '2 parlantes portátiles y 1 micrófono inalámbrico.', '4 mesas de recepción y 50 sillas apilables.', '6 tomas de 220 V y conexión Wi-Fi.'],
    uses: ['Recepciones', 'Presentaciones', 'Pequeñas muestras', 'Encuentros'],
    considerations: 'Comparte circulación con otras actividades. No permite aislamiento sonoro ni oscuridad total. Mantener libres los recorridos de acceso y salida.',
  },
};

const DEMO_TECHNICAL: Record<ReservableSpaceId, Partial<Record<TechnicalSection, string>>> = {
  'teatro-300': {
    stage: '10 × 7 m, con boca de 9 m.', sound: DEMO_PROFILES['teatro-300'].equipment[0],
    lighting: DEMO_PROFILES['teatro-300'].equipment[1], projection: DEMO_PROFILES['teatro-300'].equipment[2],
    connectivity: DEMO_PROFILES['teatro-300'].equipment[3], backstage: '2 camarines.',
  },
  'subsuelo-muestras': {
    lighting: DEMO_PROFILES['subsuelo-muestras'].equipment[0],
    projection: 'Proyector portátil; resolución por confirmar.', sound: '2 parlantes activos.',
    connectivity: DEMO_PROFILES['subsuelo-muestras'].equipment[2],
  },
  bar: {
    sound: DEMO_PROFILES.bar.equipment.slice(0, 2).join(' '), lighting: DEMO_PROFILES.bar.equipment[2],
    connectivity: 'Tomas de 220 V. Conexión a internet por confirmar.',
  },
  radio: {
    stage: 'No dispone de escenario.', sound: DEMO_PROFILES.radio.equipment.slice(0, 3).join(' '),
  },
  boleteria: {
    connectivity: DEMO_PROFILES.boleteria.equipment.slice(1, 3).join(' '),
    lighting: 'Luz de trabajo.',
  },
  recepcion: {
    sound: DEMO_PROFILES.recepcion.equipment[1], lighting: DEMO_PROFILES.recepcion.equipment[0],
    connectivity: DEMO_PROFILES.recepcion.equipment[3],
  },
};

export const SPACE_PROFILES: PublicSpaceProfile[] = RESERVABLE_SPACES.map((space) => ({
  ...space, ...DEMO_PROFILES[space.id], schemaVersion: 1, status: 'demo', capacity: space.capacity ?? null,
  technical: { stage: '', sound: '', lighting: '', projection: '', connectivity: '', backstage: '', ...DEMO_TECHNICAL[space.id] },
}));
