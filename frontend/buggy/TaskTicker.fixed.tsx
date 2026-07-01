import React, { useEffect, useState, useRef, useCallback } from "react";

type Task = { id: string; title: string; updatedAt: number };

/**
 * Fixed version of TaskTicker.
 *
 * Bugs fixed:
 *
 * Bug 1: Stale closure on tick
 * Root cause: setInterval callback captures the initial `tick` value (0) because
 * the useEffect has no dependency array mentioning `tick`. Every interval fires
 * `setTick(0 + 1)` → always sets tick to 1.
 * Fix: Use functional updater `setTick(prev => prev + 1)` so we always read the
 * latest state without needing tick in the dependency array.
 *
 * Bug 2: Fetch fires on null selectedId on mount and on every reselect without
 *         guarding/cancellation
 * Root cause: The useEffect runs on every selectedId change including the initial
 * null value, causing `fetch(.../null)` which hits a 404. Also, if selectedId
 * changes quickly, multiple fetches overlap and the stale one's response can
 * overwrite the newer one's result.
 * Fix: Guard against null selectedId before fetching, and use an AbortController
 * to cancel the previous in-flight request when selectedId changes.
 *
 * Bug 3: Mutating state in place with prev.push
 * Root cause: `setTasks((prev) => { prev.push(t); return prev; })` mutates the
 * existing array in place. React relies on reference identity to detect changes;
 * since the same array reference is returned, React may skip re-renders, and
 * the mutation affects all code holding a reference to the previous state.
 * Fix: Spread into a new array: `return [...prev, t]` — this creates a new
 * reference so React detects the state change and re-renders correctly.
 *
 * Bug 4: .sort() mutating the array in place combined with array index as key
 * Root cause: `tasks.sort(...)` mutates the tasks array in place (Array.prototype.sort
 * is in-place). Combined with using the array index as the React key (`key={i}`),
 * React cannot properly reconcile items when their order changes — it reuses DOM
 * nodes by index, causing stale UI and incorrect event bindings.
 * Fix: Sort on a copy with `[...tasks].sort(...)` and use stable unique keys
 * (`key={t.id}`) so React can correctly track items across re-renders.
 *
 * Additional note: The tick state is unused in the render output but kept since
 * removing it would be a semantic change beyond bug fixing.
 */

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Bug 1 fix: use functional updater to avoid stale closure
  useEffect(() => {
    const id = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Bug 2 fix: guard null selectedId + abort previous request
  useEffect(() => {
    if (selectedId === null) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`${apiBase}/api/tasks/${selectedId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((t) => {
        // Bug 3 fix: spread into a new array instead of mutating
        setTasks((prev) => [...prev, t]);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch task:", err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedId, apiBase]);

  // Bug 4 fix: sort a copy and use stable keys
  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleClick = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <ul>
      {sorted.map((t) => (
        <li key={t.id} onClick={() => handleClick(t.id)}>
          {t.title} (updated {Math.floor((Date.now() - t.updatedAt) / 1000)}s ago)
        </li>
      ))}
    </ul>
  );
}
