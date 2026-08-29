import { create } from "zustand";
import type { SearchResult } from "@/types/dictionary";
import * as dictionary from "@/services/dictionary";

interface SearchState {
  query: string;
  results: SearchResult[];
  recentSearches: SearchResult[];
  isLoading: boolean;
  hasSearched: boolean;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  loadRecentSearches: () => Promise<void>;
  recordSearch: (entryId: number) => Promise<void>;
}

export const useSearchStore = create<SearchState>()((set, get) => ({
  query: "",
  results: [],
  recentSearches: [],
  isLoading: false,
  hasSearched: false,

  setQuery: (query) => set({ query }),

  search: async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ results: [], isLoading: false, hasSearched: false });
      return;
    }

    set({ isLoading: true });
    try {
      const results = await dictionary.searchEntries(trimmed);
      set({ results, isLoading: false, hasSearched: true });
    } catch (err) {
      console.error("?? Search failed:", err);
      set({ results: [], isLoading: false, hasSearched: true });
    }
  },

  clearSearch: () =>
    set({ query: "", results: [], isLoading: false, hasSearched: false }),

  loadRecentSearches: async () => {
    try {
      const recentSearches = await dictionary.getRecentSearches();
      set({ recentSearches });
    } catch {
      // silently fail — recent searches are non-critical
    }
  },

  recordSearch: async (entryId) => {
    try {
      await dictionary.recordSearch(entryId);
      // Refresh recent searches after recording
      const recentSearches = await dictionary.getRecentSearches();
      set({ recentSearches });
    } catch {
      // silently fail
    }
  },
}));
