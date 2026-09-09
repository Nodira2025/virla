export const ENTRADANET_BASE_URL = 'https://elvirla.entradanet.com/';

export const ENTRADANET_EVENTS_API =
  `${ENTRADANET_BASE_URL}wp-json/wp/v2/tc_events` +
  '?per_page=100&_fields=id,link,title,event_date_time,event_end_date_time,event_location';

export const isEntradanetUrl = (value?: string): boolean => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'elvirla.entradanet.com';
  } catch {
    return false;
  }
};
