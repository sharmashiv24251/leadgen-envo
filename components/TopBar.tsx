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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3 font-mono text-sm">
        {showBackLink && (
          <>
            <Link
              href="/"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              ← command center
            </Link>
            <span className="text-border-strong" aria-hidden>
              |
            </span>
          </>
        )}
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <span className="tracking-tight text-ink">thehrcompany</span>
          <span className="w-[1ch] text-accent animate-blink" aria-hidden>
            _
          </span>
        </span>
      </div>

      <div className="flex items-center gap-4 font-mono text-xs">
        <span
          className="tabular-nums text-ink-muted"
          suppressHydrationWarning
        >
          {time ?? "--:--:--"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-surface-raised px-2 py-1 uppercase tracking-wider text-[11px] text-ink-muted">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="text-accent">system active</span>
        </span>
      </div>
    </header>
  );
}
