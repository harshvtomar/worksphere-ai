"use client";

import { useEffect, useState } from "react";

type State = "checking" | "online" | "offline";

export function ApiStatus() {
  const [status, setStatus] = useState<State>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setStatus("offline");
      controller.abort();
    }, 5000);
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    async function check() {
      try {
        const response = await fetch(`${base}/v1/health`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Health endpoint: ${response.status}`);
        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null || !("status" in payload) || payload.status !== "ok") {
          throw new Error("Unexpected API health response");
        }
        setStatus("online");
      } catch {
        if (!controller.signal.aborted) setStatus("offline");
      } finally {
        clearTimeout(timeout);
      }
    }
    void check();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  return (
    <span className={`api-indicator ${status}`} role="status" aria-live="polite">
      <span className="status-pip" />
      {status === "checking" ? "Checking API" : status === "online" ? "API connected" : "API offline"}
    </span>
  );
}
