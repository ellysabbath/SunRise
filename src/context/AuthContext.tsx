import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export interface User {
  id: string;
  phone: string;
  full_name: string;
  role: string;
  store_id?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

// ==================================================================
// Context
// ==================================================================
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ==================================================================
// Provider
// ==================================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------------
  // 1. Pakia mtumiaji wakati app inafunguka (auto-login)
  // ------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const init = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { data } = await api.get<User>("/auth/me/");
        if (active) setUser(data);
      } catch {
        // Token imeisha au si sahihi — safisha
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, []);

  // ------------------------------------------------------------------
  // 2. Login
  // ------------------------------------------------------------------
  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await api.post("/auth/login/", { phone, password });

    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    // Weka default store_id kama backend haikurudishi (baadhi ya roles)
    const u: User = {
      ...data.user,
      store_id: data.user.store_id ?? null,
    };
    setUser(u);
    return u;
  }, []);

  // ------------------------------------------------------------------
  // 3. Logout
  // ------------------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  // ------------------------------------------------------------------
  // 4. Refresh user (kusoma upya baada ya kubadilisha data)
  // ------------------------------------------------------------------
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>("/auth/me/");
      setUser(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Value
  // ------------------------------------------------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==================================================================
// Hook
// ==================================================================
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}