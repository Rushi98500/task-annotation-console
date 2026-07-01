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
    case "done": return "bg-green-100 text-green-800";
    case "in_progress": return "bg-blue-100 text-blue-800";
    case "qa": return "bg-yellow-100 text-yellow-800";
    case "blocked": return "bg-red-100 text-red-800";
    case "todo": return "bg-gray-100 text-gray-800";
    default: return "bg-orange-100 text-orange-800";
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
      <div className="p-6 text-center text-gray-400 h-full flex items-center justify-center">
        Select a task to view details
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading task {taskId}...
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">{task.title}</h2>
        <p className="text-sm text-gray-500">ID: {task.id}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="font-medium text-gray-600">Type:</span>{" "}
          {task.type}
          {task.type === "unknown" && (
            <span className="text-orange-500 ml-1">(unrecognized)</span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-600">Status:</span>{" "}
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor(task.status)}`}>
            {task.status === "unknown" ? task.rawStatus : task.status}
          </span>
          {task.status === "unknown" && (
            <span className="text-orange-500 ml-1">(unrecognized)</span>
          )}
        </div>
        <div>
          <span className="font-medium text-gray-600">Assignee:</span>{" "}
          {task.assignee?.name ?? <span className="text-gray-400 italic">Unassigned</span>}
        </div>
        <div>
          <span className="font-medium text-gray-600">Annotations:</span>{" "}
          {task.annotationCount}
        </div>
        <div>
          <span className="font-medium text-gray-600">Updated:</span>{" "}
          {formatTimestamp(task.updatedAt)}
        </div>
        {Object.keys(task.meta).length > 0 && (
          <div className="col-span-2">
            <span className="font-medium text-gray-600">Meta:</span>{" "}
            <pre className="inline text-xs bg-gray-100 p-1 rounded">
              {JSON.stringify(task.meta, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-700 mb-2">AI Summary</h3>
        <TaskSummary taskId={task.id} />
      </div>
    </div>
  );
}
