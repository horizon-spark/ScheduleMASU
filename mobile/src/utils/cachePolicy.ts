// src/utils/cachePolicy.ts
export interface CacheEntryInfo {
  /** Ключ записи в AsyncStorage, включая префикс. */
  key: string;
  /** Время записи в миллисекундах; NaN/Infinity считаются битыми. */
  fetchedAt: number;
}

export interface CachePolicyOptions {
  maxEntries: number;
  maxAgeMs: number;
  now?: number;
}

/**
 * Возвращает ключи кеша, которые нужно удалить: просроченные, битые и
 * самые старые сверх лимита. Чистая функция, чтобы её можно было тестировать
 * без AsyncStorage.
 */
export function selectCacheKeysToRemove(
  entries: CacheEntryInfo[],
  { maxEntries, maxAgeMs, now = Date.now() }: CachePolicyOptions,
): string[] {
  const remove = new Set<string>();

  const valid: CacheEntryInfo[] = [];

  for (const entry of entries) {
    const age = now - entry.fetchedAt;

    if (
      !Number.isFinite(entry.fetchedAt) ||
      entry.fetchedAt > now ||
      age > maxAgeMs
    ) {
      remove.add(entry.key);
      continue;
    }

    valid.push(entry);
  }

  if (valid.length > maxEntries) {
    const sorted = [...valid].sort((a, b) => a.fetchedAt - b.fetchedAt);
    const overflow = valid.length - maxEntries;
    for (let i = 0; i < overflow; i += 1) {
      remove.add(sorted[i].key);
    }
  }

  return [...remove];
}
