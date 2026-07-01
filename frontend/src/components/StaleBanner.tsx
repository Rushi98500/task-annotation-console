"use client";

import { useAppSelector } from "@/hooks/useAppStore";
import { selectTasksIsStale } from "@/store/tasksSlice";

export default function StaleBanner() {
  const isStale = useAppSelector(selectTasksIsStale);

  if (!isStale) return null;

  return (
    <div className="bg-yellow-900/50 border-b border-yellow-700 px-4 py-1.5 text-sm text-yellow-300 flex items-center gap-2">
      <span className="animate-pulse">⚠</span>
      <span>
        Showing cached data — refreshing from server...
      </span>
    </div>
  );
}
