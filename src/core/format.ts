import { isSingular, lang, locale, type Lang } from './lang';

/** Espace insécable : l'unité ne se retrouve jamais seule en début de ligne. */
export const NBSP = String.fromCharCode(0xa0);

/** Les formats Intl de la langue en cours, créés une fois par langue. */
interface Formats {
  oneDecimal: Intl.NumberFormat;
  decimal: Intl.NumberFormat;
  longDay: Intl.DateTimeFormat;
  shortDay: Intl.DateTimeFormat;
  monthYear: Intl.DateTimeFormat;
  weekdayNarrow: Intl.DateTimeFormat;
  weekdayLong: Intl.DateTimeFormat;
}

const cache = new Map<string, Formats>();

function formats(): Formats {
  const key = locale();
  let set = cache.get(key);
  if (!set) {
    set = {
      oneDecimal: new Intl.NumberFormat(key, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      decimal: new Intl.NumberFormat(key, { maximumFractionDigits: 2 }),
      longDay: new Intl.DateTimeFormat(key, { weekday: 'long', day: 'numeric', month: 'long' }),
      shortDay: new Intl.DateTimeFormat(key, { day: 'numeric', month: 'short' }),
      monthYear: new Intl.DateTimeFormat(key, { month: 'long', year: 'numeric' }),
      weekdayNarrow: new Intl.DateTimeFormat(key, { weekday: 'narrow' }),
      weekdayLong: new Intl.DateTimeFormat(key, { weekday: 'long', day: 'numeric' }),
    };
    cache.set(key, set);
  }
  return set;
}

/** 32400 ms → « 32,4 s » (« 32.4 s » en anglais). */
export function formatSeconds(ms: number): string {
  return `${formatOneDecimal(ms / 1000)}${NBSP}s`;
}

/** Un nombre à une décimale, à la façon de la langue en cours. */
export function formatOneDecimal(value: number): string {
  return formats().oneDecimal.format(value);
}

/** Un nombre à deux décimales au plus. */
export function formatDecimal(value: number): string {
  return formats().decimal.format(value);
}

/**
 * Accord en nombre : en français (et en portugais du Brésil), 0 et 1 restent au singulier ; ailleurs, seul 1.
 * Les mots viennent de la même langue : `tr(plural(n, 'partie'), plural(n, 'game'))`.
 */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count}${NBSP}${isSingular(count) ? singular : pluralForm}`;
}

/**
 * La forme qui va avec le nombre, phrase entière : `byCount(n, `${n} client entre`, `${n} clients entrent`)`.
 * Dans un `tr()`, chaque langue garde sa propre règle d'accord (0 au singulier en français, au pluriel en anglais).
 */
export function byCount(count: number, one: string, many: string): string {
  return isSingular(count) ? one : many;
}

function fromDayKey(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** « 2026-10-19 » → « lundi 19 octobre ». */
export function formatLongDay(day: string): string {
  return formats().longDay.format(fromDayKey(day));
}

/** « 2026-10-19 » → « 19 oct. ». */
export function formatShortDay(day: string): string {
  return formats().shortDay.format(fromDayKey(day));
}

/** « 2026-10-19 » → « L ». */
export function formatWeekdayInitial(day: string): string {
  return formats().weekdayNarrow.format(fromDayKey(day));
}

const SHORT_DAYS: Record<Lang, string[]> = {
  fr: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  es: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  it: ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'],
  pt: ['Do', '2ª', '3ª', '4ª', '5ª', '6ª', 'Sá'],
};

/** « 2026-10-19 » → « Lu » : deux lettres, sans confondre mardi et mercredi. */
export function formatWeekdayShort(day: string): string {
  return SHORT_DAYS[lang()][fromDayKey(day).getDay()];
}

/** « 2026-10-19 » → « lundi 19 ». */
export function formatWeekday(day: string): string {
  return formats().weekdayLong.format(fromDayKey(day));
}

/** Une heure, à la façon de la langue en cours : « 10:42 » (« 10:42 AM » en anglais). */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** « 2026-10-19 » → « octobre 2026 ». */
export function formatMonth(day: string): string {
  return formats().monthYear.format(fromDayKey(day));
}
