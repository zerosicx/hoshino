import { useEffect, useRef, useCallback } from "react";
import { useSearchStore } from "@/stores/searchStore";

const DEBOUNCE_MS = 300;

export function useDictionary() {
  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const recentSearches = useSearchStore((s) => s.recentSearches);
  const isLoading = useSearchStore((s) => s.isLoading);
  const hasSearched = useSearchStore((s) => s.hasSearched);
  const setQuery = useSearchStore((s) => s.setQuery);
  const search = useSearchStore((s) => s.search);
  const clearSearch = useSearchStore((s) => s.clearSearch);
  const loadRecentSearches = useSearchStore((s) => s.loadRecentSearches);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  // Debounced search when query changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      search(query);
      return;
    }

    timerRef.current = setTimeout(() => {
      search(query);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search]);

  const updateQuery = useCallback(
    (text: string) => {
      setQuery(text);
    },
    [setQuery]
  );

  return {
    query,
    results,
    recentSearches,
    isLoading,
    hasSearched,
    setQuery: updateQuery,
    clearSearch,
  };
}
