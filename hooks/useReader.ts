import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readParagraph, refreshVisited } from "@/services/reader";
import type { ReaderToken } from "@/types/reader";

/** Segmentations already done this session, so scrolling back is free. */
const cache = new Map<string, ReaderToken[]>();

/**
 * The tokens for one paragraph, resolved once it is on screen. Null until
 * then, and stays null if the lookup fails, so the paragraph shows as plain
 * text rather than taking the screen down with it. When the screen regains
 * focus the visited marks are refreshed, since a word page was probably just
 * opened from here.
 */
export function useParagraph(text: string): ReaderToken[] | null {
  const [tokens, setTokens] = useState<ReaderToken[] | null>(cache.get(text) ?? null);
  const mounted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const hit = cache.get(text);
    if (hit) {
      setTokens(hit);
      return;
    }
    readParagraph(text)
      .then((result) => {
        cache.set(text, result);
        if (!cancelled) setTokens(result);
      })
      .catch(() => {
        if (!cancelled) setTokens(null);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  useFocusEffect(
    useCallback(() => {
      // The first focus is the mount; nothing has been visited since then.
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      const current = cache.get(text);
      if (!current) return;
      refreshVisited(current).then((fresh) => {
        if (fresh !== current) {
          cache.set(text, fresh);
          setTokens(fresh);
        }
      });
    }, [text])
  );

  return tokens;
}
