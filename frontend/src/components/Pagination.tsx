"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/useAppStore";
import { fetchTasks, selectTasksPage, selectTasksPageSize, selectTasksTotal, selectTasksLoading } from "@/store/tasksSlice";

export default function Pagination() {
  const dispatch = useAppDispatch();
  const page = useAppSelector(selectTasksPage);
  const pageSize = useAppSelector(selectTasksPageSize);
  const total = useAppSelector(selectTasksTotal);
  const loading = useAppSelector(selectTasksLoading);

  const totalPages = Math.ceil(total / pageSize);

  function loadPage(p: number) {
    dispatch(fetchTasks({ page: p, pageSize }));
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[#1f2937] bg-[#131824]">
      <button
        onClick={() => loadPage(page - 1)}
        disabled={page <= 1 || loading === "pending"}
        className="px-4 py-1.5 text-sm font-medium border border-[#1f2937] text-slate-300 rounded-lg transition-colors hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300 disabled:hover:border-[#1f2937]"
      >
        Prev
      </button>
      <span className="text-sm text-slate-500 tabular-nums">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => loadPage(page + 1)}
        disabled={page >= totalPages || loading === "pending"}
        className="px-4 py-1.5 text-sm font-medium border border-[#1f2937] text-slate-300 rounded-lg transition-colors hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300 disabled:hover:border-[#1f2937]"
      >
        Next
      </button>
    </div>
  );
}
