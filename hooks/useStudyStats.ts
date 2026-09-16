import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getNewToday, getStudyStats } from "@/services/stats";
import { getActiveLists } from "@/services/srs";
import { previewSession } from "@/services/studyQuery";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ActiveList, SessionPreview, StudyStats } from "@/types/study";

/**
 * Everything on the Study landing. Reloads on focus, since a session that
 * just ended changed all of it. `preview` is what a mixed session across
 * every active list would hold right now, which is what the bar promises.
 */
export function useStudyStats() {
  const sessionSize = useSettingsStore((s) => s.sessionSize);
  const newPerDay = useSettingsStore((s) => s.newPerDay);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [activeLists, setActiveLists] = useState<ActiveList[]>([]);
  const [newToday, setNewToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const now = new Date();
    const [s, lists, introduced] = await Promise.all([
      getStudyStats(now),
      getActiveLists(now),
      getNewToday(now),
    ]);
    setStats(s);
    setActiveLists(lists);
    setNewToday(introduced);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const totalDue = activeLists.reduce((sum, a) => sum + a.progress.due, 0);
  const unseen = activeLists.reduce((sum, a) => sum + a.progress.newCount, 0);
  const preview: SessionPreview = previewSession(
    { due: totalDue, unseen, newToday },
    { sessionSize, newPerDay }
  );

  return { stats, activeLists, totalDue, preview, loading, reload };
}
