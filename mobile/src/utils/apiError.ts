// src/utils/apiError.ts
import { isAxiosError } from "axios";

/**
 * Понятное описание ошибки запроса: сеть, таймаут, отсутствующий маршрут
 * на прокси или ошибка upstream. Помогает отличить проблему клиента
 * от незадеплоенного прокси.
 */
export function describeRequestError(
  err: unknown,
  fallback: string,
): string {
  if (!isAxiosError(err)) return fallback;

  if (!err.response) {
    return err.code === "ECONNABORTED"
      ? `${fallback}: сервер не ответил вовремя`
      : `${fallback}: нет связи с прокси`;
  }

  const status = err.response.status;

  if (status === 404) {
    return `${fallback}: маршрут или данные не найдены (404)`;
  }

  if (status === 401) {
    return `${fallback}: сессия истекла, войдите заново`;
  }

  if (status === 502 || status === 503 || status === 504) {
    const reason =
      status === 504
        ? "API расписания не ответил вовремя"
        : "прокси не смог получить данные";
    return `${fallback}: ${reason} (${status})`;
  }

  const body = err.response.data as { message?: unknown } | undefined;
  if (body && typeof body.message === "string") {
    return `${fallback}: ${body.message}`;
  }

  return `${fallback} (HTTP ${status})`;
}

/** Короткая безопасная строка для логов — без заголовков и токенов. */
export function getErrorSummary(err: unknown): string {
  if (!isAxiosError(err)) {
    return err instanceof Error ? err.message : "unknown error";
  }

  const status = err.response?.status;
  return [err.code, status ? `HTTP ${status}` : null, err.message]
    .filter(Boolean)
    .join(" | ");
}
