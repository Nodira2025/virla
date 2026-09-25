import { RESERVABLE_SPACES, type ReservationInput } from './reservations';

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const words: Record<string, number> = { cero:0,un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiun:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50 };
const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export function parseVoiceBooking(transcript: string, today: string): Partial<ReservationInput> {
  const result: Partial<ReservationInput> = {};
  let text = normalize(transcript);
  text = text.replace(/\b(treinta|cuarenta|cincuenta) y (uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, (_, tens: string, unit: string) => String(words[tens]+words[unit]));
  text = text.replace(new RegExp('\\b(' + Object.keys(words).join('|') + ')\\b','g'), (word) => String(words[word]));
  const [year, month] = today.split('-').map(Number);
  const relative = /\bpasado manana\b/.test(text) ? 2 : /\bmanana\b/.test(text) && !/de la manana/.test(text) ? 1 : /\bhoy\b/.test(text) ? 0 : null;
  if (relative !== null) { const date = new Date(today+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+relative); result.date = date.toISOString().slice(0,10); }
  const dateMatch = text.match(/\b(?:dia\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de(?:l)?\s+(\d{4}))?\b/);
  const numericDate = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (dateMatch) result.date = `${dateMatch[3] || year}-${String(months.indexOf(dateMatch[2])+1).padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`;
  else if (numericDate) result.date = `${numericDate[3] || year}-${numericDate[2].padStart(2,'0')}-${numericDate[1].padStart(2,'0')}`;
  else { const day = text.match(/\bdia (\d{1,2})\b/); if (day) result.date = `${year}-${String(month).padStart(2,'0')}-${day[1].padStart(2,'0')}`; }
  const time = '(\\d{1,2})(?:(?::| y )(\\d{1,2}|media|cuarto))?';
  const range = text.match(new RegExp('\\b(?:de(?:sde)?|a las)\\s+(?:las\\s+)?' + time + '\\s*(?:horas|hs)?\\s*(?:a|hasta)(?:\\s+las)?\\s+' + time + '\\s*(?:horas|hs)?\\b'));
  const format = (h: string, m?: string) => { const minute = m === 'media' ? 30 : m === 'cuarto' ? 15 : Number(m || 0); return Number(h) < 24 && minute < 60 ? h.padStart(2,'0')+':'+String(minute).padStart(2,'0') : undefined; };
  // AM/PM speech can be ambiguous; leave selection explicit instead of silently changing hours.
  if (range && !/\b(?:tarde|noche|manana|am|pm)\b/.test(text.replace(/\b(?:pasado manana|manana)\b(?!\s*(?:de|a)\s+la)/,''))) {
    result.startTime = format(range[1],range[2]); result.endTime = format(range[3],range[4]);
  } else if (!range) { const start = text.match(new RegExp('\\ba las\\s+'+time+'\\s*(?:horas|hs)')); if (start) result.startTime = format(start[1],start[2]); }
  const aliases: Array<[ReservationInput['spaceId'], RegExp]> = [ ['teatro-300',/\b(?:sala (?:de )?teatro|teatro)\b/],['subsuelo-muestras',/\b(?:sala (?:de )?muestras|subsuelo)\b/],['bar',/\b(?:bar|patio)\b/],['radio',/\b(?:radio|estudio)\b/],['boleteria',/\bboleteria\b/],['recepcion',/\b(?:recepcion|hall)\b/] ];
  const roomSegment = text.split(/\bpara (?:el |la )?(?:evento|actividad)\b/)[0];
  const matches = aliases.filter(([, pattern]) => pattern.test(roomSegment));
  if (matches.length === 1) result.spaceId = matches[0][0];
  const title = transcript.match(/para\s+(?:(?:el|la)\s+)?(?:evento|actividad)\s*[: ,]?\s*(.+?)(?=\s*[,.;]?\s+solicitad[ao]\s+por\b|$)/i)?.[1]?.replace(/[.,;]+$/, '').trim();
  if (title) { result.title = title.slice(0,100); result.description = 'Actividad: '+result.title; }
  if (result.date && (Number.isNaN(Date.parse(result.date+'T12:00:00Z')) || new Date(result.date+'T12:00:00Z').toISOString().slice(0,10) !== result.date)) delete result.date;
  return Object.fromEntries(Object.entries(result).filter(([,value]) => value !== undefined)) as Partial<ReservationInput>;
}
export const voiceRoomChoices = RESERVABLE_SPACES;
