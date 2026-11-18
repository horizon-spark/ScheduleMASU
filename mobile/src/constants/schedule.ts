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
