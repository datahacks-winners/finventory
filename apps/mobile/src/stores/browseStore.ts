import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrowseState, ListingFilters } from '../types/listing';

const DEFAULT_FILTERS: ListingFilters = {
  species: [],
  grades: [],
  distance: 25,
  priceRange: [0, 100],
};

interface BrowseStore extends BrowseState {
  // Actions
  setFilters: (filters: Partial<ListingFilters>) => void;
  resetFilters: () => void;
  setViewMode: (mode: 'grid' | 'map') => void;
  setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
}

export const useBrowseStore = create<BrowseStore>()(
  persist(
    (set) => ({
      // Initial state
      viewMode: 'grid',
      filters: DEFAULT_FILTERS,
      userLocation: null,

      // Actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () =>
        set({
          filters: DEFAULT_FILTERS,
        }),

      setViewMode: (mode) =>
        set({
          viewMode: mode,
        }),

      setUserLocation: (location) =>
        set({
          userLocation: location,
        }),
    }),
    {
      name: 'finventory-browse-store',
      partialize: (state) => ({
        filters: state.filters,
        viewMode: state.viewMode,
      }),
    }
  )
);
