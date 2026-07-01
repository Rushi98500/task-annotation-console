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
    <div className="flex items-center gap-2 p-2 border-t border-gray-700 bg-gray-900">
      <button
        onClick={() => loadPage(page - 1)}
        disabled={page <= 1 || loading === "pending"}
        className="px-3 py-1 text-sm border border-gray-600 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
      >
        Prev
      </button>
      <span className="text-sm text-gray-400">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => loadPage(page + 1)}
        disabled={page >= totalPages || loading === "pending"}
        className="px-3 py-1 text-sm border border-gray-600 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
      >
        Next
      </button>
    </div>
  );
}
