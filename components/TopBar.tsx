"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccount, isAuthenticated, revokeAccess, type Account } from "@/lib/auth";

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-US", { hour12: false });
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    setTime(formatClock(new Date()));
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setAccount(isAuthenticated() ? getAccount() : null);
  }, [pathname]);

  function handleSignOut() {
    revokeAccess();
    router.push("/login");
  }

  const brandName = account === "workenvo" ? "Workenvo" : "thehrcompany";
  const section = pathname?.startsWith("/emails") ? "Outreach Feed" : "Command Center";
  const showBackLink = pathname?.startsWith("/emails");
  const showSignOut = account !== null && pathname !== "/login";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        {showBackLink && (
          <Link
            href="/"
            className="shrink-0 text-ink-muted transition-colors hover:text-ink lg:hidden"
            aria-label="Back to command center"
          >
            ←
          </Link>
        )}
        <span className="flex min-w-0 items-baseline gap-1.5">
          <Link
            href="/"
            className="hidden shrink-0 text-ink-muted transition-colors hover:text-ink sm:inline"
          >
            {brandName}
          </Link>
          <span className="hidden shrink-0 text-ink-faint sm:inline" aria-hidden>
            /
          </span>
          <span className="truncate font-medium tracking-tight text-ink">{section}</span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <span
          className="text-xs tabular-nums text-ink-muted"
          suppressHydrationWarning
        >
          {time ?? "--:--:--"}
        </span>
        {showSignOut && (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
