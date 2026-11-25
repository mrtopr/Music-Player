import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL } from '../api/client';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Initialize auth by verifying token; retries once if backend/DB is waking up
      checkAuth: async (retried = false) => {
        const { token } = get();
        if (!token) return;

        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Transient 5xx (DB cold-start / waking up) -> retry once before giving up
          if (res.status >= 500 && !retried) {
            await new Promise(r => setTimeout(r, 1500));
            return get().checkAuth(true);
          }

          if (res.status === 401 || res.status === 403) {
            set({ user: null, token: null, isAuthenticated: false });
            return;
          }

          if (!res.ok) {
            // Keep existing session on non-auth transient errors
            return;
          }

          const data = await res.json();
          if (data.success) {
            set({ user: data.user, isAuthenticated: true });
          } else {
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
