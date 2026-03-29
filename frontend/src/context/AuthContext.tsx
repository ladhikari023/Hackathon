import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import api from "../api/client";

export type UserRole = "user" | "therapist" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  provider: string;
  role: UserRole;
  is_premium: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginAsDemo: (account: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const savedToken = localStorage.getItem("token");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(savedToken);
  const [loading, setLoading] = useState(!!savedToken);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function loginAsDemo(account: string) {
    const res = await api.post("/auth/demo", { account });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginAsDemo, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
