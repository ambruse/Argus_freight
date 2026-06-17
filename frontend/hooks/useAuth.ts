"use client";
// hooks/useAuth.ts
// ─────────────────────────────────────────────────────────────
//  Authentication hook — login, logout, guard.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { authStorage, AuthUser } from "@/lib/auth";

export function useAuth() {
  const router = useRouter();
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const stored = authStorage.getUser();
    if (stored && authStorage.isAuthenticated()) {
      setUser(stored);
    } else {
      authStorage.clear();
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post("/auth/login", { username, password });
    if (data.success) {
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, loading, login, logout };
}
