// src/context/AuthContext.tsx
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { loginRequest, logoutRequest, UserInfo } from "../api/auth";
import {
  ACCESS_KEY,
  REFRESH_KEY,
  setTokens,
  setTokensRefreshedHandler,
  setUnauthorizedHandler,
  USER_KEY,
} from "../api/client";
import { clearScheduleCache, pruneScheduleCache } from "../utils/scheduleCache";
import { clearProfileSelection } from "../utils/storage";

interface AuthContextType {
  accessToken: string | null;
  user: UserInfo | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Не в state: нужен только для запросов и не участвует в рендере
  const refreshTokenRef = useRef<string | null>(null);

  // ── Восстановление сессии при старте ─────────────────────────
  useEffect(() => {
    // Кеш расписания не должен расти бесконечно между сессиями.
    void pruneScheduleCache();

    (async () => {
      try {
        const [a, r, u] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_KEY),
          SecureStore.getItemAsync(REFRESH_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (a && r) {
          refreshTokenRef.current = r;
          setTokens({ accessToken: a, refreshToken: r });
          setAccessToken(a);
          if (u) setUser(JSON.parse(u));
        }
      } catch (e) {
        console.warn("Failed to load auth state", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Связка с api-клиентом ────────────────────────────────────
  useEffect(() => {
    // Refresh-провалился (401/REFRESH_REVOKED/REFRESH_EXPIRED) → разлогин
    setUnauthorizedHandler(() => {
      refreshTokenRef.current = null;
      setTokens({ accessToken: null, refreshToken: null });
      setAccessToken(null);
      setUser(null);
      // SecureStore может быть уже почищен в client.ts, но повторная
      // очистка гарантирует, что сессия не восстановится после перезапуска.
      void Promise.all([
        SecureStore.deleteItemAsync(ACCESS_KEY),
        SecureStore.deleteItemAsync(REFRESH_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
        clearProfileSelection(),
        clearScheduleCache(),
      ]).catch((e) => console.warn("Failed to clear session data", e));
    });

    // Клиент успешно ротировал токены → сохраняем
    setTokensRefreshedHandler(({ accessToken: a, refreshToken: r }) => {
      refreshTokenRef.current = r;
      setAccessToken(a);
      SecureStore.setItemAsync(ACCESS_KEY, a).catch(() => {});
      SecureStore.setItemAsync(REFRESH_KEY, r).catch(() => {});
    });

    return () => {
      setUnauthorizedHandler(null);
      setTokensRefreshedHandler(null);
    };
  }, []);

  // ── Вход ─────────────────────────────────────────────────────
  const signIn = useCallback(async (username: string, password: string) => {
    const {
      accessToken: a,
      refreshToken: r,
      user: u,
    } = await loginRequest(username, password);

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, a),
      SecureStore.setItemAsync(REFRESH_KEY, r),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(u ?? {})),
    ]);

    refreshTokenRef.current = r;
    setTokens({ accessToken: a, refreshToken: r });
    setAccessToken(a);
    setUser(u ?? null);
  }, []);

  // ── Выход ────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    // Сервер инвалидирует jti — важно до очистки локального refresh
    await logoutRequest();
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    refreshTokenRef.current = null;
    setTokens({ accessToken: null, refreshToken: null });
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ accessToken, user, signIn, signOut, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
