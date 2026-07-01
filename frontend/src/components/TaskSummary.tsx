"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Sanitization strategy:
 * - We use rehype-sanitize with its default schema, which strips ALL raw HTML
 *   elements including <script>, <img onerror=...>, and event handler attributes.
 * - We do NOT use rehype-raw, so no raw HTML is parsed into the AST at all.
 * - This is the safest approach: the untrusted SSE content with XSS payloads
 *   (<img src=x onerror=...> and <script>alert(...)</script>) is completely neutralized.
 *
 * Where sanitization happens:
 * - In the <ReactMarkdown> component below, rehypeSanitize plugin processes the
 *   markdown AST and removes any dangerous HTML before rendering.
 */

interface TaskSummaryProps {
  taskId: string;
}

type SummaryState =
  | { status: "idle" }
  | { status: "loading"; content: string }
  | { status: "done"; content: string }
  | { status: "error"; error: string; content: string };

export default function TaskSummary({ taskId }: TaskSummaryProps) {
  const [state, setState] = useState<SummaryState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const currentTaskIdRef = useRef<string>(taskId);

  useEffect(() => {
    // Cancel any in-flight stream when taskId changes
    if (abortRef.current) {
      abortRef.current.abort();
    }

    currentTaskIdRef.current = taskId;

    const controller = new AbortController();
    abortRef.current = controller;

    let content = "";

    async function fetchStream() {
      setState({ status: "loading", content: "" });

      try {
        const res = await fetch(`/api/tasks/${taskId}/summary`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          // Check if this task is still the current one
          if (currentTaskIdRef.current !== taskId) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE frames from the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (currentTaskIdRef.current !== taskId) break;

            if (line.startsWith("data: ")) {
              try {
                const chunk = JSON.parse(line.slice(6));
                content += chunk;
                setState({ status: "loading", content });
              } catch {
                // Skip malformed data lines
              }
            } else if (line.startsWith("event: done")) {
              setState({ status: "done", content });
              return;
            }
          }
        }

        // Stream ended without event: done
        setState({ status: "done", content });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Stream was cancelled due to task switch — do nothing
          return;
        }
        const msg = err instanceof Error ? err.message : "Stream error";
        setState((prev) => ({
          status: "error",
          error: msg,
          content: "content" in prev ? prev.content : "",
        }));
      }
    }

    fetchStream();

    return () => {
      controller.abort();
    };
  }, [taskId]);

  if (state.status === "idle") {
    return <div className="text-gray-400 text-sm">No summary loaded.</div>;
  }

  return (
    <div className="text-sm">
      {state.status === "loading" && (
        <div className="flex items-center gap-2 mb-2 text-blue-600 text-xs">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full" />
          Streaming summary...
        </div>
      )}
      {state.status === "error" && (
        <div className="mb-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {state.error}
        </div>
      )}
      {state.content && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {state.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
