"use client";

import { useAppSelector } from "@/hooks/useAppStore";
import { selectTaskById } from "@/store/tasksSlice";
import { Task, TaskStatus } from "@/domain/types";
import TaskSummary from "./TaskSummary";

interface TaskDetailProps {
  taskId: string | null;
}

function statusColor(status: TaskStatus): string {
  switch (status) {
    case "done": return "bg-green-900/50 text-green-300";
    case "in_progress": return "bg-blue-900/50 text-blue-300";
    case "qa": return "bg-yellow-900/50 text-yellow-300";
    case "blocked": return "bg-red-900/50 text-red-300";
    case "todo": return "bg-gray-800 text-gray-300";
    default: return "bg-orange-900/50 text-orange-300";
  }
}

function formatTimestamp(ts: number): string {
  if (ts === 0) return "N/A";
  return new Date(ts).toLocaleString();
}

export default function TaskDetail({ taskId }: TaskDetailProps) {
  const task = useAppSelector((state) =>
    taskId ? selectTaskById(state, taskId) : undefined
  );

  if (!taskId) {
    return (
      <div className="p-6 text-center text-gray-500 h-full flex items-center justify-center">
        Select a task to view details
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading task {taskId}...
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">{task.title}</h2>
        <p className="text-sm text-gray-400">ID: {task.id}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="font-medium text-gray-400">Type:</span>{" "}
          {task.type}
          {task.type === "unknown" && (
            <span className="text-orange-500 ml-1">(unrecognized)</span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-400">Status:</span>{" "}
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor(task.status)}`}>
            {task.status === "unknown" ? task.rawStatus : task.status}
          </span>
          {task.status === "unknown" && (
            <span className="text-orange-500 ml-1">(unrecognized)</span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-400">Assignee:</span>{" "}
          {task.assignee?.name ?? <span className="text-gray-400 italic">Unassigned</span>}
        </div>
        <div>
          <span className="font-medium text-gray-400">Annotations:</span>{" "}
          {task.annotationCount}
        </div>
        <div>
          <span className="font-medium text-gray-400">Updated:</span>{" "}
          {formatTimestamp(task.updatedAt)}
        </div>
        {Object.keys(task.meta).length > 0 && (
          <div className="col-span-2">
            <span className="font-medium text-gray-400">Meta:</span>{" "}
            <pre className="inline text-xs bg-gray-800 text-gray-300 p-1 rounded">
              {JSON.stringify(task.meta, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-4">
        <h3 className="font-medium text-gray-300 mb-2">AI Summary</h3>
        <TaskSummary taskId={task.id} />
      </div>
    </div>
  );
}
