import { createSlice, createEntityAdapter, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Task, TaskStatus, Assignee } from "@/domain/types";
import { normalizeTasks } from "@/domain/normalize";
import { API_BASE_URL } from "@/lib/config";
import { RootState } from "./store";

/**
 * Why thunks over RTK Query:
 * - RTK Query would auto-generate hooks but the spec requires manual control over
 *   normalization, caching flags, and WS event integration. Thunks give us full
 *   control over the normalize-then-upsert pipeline and the pendingEvents buffer.
 * - createEntityAdapter integrates naturally with thunks for upsertMany.
 */

const tasksAdapter = createEntityAdapter<Task>({
  sortComparer: (a, b) => b.updatedAt - a.updatedAt,
});

export interface TasksState {
  entities: ReturnType<typeof tasksAdapter.getInitialState>["entities"];
  ids: ReturnType<typeof tasksAdapter.getInitialState>["ids"];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  /** Tasks fetched from server that are stale (from cache) */
  isStale: boolean;
  /**
   * Buffer for WS events referencing task ids not yet in the store.
   * Keyed by task id, value is array of event payloads to replay once the task loads.
   */
  pendingEvents: Record<string, WsEventPayload[]>;
}

type WsEventPayload =
  | { kind: "task.updated"; payload: { id: string; status: string; updatedAt: number } }
  | { kind: "task.assigned"; payload: { id: string; assignee: Assignee | null } }
  | { kind: "annotation.created"; payload: { taskId: string; by: string; at: number } };

const initialState: TasksState = tasksAdapter.getInitialState({
  loading: "idle" as const,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  isStale: false,
  pendingEvents: {} as Record<string, WsEventPayload[]>,
});

/**
 * Map raw API status string to our normalized TaskStatus.
 * Same logic as normalize.ts but inlined for the WS event path.
 */
function mapRawStatus(raw: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    todo: "todo",
    in_progress: "in_progress",
    inprogress: "in_progress",
    qa: "qa",
    blocked: "blocked",
    done: "done",
  };
  return map[raw.toLowerCase()] ?? "unknown";
}

export const fetchTasks = createAsyncThunk(
  "tasks/fetchTasks",
  async ({ page, pageSize }: { page: number; pageSize: number }) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`${API_BASE_URL}/api/tasks?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      items: normalizeTasks(data.items),
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
    };
  }
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    /** Apply a WS task.updated event: upsert or buffer */
    applyTaskUpdated(state, action: PayloadAction<{ id: string; status: string; updatedAt: number }>) {
      const { id, status, updatedAt } = action.payload;
      const existing = state.entities[id];
      if (existing) {
        existing.status = mapRawStatus(status);
        existing.rawStatus = status;
        existing.updatedAt = updatedAt;
      } else {
        // Buffer the event for later replay
        if (!state.pendingEvents[id]) state.pendingEvents[id] = [];
        state.pendingEvents[id].push({ kind: "task.updated", payload: action.payload });
      }
    },
    /** Apply a WS task.assigned event: upsert or buffer */
    applyTaskAssigned(state, action: PayloadAction<{ id: string; assignee: Assignee | null }>) {
      const { id, assignee } = action.payload;
      const existing = state.entities[id];
      if (existing) {
        existing.assignee = assignee;
      } else {
        if (!state.pendingEvents[id]) state.pendingEvents[id] = [];
        state.pendingEvents[id].push({ kind: "task.assigned", payload: action.payload });
      }
    },
    /** Apply a WS annotation.created event: upsert or buffer */
    applyAnnotationCreated(state, action: PayloadAction<{ taskId: string; by: string; at: number }>) {
      const { taskId } = action.payload;
      const existing = state.entities[taskId];
      if (existing) {
        existing.annotationCount += 1;
      } else {
        if (!state.pendingEvents[taskId]) state.pendingEvents[taskId] = [];
        state.pendingEvents[taskId].push({ kind: "annotation.created", payload: action.payload });
      }
    },
    /** Mark data as not stale after fresh server fetch */
    setStale(state, action: PayloadAction<boolean>) {
      state.isStale = action.payload;
    },
    /** Hydrate from IndexedDB cache (sets stale flag) */
    hydrateFromCache(state, action: PayloadAction<{ items: Task[]; page: number; pageSize: number; total: number }>) {
      tasksAdapter.setAll(state, action.payload.items);
      state.page = action.payload.page;
      state.pageSize = action.payload.pageSize;
      state.total = action.payload.total;
      state.isStale = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = "succeeded";
        tasksAdapter.setAll(state, action.payload.items);
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
        state.isStale = false;

        // Replay buffered WS events for tasks now in the store
        for (const [id, events] of Object.entries(state.pendingEvents)) {
          const task = state.entities[id];
          if (!task) continue;
          for (const evt of events) {
            switch (evt.kind) {
              case "task.updated":
                task.status = mapRawStatus(evt.payload.status);
                task.rawStatus = evt.payload.status;
                task.updatedAt = evt.payload.updatedAt;
                break;
              case "task.assigned":
                task.assignee = evt.payload.assignee;
                break;
              case "annotation.created":
                task.annotationCount += 1;
                break;
            }
          }
          delete state.pendingEvents[id];
        }
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const {
  applyTaskUpdated,
  applyTaskAssigned,
  applyAnnotationCreated,
  setStale,
  hydrateFromCache,
} = tasksSlice.actions;

// Selectors
const tasksSelectors = tasksAdapter.getSelectors<RootState>((state) => state.tasks);

export const selectAllTasks = tasksSelectors.selectAll;
export const selectTaskById = tasksSelectors.selectById;
export const selectTaskIds = tasksSelectors.selectIds;
export const selectTasksLoading = (state: RootState) => state.tasks.loading;
export const selectTasksError = (state: RootState) => state.tasks.error;
export const selectTasksPage = (state: RootState) => state.tasks.page;
export const selectTasksPageSize = (state: RootState) => state.tasks.pageSize;
export const selectTasksTotal = (state: RootState) => state.tasks.total;
export const selectTasksIsStale = (state: RootState) => state.tasks.isStale;

export default tasksSlice.reducer;
