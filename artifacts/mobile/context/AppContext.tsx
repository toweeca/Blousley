import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch as fetch, clearApiSession, logoutApiSession } from "@/lib/api-client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type UserRole = "customer" | "tailor";

interface AppUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  phone?: string;
}

const _raw = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = _raw && !_raw.startsWith("http") ? `https://${_raw}` : _raw;

interface AppContextType {
  user: AppUser | null;
  setUser: (user: AppUser | null) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const USER_STORAGE_KEY = "@saree_blouse_user";

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const response = await fetch(`${API_BASE}/api/auth/me`);
        if (response.status === 401) {
          await clearApiSession();
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          return;
        }
        if (!response.ok) throw new Error("Could not validate the API session");
        const account: AppUser = await response.json();
        setUserState(account);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(account));
      }
    } catch (e) {
      console.error("Could not validate the saved account session");
    } finally {
      setIsLoading(false);
    }
  };

  const setUser = async (u: AppUser | null) => {
    setUserState(u);
    if (u) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      if (u.email && API_BASE) {
        fetch(`${API_BASE}/api/users/me`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone }),
        }).catch((e) => console.error("Failed to sync user to server", e));
      }
    } else {
      await logoutApiSession().catch(() => undefined);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  return (
    <AppContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
