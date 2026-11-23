// src/utils/scheduleCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Lesson } from "../api/types";

const PREFIX = "scheduleCache:";
const CACHE_VERSION = 1;

/** Данные считаются свежими 10 минут; дальше — тихая ревалидация. */
const SCHEDULE_CACHE_TTL_MS = 10 * 60 * 1000;

export interface CachedSchedule {
  version: number;
  timetable: Lesson[];
  update: string | null;
  fetchedAt: number;
}

type StoredSchedule = Omit<CachedSchedule, "version">;

// Горячий кеш в памяти: AsyncStorage читается только при старте/после выгрузки
const memory = new Map<string, CachedSchedule>();

export function makeScheduleCacheKey(
  subjectKey: string,
  start: string,
  end: string,
): string {
  return `${subjectKey}:${start}:${end}`;
}

function isCachedSchedule(value: unknown): value is CachedSchedule {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CachedSchedule>;
  return (
    candidate.version === CACHE_VERSION &&
    Array.isArray(candidate.timetable) &&
    typeof candidate.fetchedAt === "number"
  );
}

export async function readScheduleCache(
  key: string,
): Promise<CachedSchedule | null> {
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;

  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isCachedSchedule(parsed)) return null;

    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeScheduleCache(
  key: string,
  value: StoredSchedule,
): Promise<void> {
  const entry: CachedSchedule = { version: CACHE_VERSION, ...value };
  memory.set(key, entry);
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Кеш не критичен: при ошибке просто работаем без него
  }
}

export function isScheduleCacheFresh(cached: CachedSchedule): boolean {
  return Date.now() - cached.fetchedAt < SCHEDULE_CACHE_TTL_MS;
}

/** Полная очистка кеша (например, при выходе из аккаунта). */
export async function clearScheduleCache(): Promise<void> {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((key) => key.startsWith(PREFIX));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  } catch {
    // ignore
  }
}
