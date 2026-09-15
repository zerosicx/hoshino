import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getStudyStats } from "@/services/stats";
import { getActiveLists } from "@/services/srs";
import type { ActiveList, StudyStats } from "@/types/study";

/**
 * Everything on the Study landing. Reloads on focus, since a session that
 * just ended changed all of it.
 */
export function useStudyStats() {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [activeLists, setActiveLists] = useState<ActiveList[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const now = new Date();
    const [s, lists] = await Promise.all([getStudyStats(now), getActiveLists(now)]);
    setStats(s);
    setActiveLists(lists);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const totalDue = activeLists.reduce((sum, a) => sum + a.progress.due, 0);

  return { stats, activeLists, totalDue, loading, reload };
}
