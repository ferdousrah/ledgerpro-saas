import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, AuthResponse } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (authResponse: AuthResponse) => void;
  setUser: (user: User) => void;
  setTenant: (tenant: Tenant) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (authResponse: AuthResponse) => {
        localStorage.setItem('access_token', authResponse.access_token);
        localStorage.setItem('refresh_token', authResponse.refresh_token);

        set({
          user: authResponse.user,
          tenant: authResponse.tenant,
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token,
          isAuthenticated: true,
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.login({ email, password });
          useAuthStore.getState().setAuth(response);
        } catch (error: any) {
          throw new Error(error.response?.data?.detail || 'Login failed');
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: any) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.register(data);
          useAuthStore.getState().setAuth(response);
        } catch (error: any) {
          throw new Error(error.response?.data?.detail || 'Registration failed');
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          useAuthStore.getState().clearAuth();
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setTenant: (tenant: Tenant) => {
        set({ tenant });
      },

      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        set({
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
