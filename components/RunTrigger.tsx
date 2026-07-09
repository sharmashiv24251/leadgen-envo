"use client";

import { useEffect, useState } from "react";
import { enqueueRun, fetchLatestRunRequest, type RunRequest } from "@/lib/workenvoData";

const POLL_MS = 5000;

export default function RunTrigger() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<RunRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const r = await fetchLatestRunRequest();
      if (!cancelled) setLatest(r);
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleStart() {
    setSubmitting(true);
    try {
      await enqueueRun(count);
      setOpen(false);
      setLatest(await fetchLatestRunRequest());
    } catch (err) {
      console.error("[RunTrigger] failed to enqueue:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const isActive = latest?.status === "pending" || latest?.status === "running";
  const statusLabel = isActive
    ? `${latest?.status === "pending" ? "Queued" : "Running"} — ${latest?.requested_count} prospect${latest?.requested_count === 1 ? "" : "s"}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          Run outreach ▸
        </button>
      )}

      {open && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <label htmlFor="run-count" className="text-xs text-ink-muted">
            How many?
          </label>
          <input
            id="run-count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-16 rounded-md border border-border bg-bg px-2 py-1 text-sm text-ink outline-none"
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={submitting}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Starting…" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {statusLabel && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs text-ink-muted">
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          {statusLabel}
        </span>
      )}
    </div>
  );
}
