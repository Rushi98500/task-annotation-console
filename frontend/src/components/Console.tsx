"use client";

import { useState, useEffect } from "react";
import { useAppDispatch } from "@/hooks/useAppStore";
import { useTaskFeed } from "@/hooks/useTaskFeed";
import { loadFromCacheAndRevalidate } from "@/lib/cache";
import { Task } from "@/domain/types";
import TaskTable from "./TaskTable";
import TaskDetail from "./TaskDetail";
import Pagination from "./Pagination";
import StaleBanner from "./StaleBanner";

export default function Console() {
  const dispatch = useAppDispatch();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Connect WebSocket feed
  useTaskFeed();

  // Initial load: hydrate from cache, then revalidate from server
  useEffect(() => {
    loadFromCacheAndRevalidate(dispatch);
  }, [dispatch]);

  // Update selected task in real-time as WS events land
  // (re-select from store to get latest data)
  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e17]">
      <StaleBanner />
      <header className="px-6 py-3 border-b border-[#1f2937] bg-[#131824]">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          Annotation Activity Console
        </h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: table + pagination */}
        <div className="w-2/3 flex flex-col border-r border-[#1f2937] bg-[#0f1520]">
          <div className="flex-1 overflow-auto">
            <TaskTable
              onSelectTask={handleSelectTask}
              selectedTaskId={selectedTask?.id ?? null}
            />
          </div>
          <Pagination />
        </div>
        {/* Right panel: detail */}
        <div className="w-1/3 overflow-auto bg-[#131824]">
          <TaskDetail taskId={selectedTask?.id ?? null} />
        </div>
      </div>
    </div>
  );
}
