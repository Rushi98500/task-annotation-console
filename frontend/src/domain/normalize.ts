/**
 * Pure normalization functions for the messy API data.
 *
 * Coercion rules:
 * - type: Map known values ("image", "audio", "text") to themselves.
 *   Any other string (including "video") maps to "unknown".
 * - status: Map to lowercase canonical form via STATUS_MAP.
 *   Unrecognized strings map to "unknown". Original raw string is preserved.
 * - updatedAt: If it's a number (epoch-ms), use directly.
 *   If it's a string, try Date.parse(). If valid, convert to epoch-ms.
 *   If neither, fall back to 0 (epoch).
 * - annotationCount: If it's a number, use directly.
 *   If it's a string, parseInt with fallback to 0.
 *   Non-numeric strings become 0.
 * - assignee: null stays null. Objects with id+name are kept.
 *   Anything else becomes null.
 * - meta: If it's a plain object, keep it. Otherwise empty object.
 *
 * The only case where we drop a task is when it has no usable `id` field
 * (missing, empty, or not a string). A console.warn is emitted in that case.
 */

import { Task, TaskType, TaskStatus, Assignee } from "./types";

const KNOWN_TYPES: ReadonlySet<string> = new Set(["image", "audio", "text"]);

const STATUS_MAP: Record<string, TaskStatus> = {
  todo: "todo",
  in_progress: "in_progress",
  inprogress: "in_progress", // "InProgress" lowercased
  qa: "qa",
  blocked: "blocked",
  done: "done",
};

function coerceType(raw: unknown): TaskType {
  if (typeof raw === "string" && KNOWN_TYPES.has(raw)) {
    return raw as TaskType;
  }
  return "unknown";
}

function coerceStatus(raw: unknown): { status: TaskStatus; rawStatus: string } {
  const rawStr = typeof raw === "string" ? raw : String(raw ?? "");
  const canonical = STATUS_MAP[rawStr.toLowerCase()];
  return {
    status: canonical ?? "unknown",
    rawStatus: rawStr,
  };
}

/**
 * Coerce updatedAt to epoch-ms number.
 * Rules:
 * - number → use as-is (assumed epoch-ms)
 * - string → Date.parse(), if NaN fall back to 0
 * - anything else → 0
 */
function coerceTimestamp(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

/**
 * Coerce annotationCount to number.
 * Rules:
 * - number → use as-is
 * - string → parseInt(radix 10), NaN → 0
 * - anything else → 0
 */
function coerceCount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.floor(raw);
  }
  if (typeof raw === "string") {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function coerceAssignee(raw: unknown): Assignee | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (
    typeof raw === "object" &&
    "id" in raw &&
    "name" in raw &&
    typeof (raw as Record<string, unknown>).id === "string" &&
    typeof (raw as Record<string, unknown>).name === "string"
  ) {
    return raw as Assignee;
  }
  return null;
}

function coerceMeta(raw: unknown): Record<string, unknown> {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw)
  ) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/**
 * Normalize a single raw task object into a typed Task.
 * Returns null if the entry has no usable id (only drop case).
 */
export function normalizeTask(raw: unknown): Task | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Only drop entries with no usable id
  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    console.warn("[normalize] Dropping task with no usable id:", raw);
    return null;
  }

  const { status, rawStatus } = coerceStatus(obj.status);

  return {
    id: obj.id,
    title: typeof obj.title === "string" ? obj.title : `Task ${obj.id}`,
    type: coerceType(obj.type),
    rawStatus,
    status,
    assignee: coerceAssignee(obj.assignee),
    annotationCount: coerceCount(obj.annotationCount),
    updatedAt: coerceTimestamp(obj.updatedAt),
    meta: coerceMeta(obj.meta),
  };
}

/**
 * Normalize an array of raw task objects.
 * Drops entries with no usable id (with a warning).
 */
export function normalizeTasks(rawItems: unknown[]): Task[] {
  const tasks: Task[] = [];
  for (const item of rawItems) {
    const task = normalizeTask(item);
    if (task !== null) {
      tasks.push(task);
    }
  }
  return tasks;
}
