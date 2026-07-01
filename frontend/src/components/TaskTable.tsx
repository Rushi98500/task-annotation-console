"use client";

import { useState, useMemo } from "react";
import { useAppSelector } from "@/hooks/useAppStore";
import { selectAllTasks, selectTasksLoading, selectTasksError, selectTasksPage, selectTasksPageSize, selectTasksTotal } from "@/store/tasksSlice";
import { Task, TaskType, TaskStatus } from "@/domain/types";

type SortField = "updatedAt" | "title" | "annotationCount";
type SortDir = "asc" | "desc";

interface TaskTableProps {
  onSelectTask: (task: Task) => void;
  selectedTaskId: string | null;
}

function formatTimestamp(ts: number): string {
  if (ts === 0) return "N/A";
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function statusColor(status: TaskStatus): string {
  switch (status) {
    case "done": return "bg-green-100 text-green-800";
    case "in_progress": return "bg-blue-100 text-blue-800";
    case "qa": return "bg-yellow-100 text-yellow-800";
    case "blocked": return "bg-red-100 text-red-800";
    case "todo": return "bg-gray-100 text-gray-800";
    default: return "bg-orange-100 text-orange-800";
  }
}

function typeIcon(type: TaskType): string {
  switch (type) {
    case "image": return "🖼️";
    case "audio": return "🔊";
    case "text": return "📝";
    default: return "❓";
  }
}

export default function TaskTable({ onSelectTask, selectedTaskId }: TaskTableProps) {
  const tasks = useAppSelector(selectAllTasks);
  const loading = useAppSelector(selectTasksLoading);
  const error = useAppSelector(selectTasksError);
  const page = useAppSelector(selectTasksPage);
  const pageSize = useAppSelector(selectTasksPageSize);
  const total = useAppSelector(selectTasksTotal);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.assignee?.name.toLowerCase().includes(q) ?? false)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "updatedAt":
          cmp = a.updatedAt - b.updatedAt;
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "annotationCount":
          cmp = a.annotationCount - b.annotationCount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [tasks, search, typeFilter, statusFilter, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  if (loading === "idle") {
    return <div className="p-4 text-gray-500">Ready to load tasks...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b bg-gray-50 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
          aria-label="Search tasks"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TaskType | "all")}
          className="border rounded px-2 py-1.5 text-sm"
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="text">Text</option>
          <option value="unknown">Unknown</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "all")}
          className="border rounded px-2 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="qa">QA</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading === "pending" && tasks.length === 0 && (
          <div className="p-4 text-center text-gray-500">Loading tasks...</div>
        )}
        {loading === "pending" && tasks.length > 0 && (
          <div className="p-1 text-center text-xs text-gray-400 bg-gray-50">Refreshing...</div>
        )}
        <table className="w-full text-sm" role="table">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="text-left p-2 font-medium">Type</th>
              <th
                className="text-left p-2 font-medium cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("title")}
                role="columnheader"
              >
                Title{sortIndicator("title")}
              </th>
              <th className="text-left p-2 font-medium">Status</th>
              <th className="text-left p-2 font-medium">Assignee</th>
              <th
                className="text-right p-2 font-medium cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("annotationCount")}
                role="columnheader"
              >
                Annotations{sortIndicator("annotationCount")}
              </th>
              <th
                className="text-right p-2 font-medium cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("updatedAt")}
                role="columnheader"
              >
                Updated{sortIndicator("updatedAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No tasks match your filters.
                </td>
              </tr>
            )}
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`border-b cursor-pointer hover:bg-blue-50 ${
                  selectedTaskId === task.id ? "bg-blue-100" : ""
                }`}
                role="row"
              >
                <td className="p-2" title={task.type === "unknown" ? `Unrecognized: ${task.rawStatus}` : undefined}>
                  {typeIcon(task.type)} {task.type}
                </td>
                <td className="p-2">{task.title}</td>
                <td className="p-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor(task.status)}`}
                    title={task.status === "unknown" ? `Raw: "${task.rawStatus}"` : undefined}>
                    {task.status === "unknown" ? `⚠ ${task.rawStatus}` : task.status}
                  </span>
                </td>
                <td className="p-2">{task.assignee?.name ?? <span className="text-gray-400 italic">Unassigned</span>}</td>
                <td className="p-2 text-right">{task.annotationCount}</td>
                <td className="p-2 text-right text-gray-500">{formatTimestamp(task.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
        <span>
          Page {page} · Showing {filteredTasks.length} of {tasks.length} loaded · Total on server: {total}
        </span>
        {loading === "pending" && <span className="animate-pulse">Loading...</span>}
      </div>
    </div>
  );
}
