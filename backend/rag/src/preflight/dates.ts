import { requireValid } from '../errors.js';

export interface Instant { seconds: number; fraction: string }
const bogota = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  second: '2-digit', hourCycle: 'h23' });

export function validateCivilDate(value: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  requireValid(match, 'date');
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  requireValid(date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day, 'date');
}

/** Compare the declared local clock with IANA rules; never consult today's date. */
export function parseTimestamp(value: string): Instant {
  const m = /^(\d{4}-\d{2}-\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|[+-]\d{2}:\d{2})$/.exec(value);
  requireValid(m, 'date');
  const civil = m[1]!;
  validateCivilDate(civil);
  const hour = Number(m[2]), minute = Number(m[3]), second = Number(m[4]);
  requireValid(hour < 24 && minute < 60 && second < 60, 'date');
  const zone = m[6]!;
  const zoneHour = zone.toUpperCase() === 'Z' ? 0 : Number(zone.slice(1, 3));
  const zoneMinute = zone.toUpperCase() === 'Z' ? 0 : Number(zone.slice(4, 6));
  requireValid(zoneHour < 24 && zoneMinute < 60 && zone !== '-00:00', 'date');
  const offset = (zoneHour * 60 + zoneMinute) * (zone.startsWith('-') ? -1 : 1);
  const local = new Date(`${civil}T${m[2]}:${m[3]}:${m[4]}Z`);
  const seconds = local.getTime() / 1000 - offset * 60;
  requireValid(Number.isFinite(seconds), 'date');
  const parts = new Map(bogota.formatToParts(new Date(seconds * 1000)).map(part => [part.type, part.value]));
  requireValid(`${parts.get('year')?.padStart(4, '0')}-${parts.get('month')}-${parts.get('day')}` === civil
    && Number(parts.get('hour')) === hour && Number(parts.get('minute')) === minute
    && Number(parts.get('second')) === second, 'date');
  return { seconds, fraction: m[5] ?? '' };
}

export function validateInterval(start: string | null, end: string | null): void {
  const a = start === null ? null : parseTimestamp(start);
  const b = end === null ? null : parseTimestamp(end);
  if (a && b) {
    const length = Math.max(a.fraction.length, b.fraction.length);
    requireValid(a.seconds < b.seconds || (a.seconds === b.seconds
      && a.fraction.padEnd(length, '0') <= b.fraction.padEnd(length, '0')), 'date');
  }
}
