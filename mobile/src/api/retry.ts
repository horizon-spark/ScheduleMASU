// src/api/retry.ts
import { isAxiosError } from "axios";

const RETRYABLE_STATUSES = new Set([408, 502, 503, 504]);

export type RetryOptions = {
  /** Общее число попыток, включая первую. */
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  signal?: AbortSignal;
  onRetry?: (failedAttempt: number, error: unknown) => void;
};

/**
 * Повторяем только временные ошибки транспорта и upstream.
 * 401/403/404/429 и отменённые запросы не ретраим.
 */
export function isRetryableError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.code === "ERR_CANCELED") return false;

  if (!error.response) return true;

  return RETRYABLE_STATUSES.has(error.response.status);
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new Error("Request aborted");
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(signal as AbortSignal));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  {
    attempts = 2,
    baseDelayMs = 800,
    maxDelayMs = 2500,
    jitterMs = 200,
    signal,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  const totalAttempts = Math.max(1, Math.floor(attempts));

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    if (signal?.aborted) throw abortError(signal);

    try {
      return await operation(attempt);
    } catch (error) {
      const canRetry =
        attempt < totalAttempts &&
        !signal?.aborted &&
        isRetryableError(error);

      if (!canRetry) throw error;

      const delay =
        Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs) +
        Math.random() * jitterMs;

      onRetry?.(attempt, error);
      await wait(delay, signal);
    }
  }

  // Сюда попасть нельзя: цикл либо возвращает результат, либо бросает ошибку.
  throw new Error("Retry attempts exhausted");
}
