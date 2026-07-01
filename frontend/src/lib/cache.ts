/**
 * IndexedDB caching using localforage.
 *
 * Strategy:
 * - On app load, hydrate UI from cache immediately (mark as stale).
 * - Then revalidate from server in background, clear stale flag when fresh data lands.
 * - Writes are async (localforage is async by default).
 * - We cache the most recently loaded page of task list data.
 */

import localforage from "localforage";
import { normalizeTasks } from "@/domain/normalize";
import { hydrateFromCache, fetchTasks } from "@/store/tasksSlice";
import type { AppDispatch } from "@/store/store";

const CACHE_KEY = "annotation-console-tasks";

interface CachedData {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
  timestamp: number;
}

/**
 * Save task list data to IndexedDB cache.
 * We store the raw items (not normalized) to avoid serializing large normalized objects.
 * localforage handles async writes — no blocking of the main thread.
 */
export async function saveToCache(
  rawItems: unknown[],
  page: number,
  pageSize: number,
  total: number
): Promise<void> {
  const data: CachedData = {
    items: rawItems,
    page,
    pageSize,
    total,
    timestamp: Date.now(),
  };
  await localforage.setItem(CACHE_KEY, data);
}

/**
 * Load from cache and revalidate from server.
 * 1. Check IndexedDB for cached data
 * 2. If found, normalize it and hydrate the store (marking stale)
 * 3. Fetch fresh data from server in background
 * 4. Server fetch will overwrite and clear stale flag
 */
export async function loadFromCacheAndRevalidate(dispatch: AppDispatch): Promise<void> {
  try {
    const cached = await localforage.getItem<CachedData>(CACHE_KEY);
    if (cached && cached.items && Array.isArray(cached.items)) {
      const normalizedItems = normalizeTasks(cached.items);
      dispatch(
        hydrateFromCache({
          items: normalizedItems,
          page: cached.page,
          pageSize: cached.pageSize,
          total: cached.total,
        })
      );
    }
  } catch (err) {
    console.warn("[cache] Failed to load from IndexedDB:", err);
  }

  // Always revalidate from server in background
  try {
    await dispatch(fetchTasks({ page: 1, pageSize: 20 })).unwrap();
  } catch (err) {
    console.warn("[cache] Background revalidation failed:", err);
  }
}
