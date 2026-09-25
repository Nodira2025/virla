export type SpaceView = 'technical' | 'spaces';
export function spaceHash(view: SpaceView, id?: string, full = false) {
  return (view === 'technical' ? '#datos-tecnicos' : '#espacios') + (id ? '/' + encodeURIComponent(id) : '') + (id && full ? '/ficha' : '');
}
export function parseSpaceHash(hash: string) {
  const [base, id, page, ...extra] = hash.split('/');
  return {
    view: base === '#datos-tecnicos' ? 'technical' as const : 'spaces' as const,
    id: id || undefined,
    full: page === 'ficha',
    invalid: Boolean(extra.length || (page && page !== 'ficha')),
  };
}
