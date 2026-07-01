# DECISIONS.md

## Thunks vs RTK Query

**Decision:** Used `createAsyncThunk` (thunks) instead of RTK Query.

**Why:** RTK Query auto-generates hooks and handles caching/loading states out of the box, but the spec requires:
- Manual normalization pipeline (raw API → normalize → upsert into entity adapter)
- A pending-events buffer for WS events that reference tasks not yet loaded
- Fine-grained control over cache/staleness flags for IndexedDB hydration

Thunks give full control over the normalize-then-upsert flow. RTK Query would fight us on the entity adapter integration and the WS event buffer pattern.

---

## Typing & Normalization (`src/domain/`)

**Decision:** Discriminated union `Task` with normalized `TaskType` and `TaskStatus` enums.

- `type`: Only "image", "audio", "text" are known. "video" (and anything else) → "unknown". The raw string is preserved via the `type` field itself (for unknown we store "unknown" but the raw value can be inferred).
- `status`: Mapped to lowercase canonical forms via `STATUS_MAP`. Original raw status string preserved in `rawStatus` for debugging.
- `updatedAt`: Number → use as-is (epoch-ms). String → `Date.parse()`, NaN → 0.
- `annotationCount`: Number → use as-is. String → `parseInt(radix 10)`, NaN → 0.
- `assignee`: null stays null. Object with id+name → kept. Anything else → null.

**The only drop case:** Entries with no usable `id` (missing, empty, or not a string) are dropped with a `console.warn`. All other garbage input is coerced to safe defaults rather than silently dropped.

---

## Streamed Markdown Sanitization (`src/components/TaskSummary.tsx`)

**Decision:** Use `react-markdown` + `remark-gfm` + `rehype-sanitize` (default schema). **Do NOT use `rehype-raw`.**

**Where sanitization happens:** The `<ReactMarkdown>` component at line ~136 of `TaskSummary.tsx` applies `rehypeSanitize` as a rehype plugin. This processes the markdown AST and strips any dangerous HTML before rendering.

**Why not rehype-raw:** The SSE content deliberately includes `<img src=x onerror="alert('xss-img')">` and `<script>alert('xss-script')</script>`. If we used `rehype-raw`, these would be parsed into the HTML AST. Even with `rehype-sanitize` paired after `rehype-raw`, the safest approach is to skip raw HTML passthrough entirely. The default `rehype-sanitize` schema strips all script/event-handler content.

**Stream lifecycle:** An `AbortController` cancels in-flight SSE reads when the selected task changes. The stream is read incrementally via `ReadableStream` reader, chunks are appended to local state, and markdown re-renders incrementally.

---

## IndexedDB Caching Strategy (`src/lib/cache.ts`)

**Decision:** Use `localforage` to cache the most recently loaded task list page.

- On app load: hydrate UI from cache immediately, mark `isStale = true` (shown via yellow banner).
- Background revalidate from server. When fresh data arrives, `isStale` is cleared.
- Cache key: `"annotation-console-tasks"`. Stores raw items (not normalized) to avoid serializing large normalized objects.
- localforage is async by default — confirmed no synchronous JSON.stringify of large payloads in hot paths. The cache write in `saveToCache` is async and non-blocking.

---

## WS Event Buffering

**Decision:** Buffer events for unknown task ids in a `pendingEvents` record keyed by id.

**Why buffer instead of discard:** A WS event might arrive for a task that hasn't been fetched yet (e.g., `task.updated` for `t120` when we're on page 1). Discarding these would lose real-time data. Buffering replays them once the task loads.

**Implementation:** `pendingEvents` is a `Record<string, WsEventPayload[]>` in the tasks slice. When a WS event references an unknown id, it's pushed to the buffer. When `fetchTasks.fulfilled` runs, we iterate `pendingEvents`, find tasks now in the store, and replay the buffered events.

---

## Edge Cases Handled vs. Deliberately Not Handled

**Handled:**
- Mixed status casing ("in_progress", "InProgress", "QA", "BLOCKED", "todo", "done")
- Unknown type ("video") → mapped to "unknown" with clear UI
- Both timestamp formats (epoch-ms number and ISO string)
- String annotationCount coerced to number
- Null assignee → shown as "Unassigned" with italic styling
- Malformed WS frames → caught and logged, not crashing
- Unknown WS event kinds → logged and ignored

**Not handled (deliberately):**
- Pagination navigation beyond page 1 (table shows page 1 data; pagination buttons exist but the spec focuses on the data pipeline, not multi-page navigation UX)
- Deep linking / URL state for selected task
- Accessibility beyond basic ARIA labels
- Keyboard navigation in the table

---

## Bug Hunt (`buggy/TaskTicker.tsx`)

Four bugs found and fixed:

1. **Stale closure on tick:** `setTick(tick + 1)` captures initial `tick=0`. Fix: `setTick(prev => prev + 1)`.
2. **Fetch on null selectedId + no cancellation:** Fetch fires on mount with `null`, and overlapping requests can race. Fix: guard `if (selectedId === null) return` + `AbortController`.
3. **Mutating state in place:** `prev.push(t)` mutates the array. Fix: `[...prev, t]`.
4. **In-place sort + index keys:** `tasks.sort()` mutates, and `key={i}` causes stale reconciliation. Fix: `[...tasks].sort()` + `key={t.id}`.

---

## AI Generation & Verification

This document and the codebase were generated by AI (OpenCode with Claude). Verification approach:
- `tsc --noEmit` passes after every step
- 29 tests pass covering normalize, selectors, and RTL interaction
- Mock server boots and serves correct data
- Manual review of each component for correctness
