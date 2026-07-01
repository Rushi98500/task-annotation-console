import { normalizeTask, normalizeTasks } from "@/domain/normalize";

describe("normalizeTask", () => {
  it("normalizes a valid task with all fields", () => {
    const raw = {
      id: "t1",
      title: "Task 1",
      type: "image",
      status: "in_progress",
      assignee: { id: "u1", name: "Asha" },
      annotationCount: 5,
      updatedAt: 1719600000000,
      meta: { priority: "high" },
    };
    const task = normalizeTask(raw);
    expect(task).not.toBeNull();
    expect(task!.id).toBe("t1");
    expect(task!.type).toBe("image");
    expect(task!.status).toBe("in_progress");
    expect(task!.rawStatus).toBe("in_progress");
    expect(task!.assignee).toEqual({ id: "u1", name: "Asha" });
    expect(task!.annotationCount).toBe(5);
    expect(task!.updatedAt).toBe(1719600000000);
    expect(task!.meta).toEqual({ priority: "high" });
  });

  it("maps unknown type 'video' to 'unknown'", () => {
    const raw = { id: "t2", title: "Task 2", type: "video", status: "done" };
    const task = normalizeTask(raw);
    expect(task!.type).toBe("unknown");
  });

  it("normalizes 'InProgress' (mixed case) to in_progress", () => {
    const raw = { id: "t3", title: "Task 3", type: "text", status: "InProgress" };
    const task = normalizeTask(raw);
    expect(task!.status).toBe("in_progress");
    expect(task!.rawStatus).toBe("InProgress");
  });

  it("normalizes 'QA' to qa", () => {
    const raw = { id: "t4", title: "Task 4", type: "audio", status: "QA" };
    const task = normalizeTask(raw);
    expect(task!.status).toBe("qa");
    expect(task!.rawStatus).toBe("QA");
  });

  it("normalizes 'BLOCKED' to blocked", () => {
    const raw = { id: "t5", title: "Task 5", type: "text", status: "BLOCKED" };
    const task = normalizeTask(raw);
    expect(task!.status).toBe("blocked");
    expect(task!.rawStatus).toBe("BLOCKED");
  });

  it("normalizes 'todo' to todo", () => {
    const raw = { id: "t6", title: "Task 6", type: "image", status: "todo" };
    const task = normalizeTask(raw);
    expect(task!.status).toBe("todo");
  });

  it("maps unrecognized status to 'unknown' and preserves raw", () => {
    const raw = { id: "t7", title: "Task 7", type: "text", status: "weird_status" };
    const task = normalizeTask(raw);
    expect(task!.status).toBe("unknown");
    expect(task!.rawStatus).toBe("weird_status");
  });

  it("coerces ISO string updatedAt to epoch-ms", () => {
    const raw = { id: "t8", title: "Task 8", type: "image", updatedAt: "2024-06-28T18:41:14.000Z" };
    const task = normalizeTask(raw);
    expect(task!.updatedAt).toBe(1719600074000);
  });

  it("uses epoch-ms number updatedAt as-is", () => {
    const raw = { id: "t9", title: "Task 9", type: "audio", updatedAt: 1719600037000 };
    const task = normalizeTask(raw);
    expect(task!.updatedAt).toBe(1719600037000);
  });

  it("coerces string annotationCount to number", () => {
    const raw = { id: "t10", title: "Task 10", type: "text", annotationCount: "42" };
    const task = normalizeTask(raw);
    expect(task!.annotationCount).toBe(42);
  });

  it("coerces non-numeric string annotationCount to 0", () => {
    const raw = { id: "t11", title: "Task 11", type: "image", annotationCount: "abc" };
    const task = normalizeTask(raw);
    expect(task!.annotationCount).toBe(0);
  });

  it("handles null assignee", () => {
    const raw = { id: "t12", title: "Task 12", type: "text", assignee: null };
    const task = normalizeTask(raw);
    expect(task!.assignee).toBeNull();
  });

  it("handles missing assignee", () => {
    const raw = { id: "t13", title: "Task 13", type: "audio" };
    const task = normalizeTask(raw);
    expect(task!.assignee).toBeNull();
  });

  it("drops entries with no id", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const raw = { title: "No ID task", type: "text" };
    const task = normalizeTask(raw);
    expect(task).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("drops entries with empty string id", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const raw = { id: "", title: "Empty ID", type: "text" };
    const task = normalizeTask(raw);
    expect(task).toBeNull();
    consoleSpy.mockRestore();
  });

  it("handles null/undefined/non-object input gracefully", () => {
    expect(normalizeTask(null)).toBeNull();
    expect(normalizeTask(undefined)).toBeNull();
    expect(normalizeTask("string")).toBeNull();
    expect(normalizeTask(42)).toBeNull();
  });

  it("defaults title when missing", () => {
    const raw = { id: "t99", type: "text", status: "done" };
    const task = normalizeTask(raw);
    expect(task!.title).toBe("Task t99");
  });

  it("defaults meta to empty object when not a plain object", () => {
    const raw = { id: "t100", type: "text", status: "done", meta: [1, 2, 3] };
    const task = normalizeTask(raw);
    expect(task!.meta).toEqual({});
  });
});

describe("normalizeTasks", () => {
  it("normalizes an array and drops entries with no id", () => {
    const raw = [
      { id: "t1", title: "A", type: "image", status: "done" },
      { id: "t2", title: "B", type: "video", status: "QA" },
      { title: "No ID" },
      { id: "t3", title: "C", type: "text", status: "BLOCKED" },
    ];
    const tasks = normalizeTasks(raw);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].type).toBe("image");
    expect(tasks[1].type).toBe("unknown"); // video → unknown
    expect(tasks[2].status).toBe("blocked");
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTasks([])).toEqual([]);
  });
});
