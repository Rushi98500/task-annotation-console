"use client";

import { useState, useMemo } from "react";
import { useAppSelector } from "@/hooks/useAppStore";
import { selectAllTasks, selectTasksLoading, selectTasksError, selectTasksPage, selectTasksPageSize, selectTasksTotal } from "@/store/tasksSlice";
import { Task, TaskType, TaskStatus } from "@/domain/types";
import { FileText, Image, AudioLines, HelpCircle } from "lucide-react";

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
    case "done": return "bg-emerald-500/15 text-emerald-400";
    case "in_progress": return "bg-indigo-500/15 text-indigo-400";
    case "qa": return "bg-amber-500/15 text-amber-400";
    case "blocked": return "bg-rose-500/15 text-rose-400";
    case "todo": return "bg-slate-500/15 text-slate-400";
    default: return "bg-orange-500/15 text-orange-400";
  }
}

function TypeIcon({ type }: { type: TaskType }) {
  const cls = "w-4 h-4 shrink-0";
  switch (type) {
    case "text": return <FileText className={`${cls} text-slate-400`} />;
    case "image": return <Image className={`${cls} text-slate-400`} />;
    case "audio": return <AudioLines className={`${cls} text-slate-400`} />;
    default: return <HelpCircle className={`${cls} text-rose-400`} />;
  }
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1f2937]/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-700/80 animate-pulse" />
          <div className="w-10 h-2.5 rounded bg-slate-700/80 animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-[120px] rounded bg-slate-700/80 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="w-[62px] h-5 rounded-full bg-slate-700/80 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-[68px] rounded bg-slate-700/80 animate-pulse" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-3.5 w-5 rounded bg-slate-700/80 animate-pulse ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-2.5 w-[48px] rounded bg-slate-700/80 animate-pulse ml-auto" />
      </td>
    </tr>
  );
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

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.assignee?.name.toLowerCase().includes(q) ?? false)
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

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
    sortField === field ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  if (error && tasks.length === 0) {
    return (
      <div className="p-4 m-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-sm">
        <strong className="font-semibold">Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 py-3 border-b border-[#1f2937] bg-[#131824] flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#1f2937] bg-[#0a0e17] text-slate-200 placeholder-slate-500 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-colors"
          aria-label="Search tasks"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TaskType | "all")}
          className="border border-[#1f2937] bg-[#0a0e17] text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-colors"
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
          className="border border-[#1f2937] bg-[#0a0e17] text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-colors"
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
        <table className="w-full text-sm" role="table">
          <thead className="bg-[#0f1520] sticky top-0 z-10">
            <tr className="border-b border-[#1f2937]">
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th
                className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => handleSort("title")}
                role="columnheader"
              >
                Title{sortIndicator("title")}
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Assignee</th>
              <th
                className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => handleSort("annotationCount")}
                role="columnheader"
              >
                Annotations{sortIndicator("annotationCount")}
              </th>
              <th
                className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => handleSort("updatedAt")}
                role="columnheader"
              >
                Updated{sortIndicator("updatedAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading === "pending"
              ? Array.from({ length: pageSize }, (_, i) => (
                  <SkeletonRow key={`skeleton-${i}`} />
                ))
              : filteredTasks.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No tasks match your filters.
                    </td>
                  </tr>
                )
                : filteredTasks.map((task, idx) => {
                    const isSelected = selectedTaskId === task.id;
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`cursor-pointer transition-colors border-b border-[#1f2937]/60 ${
                          isSelected
                            ? "bg-indigo-500/10 border-l-2 border-l-indigo-500"
                            : idx % 2 === 0
                              ? "bg-transparent hover:bg-[#131824]"
                              : "bg-[#0f1520]/50 hover:bg-[#131824]"
                        }`}
                        role="row"
                      >
                        <td className="px-4 py-3 text-slate-300" title={task.type === "unknown" ? `Unrecognized: ${task.rawStatus}` : undefined}>
                          <span className="inline-flex items-center gap-2">
                            <TypeIcon type={task.type} />
                            <span className="text-xs">{task.type}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium">{task.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(task.status)}`}
                            title={task.status === "unknown" ? `Raw: "${task.rawStatus}"` : undefined}
                          >
                            {task.status === "unknown" ? `\u26A0 ${task.rawStatus}` : task.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {task.assignee?.name ?? <span className="text-slate-500 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{task.annotationCount}</td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs tabular-nums">{formatTimestamp(task.updatedAt)}</td>
                      </tr>
                    );
                  })
            }
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      <div className="px-4 py-2 border-t border-[#1f2937] bg-[#131824] text-xs text-slate-500">
        Page {page} &middot; {filteredTasks.length} of {tasks.length} loaded &middot; {total} total
      </div>
    </div>
  );
}
