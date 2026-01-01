import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialYear } from '../types';
import { fiscalYearsApi } from '../services/fiscalYearsApi';

interface YearState {
  selectedYear: FinancialYear | null;
  years: FinancialYear[];
  isLoading: boolean;

  // Actions
  fetchYears: () => Promise<void>;
  setSelectedYear: (year: FinancialYear) => void;
  setSelectedYearById: (yearId: string) => Promise<void>;
  initializeYear: () => Promise<void>;
}

export const useYearStore = create<YearState>()(
  persist(
    (set, get) => ({
      selectedYear: null,
      years: [],
      isLoading: false,

      fetchYears: async () => {
        set({ isLoading: true });
        try {
          const years = await fiscalYearsApi.list();
          set({ years });

          // If no selected year, automatically select the current year
          const currentState = get();
          if (!currentState.selectedYear && years.length > 0) {
            const currentYear = years.find(y => y.is_current) || years[0];
            set({ selectedYear: currentYear });
          }
        } catch (error) {
          console.error('Failed to fetch years:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      setSelectedYear: (year: FinancialYear) => {
        set({ selectedYear: year });
      },

      setSelectedYearById: async (yearId: string) => {
        try {
          const year = await fiscalYearsApi.get(yearId);
          set({ selectedYear: year });
        } catch (error) {
          console.error('Failed to set selected year:', error);
        }
      },

      initializeYear: async () => {
        const currentState = get();

        // Only initialize if we don't have a selected year
        if (!currentState.selectedYear) {
          set({ isLoading: true });
          try {
            const years = await fiscalYearsApi.list();
            set({ years });

            if (years.length > 0) {
              // Try to get the current year, fallback to first year
              const currentYear = years.find(y => y.is_current) || years[0];
              set({ selectedYear: currentYear });
            }
          } catch (error) {
            console.error('Failed to initialize year:', error);
          } finally {
            set({ isLoading: false });
          }
        }
      },
    }),
    {
      name: 'year-storage',
      partialize: (state) => ({
        // Only persist selectedYear, not the full years list
        selectedYear: state.selectedYear,
      }),
    }
  )
);
