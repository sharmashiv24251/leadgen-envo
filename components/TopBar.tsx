"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-US", { hour12: false });
}

export default function TopBar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(formatClock(new Date()));
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const showBackLink = pathname?.startsWith("/emails");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        {showBackLink && (
          <>
            <Link
              href="/"
              className="shrink-0 text-ink-muted transition-colors hover:text-ink"
              aria-label="Back to command center"
            >
              <span aria-hidden className="sm:hidden">
                ←
              </span>
              <span className="hidden sm:inline">← Command center</span>
            </Link>
            <span className="shrink-0 text-border-strong" aria-hidden>
              /
            </span>
          </>
        )}
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
            aria-hidden
          />
          <span className="truncate font-medium tracking-tight text-ink">
            thehrcompany
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <span
          className="font-mono text-xs tabular-nums text-ink-faint"
          suppressHydrationWarning
        >
          {time ?? "--:--:--"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs text-ink-muted">
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="hidden text-accent sm:inline">Live</span>
        </span>
      </div>
    </header>
  );
}
