'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { AuthOtpDispatch, SafeUser, UserRole } from '@/lib/types';

type User = Omit<SafeUser, 'id' | 'createdAt' | 'updatedAt'>;
type AuthProviderProps = {
  children: ReactNode;
  initialUser?: SafeUser | null;
  sessionResolved?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<User>;
  requestSignupOtp: (name: string, email: string, password: string, role: UserRole) => Promise<AuthOtpDispatch>;
  verifySignupOtp: (requestToken: string, otp: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_CACHE_KEY = 'fm_auth_user';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'include',
  });
  const payload = await res.json();
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload.data as T;
}

function normalizeUser(user: SafeUser): User {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isPro: user.isPro,
    aiCredits: user.aiCredits,
  };
}

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children, initialUser = null, sessionResolved = false }: AuthProviderProps) => {
  const initialNormalizedUser = initialUser ? normalizeUser(initialUser) : null;
  const [user, setUser] = useState<User | null>(() => (sessionResolved ? initialNormalizedUser : readCachedUser()));
  const [loading, setLoading] = useState(!sessionResolved);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_CACHE_KEY);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    if (sessionResolved) {
      setLoading(false);
    }

    const syncSession = async () => {
      try {
        const safeUser = await api<SafeUser>('/api/auth/me', { method: 'GET' });
        if (!active) return;
        setUser(normalizeUser(safeUser));
      } catch {
        if (!active) return;
        setUser((current) => (sessionResolved ? current : null));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void syncSession();

    return () => {
      active = false;
    };
  }, [sessionResolved]);

  const login = async (email: string, password: string, role: UserRole) => {
    const safeUser = await api<SafeUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    const next = normalizeUser(safeUser);
    setUser(next);
    return next;
  };

  const requestSignupOtp = async (name: string, email: string, password: string, role: UserRole) => {
    return api<AuthOtpDispatch>('/api/auth/signup/request-otp', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  };

  const verifySignupOtp = async (requestToken: string, otp: string) => {
    const safeUser = await api<SafeUser>('/api/auth/signup/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ requestToken, otp }),
    });
    const next = normalizeUser(safeUser);
    setUser(next);
    return next;
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {
      // Ignore logout API failures and clear local state anyway.
    }
    setUser(null);
  };

  const updateUser = async (updatedUser: User) => {
    if (!updatedUser.email) return;
    const safeUser = await api<SafeUser>('/api/users', {
      method: 'PATCH',
      body: JSON.stringify({
        email: updatedUser.email,
        updates: {
          name: updatedUser.name,
          role: updatedUser.role as UserRole,
          isPro: updatedUser.isPro,
          aiCredits: updatedUser.aiCredits,
        },
      }),
    });
    setUser(normalizeUser(safeUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, requestSignupOtp, verifySignupOtp, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
