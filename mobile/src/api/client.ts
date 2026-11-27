// src/api/client.ts
import {
  create,
  isAxiosError,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import * as SecureStore from "expo-secure-store";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!baseUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_BASE_URL не задан. Укажите адрес прокси в .env " +
      "(например: EXPO_PUBLIC_API_BASE_URL=https://schedule.example.ru/api)",
  );
}

// В production обязателен HTTPS. HTTP допускается только в dev-клиенте
// и в preview-сборке, где явно выставлен EXPO_PUBLIC_ALLOW_HTTP=1.
const allowHttp = __DEV__ || process.env.EXPO_PUBLIC_ALLOW_HTTP === "1";
if (!allowHttp && !baseUrl.startsWith("https://")) {
  throw new Error(
    "В production-сборке EXPO_PUBLIC_API_BASE_URL должен начинаться с https://",
  );
}

// ── Ключи должны совпадать с context/authContext.tsx ─────────
export const ACCESS_KEY = "accessToken";
export const REFRESH_KEY = "refreshToken";
export const USER_KEY = "userInfo";

// ── In-memory состояние (быстрее, чем SecureStore на каждый запрос) ──
interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
}
let currentTokens: Tokens = { accessToken: null, refreshToken: null };

export function setTokens(t: Tokens) {
  currentTokens = { ...t };
}
export function getTokens() {
  return currentTokens;
}

// ── Колбэки для AuthContext ──────────────────────────────────
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn;
}

type TokensRefreshedHandler = (t: {
  accessToken: string;
  refreshToken: string;
}) => void;
let onTokensRefreshed: TokensRefreshedHandler | null = null;
export function setTokensRefreshedHandler(fn: TokensRefreshedHandler | null) {
  onTokensRefreshed = fn;
}

// ── Безопасный разбор JSON ───────────────────────────────────
// Nginx/шлюз может вернуть текст вроде "upstream connect error..." с
// content-type JSON. Не даём Axios упасть с SyntaxError до обработки статуса.
function parseJsonSafely(data: unknown): unknown {
  if (typeof data !== "string" || data.length === 0) return data;

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

const clientDefaults = {
  baseURL: baseUrl,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
  transformResponse: [parseJsonSafely],
};

// ── Основной инстанс ─────────────────────────────────────────
export const api = create({
  ...clientDefaults,
  headers: { ...clientDefaults.headers },
});

// ── «Голый» инстанс для /refresh и /logout: без интерсепторов ──
const raw = create({
  ...clientDefaults,
  headers: { ...clientDefaults.headers },
});

// ── Request: подставляем access из памяти (без await — интерсептор sync) ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (currentTokens.accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${currentTokens.accessToken}`;
  }
  return config;
});

// ── Response: 401 → refresh → retry ──────────────────────────
// Семантика очереди:
//   • Первый 401 запускает refresh, остальные ждут.
//   • При успехе — flush с новым access, каждый повторяет свой запрос.
//   • При ошибке refresh — flush с reject, onUnauthorized → signOut.
//   • ВАЖНО: login/refresh/logout не должны зацикливаться.
let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function flushQueue(err: unknown, token: string | null) {
  for (const p of pendingQueue) {
    if (err) p.reject(err);
    else p.resolve(token as string);
  }
  pendingQueue = [];
}

function isAuthPath(url: string | undefined) {
  if (!url) return false;
  return (
    url.includes("/api/login") ||
    url.includes("/login") ||
    url.includes("/refresh") ||
    url.includes("/logout")
  );
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    // Не 401, или это auth-запрос, или уже повторяли — не трогаем
    if (
      !original ||
      status !== 401 ||
      isAuthPath(original.url) ||
      original._retry
    ) {
      // Если 401 на обычном запросе и нет refreshToken — сессии кончились
      if (status === 401 && !currentTokens.refreshToken) {
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }

    // Нет refresh — восстанавливать нечего
    if (!currentTokens.refreshToken) {
      onUnauthorized?.();
      return Promise.reject(error);
    }

    // Refresh уже идёт — становимся в очередь
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (newAccess) => {
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newAccess}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await raw.post("/refresh", {
        refreshToken: currentTokens.refreshToken,
      });

      if (!data?.success || !data?.accessToken) {
        throw new Error(data?.message || "Refresh failed");
      }

      const newAccess: string = data.accessToken;
      // Сервер ротирует refresh — всегда есть новый. Если нет, оставим старый.
      const newRefresh: string =
        data.refreshToken ?? currentTokens.refreshToken;

      currentTokens = { accessToken: newAccess, refreshToken: newRefresh };
      onTokensRefreshed?.({ accessToken: newAccess, refreshToken: newRefresh });

      flushQueue(null, newAccess);

      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (err) {
      flushQueue(err, null);

      // 401/400 — refresh действительно больше не валиден, сессию пора
      // завершать. Сетевые ошибки и 5xx (например, временно недоступен
      // Redis на прокси) не должны разлогинивать: токены оставляем,
      // чтобы повторный запрос мог обновить сессию позже.
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const permanent = !isAxiosError(err) || status === 400 || status === 401;

      if (permanent) {
        currentTokens = { accessToken: null, refreshToken: null };
        // Чистим SecureStore асинхронно и уведомляем контекст
        SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
        SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
        SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
        onUnauthorized?.();
      }

      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

// ── Утилита для logout ───────────────────────────────────────
export async function postLogout(refreshToken: string | null) {
  if (!refreshToken) return;
  try {
    await raw.post("/logout", { refreshToken });
  } catch {
    // Не критично: локально всё равно чистим
  }
}
