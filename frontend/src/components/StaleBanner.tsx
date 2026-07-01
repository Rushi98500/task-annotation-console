"use client";

import { useAppSelector } from "@/hooks/useAppStore";
import { selectTasksIsStale } from "@/store/tasksSlice";

export default function StaleBanner() {
  const isStale = useAppSelector(selectTasksIsStale);

  if (!isStale) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-300 flex items-center gap-2">
      <span className="animate-pulse text-amber-400">&#9888;</span>
      <span>
        Showing cached data &mdash; refreshing from server...
      </span>
    </div>
  );
}
