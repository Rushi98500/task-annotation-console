import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import tasksReducer from "@/store/tasksSlice";
import TaskTable from "@/components/TaskTable";
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

function renderWithStore(
  tasks: Task[],
  onSelectTask: (t: Task) => void = jest.fn()
) {
  const store = configureStore({
    reducer: { tasks: tasksReducer },
  });
  // Dispatch to populate the adapter
  store.dispatch({
    type: "tasks/fetchTasks/fulfilled",
    payload: { items: tasks, page: 1, pageSize: 20, total: tasks.length },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <TaskTable onSelectTask={onSelectTask} selectedTaskId={null} />
      </Provider>
    ),
  };
}

describe("TaskTable interaction", () => {
  const tasks = [
    makeTask({ id: "t1", title: "Alpha Image", type: "image", status: "done" }),
    makeTask({ id: "t2", title: "Beta Audio", type: "audio", status: "in_progress" }),
    makeTask({ id: "t3", title: "Gamma Text", type: "text", status: "todo" }),
  ];

  it("search input filters visible rows", async () => {
    const user = userEvent.setup();
    renderWithStore(tasks);

    const searchInput = screen.getByLabelText("Search tasks");
    await user.type(searchInput, "Alpha");

    const rows = screen.getAllByRole("row");
    // header row + 1 matching data row
    expect(rows).toHaveLength(2);
    expect(screen.getByText("Alpha Image")).toBeInTheDocument();
    expect(screen.queryByText("Beta Audio")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma Text")).not.toBeInTheDocument();
  });

  it("type filter shows only matching types", async () => {
    const user = userEvent.setup();
    renderWithStore(tasks);

    const typeFilter = screen.getByLabelText("Filter by type");
    await user.selectOptions(typeFilter, "audio");

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2); // header + Beta Audio
    expect(screen.getByText("Beta Audio")).toBeInTheDocument();
  });

  it("clicking a row calls onSelectTask", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    renderWithStore(tasks, onSelect);

    await user.click(screen.getByText("Alpha Image"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", title: "Alpha Image" })
    );
  });
});
