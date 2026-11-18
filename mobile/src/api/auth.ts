import { api } from "./client";

export interface LoginResult {
  token: string;
  user: { displayName?: string; email?: string };
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const { data } = await api.post("/login", { username, password });

    if (!data?.success || !data?.token) {
      throw new Error(data?.message || "Не удалось войти");
    }
    return { token: data.token, user: data.user };
  } catch (err: any) {
    // Ответ сервера/прокси с сообщением — пробрасываем как есть
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
