import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../api/client';
import { AuthApi } from '../api/endpoints';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (b: { email: string; full_name: string; phone: string; password: string; confirm_password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const hardLogout = useCallback(async () => { await tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    tokenStore.setOnAuthLost(() => setUser(null));
    (async () => {
      try {
        const { access } = await tokenStore.load();
        if (access || (await tokenStore.refresh())) setUser(await AuthApi.me()); // interceptor refreshes if expired
      } catch { await tokenStore.clear(); }
      finally { setBooting(false); }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await AuthApi.login(email.trim(), password);
    await tokenStore.save(r.access, r.refresh);
    setUser(r.user);
  }, []);

  const register = useCallback(async (b: Parameters<AuthState['register']>[0]) => {
    await AuthApi.register({ ...b, email: b.email.trim() });
    await login(b.email, b.password);
  }, [login]);

  const logout = useCallback(async () => {
    try { const r = await tokenStore.refresh(); if (r) await AuthApi.logout(r); } catch { /* best effort: still clear locally */ }
    await hardLogout();
  }, [hardLogout]);

  const value = useMemo(() => ({ user, booting, login, register, logout, setUser }), [user, booting, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
