import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { loginRequest } from "../api/auth";

interface UserInfo {
  displayName?: string;
  email?: string;
}

interface AuthContextType {
  userToken: string | null;
  user: UserInfo | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = "userToken";
const USER_KEY = "userInfo";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка сохранённой сессии при старте
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userJson = await SecureStore.getItemAsync(USER_KEY);
        if (token) {
          setUserToken(token);
          if (userJson) setUser(userJson ? JSON.parse(userJson) : null);
        }
      } catch (e) {
        console.warn("Failed to load auth state", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { token, user: u } = await loginRequest(username, password);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u ?? {}));
    setUserToken(token);
    setUser(u ?? null);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUserToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ userToken, user, signIn, signOut, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
