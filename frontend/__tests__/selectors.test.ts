import { configureStore } from "@reduxjs/toolkit";
import tasksReducer, {
  applyTaskUpdated,
  applyTaskAssigned,
  applyAnnotationCreated,
  selectAllTasks,
  selectTaskById,
} from "@/store/tasksSlice";
import { Task } from "@/domain/types";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "t1",
    title: overrides.title ?? "Task 1",
    type: overrides.type ?? "image",
    status: overrides.status ?? "done",
    rawStatus: overrides.rawStatus ?? "done",
    assignee: overrides.assignee ?? null,
    annotationCount: overrides.annotationCount ?? 5,
    updatedAt: overrides.updatedAt ?? 1719600000000,
    meta: overrides.meta ?? {},
  };
}

function populateStore(store: ReturnType<typeof makeTestStore>, tasks: Task[]) {
  store.dispatch({
    type: "tasks/fetchTasks/fulfilled",
    payload: { items: tasks, page: 1, pageSize: 20, total: tasks.length },
  });
}

function makeTestStore() {
  return configureStore({
    reducer: { tasks: tasksReducer },
  });
}

describe("tasks selectors", () => {
  it("selectAllTasks returns all tasks sorted by updatedAt desc", () => {
    const store = makeTestStore();
    const tasks = [
      makeTask({ id: "t1", updatedAt: 1000 }),
      makeTask({ id: "t2", updatedAt: 3000 }),
      makeTask({ id: "t3", updatedAt: 2000 }),
    ];
    populateStore(store, tasks);
    const result = selectAllTasks(store.getState());
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("t2");
    expect(result[1].id).toBe("t3");
    expect(result[2].id).toBe("t1");
  });

  it("selectTaskById returns the correct task", () => {
    const store = makeTestStore();
    populateStore(store, [
      makeTask({ id: "t1", title: "Alpha" }),
      makeTask({ id: "t2", title: "Beta" }),
    ]);
    const task = selectTaskById(store.getState(), "t2");
    expect(task).toBeDefined();
    expect(task!.title).toBe("Beta");
  });

  it("applyTaskUpdated patches status in the store", () => {
    const store = makeTestStore();
    populateStore(store, [
      makeTask({ id: "t1", status: "todo", rawStatus: "todo" }),
    ]);
    store.dispatch(
      applyTaskUpdated({ id: "t1", status: "done", updatedAt: 9999 })
    );
    const task = selectTaskById(store.getState(), "t1");
    expect(task!.status).toBe("done");
    expect(task!.updatedAt).toBe(9999);
  });

  it("applyAnnotationCreated increments annotationCount", () => {
    const store = makeTestStore();
    populateStore(store, [
      makeTask({ id: "t1", annotationCount: 3 }),
    ]);
    store.dispatch(
      applyAnnotationCreated({ taskId: "t1", by: "u1", at: Date.now() })
    );
    const task = selectTaskById(store.getState(), "t1");
    expect(task!.annotationCount).toBe(4);
  });

  it("applyTaskAssigned sets the assignee", () => {
    const store = makeTestStore();
    populateStore(store, [
      makeTask({ id: "t1", assignee: null }),
    ]);
    store.dispatch(
      applyTaskAssigned({ id: "t1", assignee: { id: "u2", name: "Ben" } })
    );
    const task = selectTaskById(store.getState(), "t1");
    expect(task!.assignee).toEqual({ id: "u2", name: "Ben" });
  });

  it("WS events for unknown tasks are buffered", () => {
    const store = makeTestStore();
    store.dispatch(
      applyTaskUpdated({ id: "t999", status: "done", updatedAt: 5000 })
    );
    expect(selectTaskById(store.getState(), "t999")).toBeUndefined();
    const state = store.getState().tasks;
    expect(state.pendingEvents["t999"]).toHaveLength(1);
  });
});
