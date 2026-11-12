// src/api/auth.ts
import axios from "axios";

// ВАЖНО: на Android-эмуляторе localhost — это 10.0.2.2,
// на iOS-симуляторе — localhost, на реальном устройстве — IP машины в локальной сети.
export const API_BASE_URL = "http://10.1.1.95:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export interface LoginResult {
  token: string;
  user: { displayName?: string; email?: string };
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const { data } = await api.post("/api/login", { username, password });

    if (!data?.success || !data?.token) {
      throw new Error(data?.message || "Не удалось войти");
    }
    return { token: data.token, user: data.user };
  } catch (err: any) {
    // Обработка ответов 401/500 от сервера
    if (err?.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    if (err?.code === "ECONNABORTED") {
      throw new Error("Сервер не ответил вовремя");
    }
    if (err?.message) {
      throw new Error(err.message);
    }
    throw new Error("Сетевая ошибка");
  }
}
