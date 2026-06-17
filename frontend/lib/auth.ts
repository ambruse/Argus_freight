// lib/auth.ts
// ─────────────────────────────────────────────────────────────
//  Token + user helpers for localStorage persistence.
// ─────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

const TOKEN_KEY = "freight_token";
const USER_KEY  = "freight_user";

export const authStorage = {
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),

  setUser: (user: AuthUser) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  getUser: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  removeUser: () => localStorage.removeItem(USER_KEY),

  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated: (): boolean => !!localStorage.getItem(TOKEN_KEY),
};
