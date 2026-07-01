/**
 * Normalized task types after cleaning up the messy API data.
 *
 * Discriminated union on `type` field (image | audio | text | unknown).
 * TaskStatus enum is normalized to lowercase canonical forms.
 * Original raw values are preserved for debugging.
 */

export type TaskType = "image" | "audio" | "text" | "unknown";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "qa"
  | "blocked"
  | "done"
  | "unknown";

export interface Assignee {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  /** Original raw status string from API, kept for debugging */
  rawStatus: string;
  status: TaskStatus;
  assignee: Assignee | null;
  annotationCount: number;
  updatedAt: number; // always epoch-ms after normalization
  meta: Record<string, unknown>;
}
