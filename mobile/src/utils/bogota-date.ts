const BOGOTA_TIME_ZONE = 'America/Bogota';

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

export function getBogotaCivilToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error('BOGOTA_DATE_UNAVAILABLE');
  }

  return `${year}-${month}-${day}`;
}

export function addCivilDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${padTwo(result.getUTCMonth() + 1)}-${padTwo(result.getUTCDate())}`;
}
