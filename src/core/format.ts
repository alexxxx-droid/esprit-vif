/** Espace insécable : l'unité ne se retrouve jamais seule en début de ligne. */
const NBSP = String.fromCharCode(0xa0);

const oneDecimal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const weekdayNarrow = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' });
const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' });

/** 32400 ms → « 32,4 s ». */
export function formatSeconds(ms: number): string {
  return `${oneDecimal.format(ms / 1000)}${NBSP}s`;
}

/** Accord en nombre à la française : 0 et 1 restent au singulier. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count}${NBSP}${Math.abs(count) < 2 ? singular : pluralForm}`;
}

function fromDayKey(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** « 2026-10-19 » → « lundi 19 octobre ». */
export function formatLongDay(day: string): string {
  return longDay.format(fromDayKey(day));
}

/** « 2026-10-19 » → « 19 oct. ». */
export function formatShortDay(day: string): string {
  return shortDay.format(fromDayKey(day));
}

/** « 2026-10-19 » → « L ». */
export function formatWeekdayInitial(day: string): string {
  return weekdayNarrow.format(fromDayKey(day));
}

/** « 2026-10-19 » → « lundi 19 ». */
export function formatWeekday(day: string): string {
  return weekdayLong.format(fromDayKey(day));
}

/** « 2026-10-19 » → « octobre 2026 ». */
export function formatMonth(day: string): string {
  return monthYear.format(fromDayKey(day));
}
