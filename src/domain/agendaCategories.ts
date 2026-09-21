export const AGENDA_CATEGORIES = [
  { id: 'theatre', label: 'Teatro', color: '#047857', background: '#ecfdf5', text: '#064e3b' },
  { id: 'music', label: 'Música', color: '#7e22ce', background: '#faf5ff', text: '#581c87' },
  { id: 'dance', label: 'Danza', color: '#be185d', background: '#fdf2f8', text: '#831843' },
  { id: 'exhibition', label: 'Muestras y exposiciones', color: '#4338ca', background: '#eef2ff', text: '#312e81' },
  { id: 'academic', label: 'Actividad universitaria', color: '#1d4ed8', background: '#eff6ff', text: '#1e3a8a' },
  { id: 'talk', label: 'Charlas y presentaciones', color: '#c2410c', background: '#fff7ed', text: '#7c2d12' },
  { id: 'radio', label: 'Radio', color: '#0e7490', background: '#ecfeff', text: '#164e63' },
  { id: 'other', label: 'Montaje, mantenimiento y otros', color: '#475569', background: '#f1f5f9', text: '#1e293b' },
  { id: 'unclassified', label: 'Sin clasificar', color: '#64748b', background: '#f8fafc', text: '#334155' },
] as const;

export type AgendaCategoryId = (typeof AGENDA_CATEGORIES)[number]['id'];
export const getAgendaCategory = (id?: string) => AGENDA_CATEGORIES.find((item) => item.id === id) || AGENDA_CATEGORIES[8];
export const categoryStyle = (id?: string) => {
  const category = getAgendaCategory(id);
  return { backgroundColor: category.background, color: category.text, borderColor: category.color };
};

// Only explicit category metadata is mapped, never event titles.
export const categoryFromTerms = (terms: Array<{ name?: string; slug?: string; taxonomy?: string }>): AgendaCategoryId => {
  const aliases: Record<string, AgendaCategoryId> = {
    teatro: 'theatre', musica: 'music', 'musica-en-vivo': 'music', danza: 'dance',
    muestra: 'exhibition', muestras: 'exhibition', exposiciones: 'exhibition', 'artes-visuales': 'exhibition',
    universitario: 'academic', 'actividad-universitaria': 'academic', academico: 'academic',
    conferencia: 'talk', conferencias: 'talk', charlas: 'talk', presentaciones: 'talk',
    radio: 'radio', 'radio-en-vivo': 'radio', montaje: 'other', mantenimiento: 'other', otros: 'other',
  };
  for (const term of terms) {
    if (term.taxonomy !== 'event_category') continue;
    for (const value of [term.slug, term.name]) {
      const key = value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-');
      if (key && aliases[key]) return aliases[key];
    }
  }
  return 'unclassified';
};

export const reservationCategory = (category?: string, activityType?: string): AgendaCategoryId => {
  if (category) return getAgendaCategory(category).id;
  if (activityType === 'exhibition' || activityType === 'academic') return activityType;
  if (activityType === 'meeting') return 'talk';
  if (activityType === 'assembly' || activityType === 'maintenance' || activityType === 'other') return 'other';
  return 'unclassified';
};
