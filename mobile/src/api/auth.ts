import { api, getTokens, postLogout } from "./client";

export interface UserInfo {
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

interface ServerLoginResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: UserInfo;
  message?: string;
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const { data } = await api.post<ServerLoginResponse>("/login", {
      username,
      password,
    });

    if (!data?.success || !data?.accessToken || !data?.refreshToken) {
      throw new Error(data?.message || "Не удалось войти");
    }
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user ?? {},
    };
  } catch (err: any) {
    // 401 от LDAP — сервер прислал текст ("Invalid credentials")
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

export async function logoutRequest(): Promise<void> {
  const { refreshToken } = getTokens();
  await postLogout(refreshToken);
}
