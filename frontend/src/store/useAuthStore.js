import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch } from '../api/client';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Initialize auth by verifying token
      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();

          if (data.success) {
            set({ user: data.user, isAuthenticated: true });
          } else {
            // Server explicitly rejected the token (expired/invalid) — log out
            set({ user: null, token: null, isAuthenticated: false });
          }
        } catch (error) {
          // Network error (offline) — keep existing session, don't log out
          console.warn('[Auth] checkAuth failed (likely offline) — keeping session', error);
        }
      },

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'mehfil-auth-storage',
    }
  )
);
