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
  code?: string;
}

export type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "LDAP_UNAVAILABLE"
  | "TOKEN_STORE_UNAVAILABLE"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK"
  | "UNKNOWN";

export class LoginError extends Error {
  readonly code: LoginErrorCode;

  constructor(code: LoginErrorCode, message: string) {
    super(message);
    this.name = "LoginError";
    this.code = code;
  }
}

type ErrorPayload = {
  code?: unknown;
  response?: {
    status?: number;
    data?: { code?: unknown };
  };
};

function asErrorPayload(err: unknown): ErrorPayload {
  return err && typeof err === "object" ? (err as ErrorPayload) : {};
}

function mapLoginError(err: unknown): LoginError {
  if (err instanceof LoginError) return err;

  const payload = asErrorPayload(err);
  const serverCode =
    typeof payload.response?.data?.code === "string"
      ? payload.response.data.code
      : undefined;
  const status = payload.response?.status;
  const networkCode =
    typeof payload.code === "string" ? payload.code : undefined;

  if (serverCode === "INVALID_CREDENTIALS" || status === 401) {
    return new LoginError("INVALID_CREDENTIALS", "Неверный логин или пароль");
  }

  if (serverCode === "RATE_LIMITED" || status === 429) {
    return new LoginError(
      "RATE_LIMITED",
      "Слишком много попыток входа. Попробуйте позже",
    );
  }

  if (serverCode === "LDAP_UNAVAILABLE") {
    return new LoginError(
      "LDAP_UNAVAILABLE",
      "Сервер входа временно недоступен. Повторите позже",
    );
  }

  if (serverCode === "TOKEN_STORE_UNAVAILABLE" || status === 503) {
    return new LoginError(
      "TOKEN_STORE_UNAVAILABLE",
      "Сервис авторизации временно недоступен. Повторите позже",
    );
  }

  if (status !== undefined && status >= 500) {
    return new LoginError(
      "SERVER_ERROR",
      "Ошибка сервера входа. Повторите позже",
    );
  }

  if (networkCode === "ECONNABORTED" || networkCode === "ETIMEDOUT") {
    return new LoginError("TIMEOUT", "Сервер не ответил вовремя");
  }

  if (!payload.response || networkCode === "ERR_NETWORK") {
    return new LoginError(
      "NETWORK",
      "Нет связи с сервером. Проверьте подключение к интернету",
    );
  }

  return new LoginError("UNKNOWN", "Не удалось войти. Попробуйте позже");
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
      throw new LoginError(
        "UNKNOWN",
        data?.message || "Сервер вернул неполный ответ",
      );
    }

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user ?? {},
    };
  } catch (err) {
    throw mapLoginError(err);
  }
}

export async function logoutRequest(): Promise<void> {
  const { refreshToken } = getTokens();
  await postLogout(refreshToken);
}
