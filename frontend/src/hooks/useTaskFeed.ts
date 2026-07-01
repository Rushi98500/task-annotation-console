"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch } from "./useAppStore";
import {
  applyTaskUpdated,
  applyTaskAssigned,
  applyAnnotationCreated,
} from "@/store/tasksSlice";
import { WS_URL } from "@/lib/config";
import { Assignee } from "@/domain/types";

interface WsMessage {
  kind: "task.updated" | "task.assigned" | "annotation.created";
  payload: Record<string, unknown>;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

/**
 * Connects to the WebSocket server and dispatches parsed events into the store.
 * Implements exponential backoff reconnection.
 * Cleans up socket and timers on unmount.
 */
export function useTaskFeed() {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (event: MessageEvent) => {
        // Defensive JSON parsing — malformed frames must not crash
        let msg: WsMessage;
        try {
          msg = JSON.parse(String(event.data)) as WsMessage;
        } catch {
          console.warn("[useTaskFeed] Malformed WS frame:", event.data);
          return;
        }

        if (!msg.kind || !msg.payload) {
          console.warn("[useTaskFeed] WS frame missing kind/payload:", msg);
          return;
        }

        switch (msg.kind) {
          case "task.updated": {
            const p = msg.payload;
            dispatch(
              applyTaskUpdated({
                id: String(p.id ?? ""),
                status: String(p.status ?? ""),
                updatedAt: Number(p.updatedAt) || Date.now(),
              })
            );
            break;
          }
          case "task.assigned": {
            const p = msg.payload;
            const rawAssignee = p.assignee;
            let assignee: Assignee | null = null;
            if (
              rawAssignee !== null &&
              typeof rawAssignee === "object" &&
              "id" in rawAssignee &&
              "name" in rawAssignee
            ) {
              assignee = rawAssignee as Assignee;
            }
            dispatch(
              applyTaskAssigned({
                id: String(p.id ?? ""),
                assignee,
              })
            );
            break;
          }
          case "annotation.created": {
            const p = msg.payload;
            dispatch(
              applyAnnotationCreated({
                taskId: String(p.taskId ?? ""),
                by: String(p.by ?? ""),
                at: Number(p.at) || Date.now(),
              })
            );
            break;
          }
          default:
            console.warn("[useTaskFeed] Unknown WS event kind:", msg.kind);
        }
      };

      ws.onerror = (err) => {
        console.warn("[useTaskFeed] WS error:", err);
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!mountedRef.current) return;
        // Exponential backoff reconnect
        const delay = reconnectDelayRef.current;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      // Close the specific socket created by this effect instance.
      // In React 18 StrictMode dev, the effect mounts→cleanup→mounts;
      // capturing the ref value here ensures we close *this* instance's
      // socket rather than accidentally closing the replacement socket.
      const ws = wsRef.current;
      if (ws) {
        wsRef.current = null;
        ws.close();
      }
    };
  }, [dispatch]);
}
