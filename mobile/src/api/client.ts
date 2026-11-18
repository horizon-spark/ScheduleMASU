// src/api/client.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!baseUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_BASE_URL не задан. Укажите адрес прокси в .env " +
      "(например: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3001)",
  );
}

// Должны совпадать с ключами в context/authContext.tsx
const TOKEN_KEY = "userToken";
const USER_KEY = "userInfo";

export const api = axios.create({
  baseURL: baseUrl,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// --- Колбэк на 401, регистрируется из AuthProvider ---
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

// --- Request: подставляем user-токен, если он есть ---
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("[api] failed to read user token", e);
  }
  return config;
});

// --- Response: 401 (кроме логина) => чистим сессию и уведомляем контекст ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    const isLoginRequest = url.includes("/api/login");

    if (status === 401 && !isLoginRequest) {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
