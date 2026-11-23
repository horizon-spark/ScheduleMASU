// src/constants/schedule.ts
export const DAYS_RU = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
] as const;

export const DAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

/** Показываем только пн–сб (воскресенье — выходной). */
export const WEEKDAYS_COUNT = 6;

/** Учебный год начинается 31 августа. */
const ACADEMIC_YEAR_START_MONTH = 7; // 0-based: август
const ACADEMIC_YEAR_START_DAY = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Форматирует дату в локальном времени как YYYY-MM-DD (без UTC-сдвига). */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Возвращает понедельник недели, содержащей `date`, в локальном времени. */
export function getMondayOfWeek(date: Date): Date {
  const monday = new Date(date);
  // getDay(): 0 = вс, 1 = пн, ... 6 = сб
  const offset = (date.getDay() + 6) % 7; // 0 для пн, 6 для вс
  monday.setDate(date.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Индекс дня недели 0..6, где 0 = понедельник. */
export function getDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Воскресенье недели, начинающейся с `start` (понедельник). */
function getWeekEnd(start: Date): Date {
  return addDays(start, 6);
}

/** Диапазон недели в формате API: YYYY-MM-DD. */
export function getWeekRange(start: Date): { start: string; end: string } {
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(getWeekEnd(start)),
  };
}

function formatDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/** Человекочитаемый диапазон недели, например «23.11 – 29.11». */
export function formatWeekRange(start: Date): string {
  return `${formatDayMonth(start)} – ${formatDayMonth(getWeekEnd(start))}`;
}

/** Начало учебного года (31 августа), к которому относится дата. */
function getAcademicYearStart(date: Date): Date {
  const afterStart =
    date.getMonth() > ACADEMIC_YEAR_START_MONTH ||
    (date.getMonth() === ACADEMIC_YEAR_START_MONTH &&
      date.getDate() >= ACADEMIC_YEAR_START_DAY);
  const year = afterStart ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, ACADEMIC_YEAR_START_MONTH, ACADEMIC_YEAR_START_DAY);
}

/**
 * Чётность учебной недели. Первая неделя от 31 августа считается чётной —
 * так же, как на сайте МАУ.
 */
export function getWeekParity(start: Date): "чётная" | "нечётная" {
  const monday = getMondayOfWeek(start);
  const academicStart = getAcademicYearStart(monday);
  const days = Math.round(
    (monday.getTime() - academicStart.getTime()) / DAY_MS,
  );
  const weekIndex = Math.floor(days / 7);
  return weekIndex % 2 === 0 ? "чётная" : "нечётная";
}

/** «2026-11-20 16:43:22» → «20.11.2026 16:43». */
export function formatUpdateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hours, minutes] = match;
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
