"use client";

import { useAppSelector } from "@/hooks/useAppStore";
import { selectTaskById } from "@/store/tasksSlice";
import { TaskStatus } from "@/domain/types";
import { FileText, Image, AudioLines, HelpCircle } from "lucide-react";
import TaskSummary from "./TaskSummary";

interface TaskDetailProps {
  taskId: string | null;
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

function formatTimestamp(ts: number): string {
  if (ts === 0) return "N/A";
  return new Date(ts).toLocaleString();
}

function TypeIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 shrink-0 inline-block";
  switch (type) {
    case "text": return <FileText className={`${cls} text-slate-400`} />;
    case "image": return <Image className={`${cls} text-slate-400`} />;
    case "audio": return <AudioLines className={`${cls} text-slate-400`} />;
    default: return <HelpCircle className={`${cls} text-rose-400`} />;
  }
}

function DetailSkeleton() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="h-5 w-40 rounded bg-slate-700 animate-pulse mb-2" />
        <div className="h-3 w-14 rounded bg-slate-700 animate-pulse" />
      </div>

      {/* Info grid */}
      <div className="space-y-4 mb-6 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-2.5 w-8 rounded bg-slate-700 animate-pulse mb-1.5" />
            <div className="h-3.5 w-14 rounded bg-slate-700 animate-pulse" />
          </div>
          <div>
            <div className="h-2.5 w-12 rounded bg-slate-700 animate-pulse mb-1.5" />
            <div className="h-5 w-20 rounded-full bg-slate-700 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-2.5 w-16 rounded bg-slate-700 animate-pulse mb-1.5" />
            <div className="h-3.5 w-24 rounded bg-slate-700 animate-pulse" />
          </div>
          <div>
            <div className="h-2.5 w-20 rounded bg-slate-700 animate-pulse mb-1.5" />
            <div className="h-3.5 w-6 rounded bg-slate-700 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="h-2.5 w-14 rounded bg-slate-700 animate-pulse mb-1.5" />
          <div className="h-3 w-32 rounded bg-slate-700 animate-pulse" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#1f2937] pt-5">
        {/* AI Summary header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-slate-700 animate-pulse" />
        </div>

        {/* "Summary for tXX" heading */}
        <div className="h-4 w-44 rounded bg-slate-700 animate-pulse mb-3" />

        {/* Paragraph line */}
        <div className="h-3 w-full rounded bg-slate-700 animate-pulse mb-2" />

        {/* Bullet list */}
        <div className="space-y-2 mb-3 pl-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-slate-700 animate-pulse shrink-0" />
            <div className="h-3 w-36 rounded bg-slate-700 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-slate-700 animate-pulse shrink-0" />
            <div className="h-3 w-28 rounded bg-slate-700 animate-pulse" />
          </div>
        </div>

        {/* Code block — single-line with background */}
        <div className="h-7 w-full rounded bg-[#0a0e17] border border-[#1f2937] mb-3" />

        {/* Paragraph lines */}
        <div className="h-3 w-5/6 rounded bg-slate-700 animate-pulse mb-2" />
        <div className="h-3 w-2/3 rounded bg-slate-700 animate-pulse" />
      </div>
    </div>
  );
}

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const task = useAppSelector((state) =>
    taskId ? selectTaskById(state, taskId) : undefined
  );

  if (!taskId) {
    return (
      <div className="p-8 text-center text-slate-600 h-full flex items-center justify-center text-sm">
        Select a task to view details
      </div>
    );
  }

  if (!task) {
    return <DetailSkeleton />;
  }

  return (
    <div className="p-6 overflow-auto h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-100 mb-1">{task.title}</h2>
        <p className="text-xs text-slate-500 font-mono">{task.id}</p>
      </div>

      {/* Info grid */}
      <div className="space-y-4 mb-6 text-sm">
        {/* Row 1: Type + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Type</p>
            <p className="text-slate-200 inline-flex items-center gap-2">
              <TypeIcon type={task.type} />
              {task.type}
              {task.type === "unknown" && (
                <span className="text-rose-400 text-xs">(unrecognized)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Status</p>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(task.status)}`}>
              {task.status === "unknown" ? task.rawStatus : task.status.replace("_", " ")}
            </span>
            {task.status === "unknown" && (
              <span className="text-orange-400 ml-1 text-xs">(unrecognized)</span>
            )}
          </div>
        </div>

        {/* Row 2: Assignee + Annotations */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Assignee</p>
            <p className="text-slate-200">
              {task.assignee?.name ?? <span className="text-slate-500 italic">Unassigned</span>}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Annotations</p>
            <p className="text-slate-200 tabular-nums">{task.annotationCount}</p>
          </div>
        </div>

        {/* Row 3: Updated */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Updated</p>
          <p className="text-slate-300 text-xs tabular-nums">{formatTimestamp(task.updatedAt)}</p>
        </div>

        {/* Meta block */}
        {Object.keys(task.meta).length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Meta</p>
            <pre className="text-xs bg-[#0a0e17] text-slate-300 p-3 rounded-lg border border-[#1f2937] font-mono overflow-x-auto leading-relaxed">
              {JSON.stringify(task.meta, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* AI Summary section */}
      <div className="border-t border-[#1f2937] pt-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            AI Summary
          </h3>
        </div>
        <TaskSummary taskId={task.id} />
      </div>
    </div>
  );
}
