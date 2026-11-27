// src/utils/scheduleCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Lesson } from "../api/types";
import { normalizeLesson } from "../api/normalize";
import {
  selectCacheKeysToRemove,
  type CacheEntryInfo,
} from "./cachePolicy";

const PREFIX = "scheduleCache:";
const CACHE_VERSION = 1;

/** Данные считаются свежими 10 минут; дальше — тихая ревалидация. */
const SCHEDULE_CACHE_TTL_MS = 10 * 60 * 1000;

/** Сколько недель/субъектов храним и как долго. */
const MAX_CACHE_ENTRIES = 40;
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastPruneAt = 0;
let pruneInFlight: Promise<void> | null = null;

export interface CachedSchedule {
  version: number;
  timetable: Lesson[];
  update: string | null;
  fetchedAt: number;
  stale?: boolean;
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

/**
 * Приводит запись кеша к безопасному виду. Кеш мог быть записан старой
 * версией приложения или повреждён, поэтому не доверяем его форме.
 */
function parseCachedSchedule(value: unknown): CachedSchedule | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<CachedSchedule>;
  if (
    candidate.version !== CACHE_VERSION ||
    !Array.isArray(candidate.timetable) ||
    typeof candidate.fetchedAt !== "number" ||
    !Number.isFinite(candidate.fetchedAt)
  ) {
    return null;
  }

  const timetable = candidate.timetable
    .map(normalizeLesson)
    .filter((item): item is Lesson => item !== null);

  return {
    version: CACHE_VERSION,
    timetable,
    update: typeof candidate.update === "string" ? candidate.update : null,
    fetchedAt: candidate.fetchedAt,
    stale: candidate.stale === true,
  };
}

/**
 * Чистит старые и лишние записи кеша. Вызывается при старте и после записи,
 * но не чаще раза в 6 часов (кроме случаев, когда лимит уже превышен).
 */
export function pruneScheduleCache(force = false): Promise<void> {
  const now = Date.now();

  if (!force && now - lastPruneAt < PRUNE_INTERVAL_MS) {
    return Promise.resolve();
  }

  if (pruneInFlight) return pruneInFlight;

  lastPruneAt = now;

  pruneInFlight = (async () => {
    try {
      const storageKeys = (await AsyncStorage.getAllKeys()).filter((key) =>
        key.startsWith(PREFIX),
      );

      if (storageKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(storageKeys);
        const entries: CacheEntryInfo[] = pairs.map(([storageKey, raw]) => {
          let fetchedAt = Number.NaN;

          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { fetchedAt?: unknown };
              if (typeof parsed.fetchedAt === "number") {
                fetchedAt = parsed.fetchedAt;
              }
            } catch {
              // Битый JSON удаляем как просроченный.
            }
          }

          return { key: storageKey, fetchedAt };
        });

        const remove = selectCacheKeysToRemove(entries, {
          maxEntries: MAX_CACHE_ENTRIES,
          maxAgeMs: MAX_CACHE_AGE_MS,
          now,
        });

        if (remove.length > 0) {
          await AsyncStorage.multiRemove(remove);
          for (const storageKey of remove) {
            memory.delete(storageKey.slice(PREFIX.length));
          }
        }
      }

      // В памяти могут быть записи, которые не успели попасть в AsyncStorage.
      const memoryEntries = [...memory.entries()].map(([key, value]) => ({
        key,
        fetchedAt: value.fetchedAt,
      }));
      const removeFromMemory = selectCacheKeysToRemove(memoryEntries, {
        maxEntries: MAX_CACHE_ENTRIES,
        maxAgeMs: MAX_CACHE_AGE_MS,
        now,
      });
      for (const key of removeFromMemory) {
        memory.delete(key);
      }
    } catch {
      // Кеш не критичен: при ошибке просто работаем без него
    }
  })().finally(() => {
    pruneInFlight = null;
  });

  return pruneInFlight;
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
    const entry = parseCachedSchedule(parsed);
    if (!entry) return null;

    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

export async function writeScheduleCache(
  key: string,
  value: StoredSchedule,
): Promise<void> {
  const entry: CachedSchedule = {
    version: CACHE_VERSION,
    timetable: (Array.isArray(value.timetable) ? value.timetable : [])
      .map(normalizeLesson)
      .filter((item): item is Lesson => item !== null),
    update: typeof value.update === "string" ? value.update : null,
    fetchedAt: value.fetchedAt,
    stale: value.stale === true,
  };

  memory.set(key, entry);
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Кеш не критичен: при ошибке просто работаем без него
  }

  // Если записей уже больше лимита, чистим сразу, не дожидаясь интервала.
  void pruneScheduleCache(memory.size > MAX_CACHE_ENTRIES);
}

export function isScheduleCacheFresh(cached: CachedSchedule): boolean {
  return Date.now() - cached.fetchedAt < SCHEDULE_CACHE_TTL_MS;
}

/** Полная очистка кеша (например, при выходе из аккаунта). */
export async function clearScheduleCache(): Promise<void> {
  memory.clear();
  lastPruneAt = 0;
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
