"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { getAccount, isAuthenticated, revokeAccess, type Account } from "@/lib/auth";

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-US", { hour12: false });
}

// The app's only top-level nav -- DESIGN.md deliberately has no persistent sidebar outside
// /emails, so switching between these three sections lives here instead.
const NAV_TABS: { href: string; label: string; match: (pathname: string) => boolean }[] = [
  { href: "/", label: "Command Center", match: (p) => p === "/" },
  { href: "/emails", label: "Outreach Feed", match: (p) => p.startsWith("/emails") },
  { href: "/funnel", label: "Funnel", match: (p) => p.startsWith("/funnel") },
];

function NavTabs({ pathname }: { pathname: string }) {
  return (
    <div className="hidden items-center gap-1 sm:flex">
      {NAV_TABS.map((tab) => {
        const isActive = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.96] ${
              isActive
                ? "bg-accent-dim text-accent"
                : "text-ink-muted hover:bg-surface-raised hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
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

  async function handleSignOut() {
    await revokeAccess();
    router.push("/login");
  }

  const brandName = account === "workenvo" ? "Workenvo" : "The HR Company";
  const section = NAV_TABS.find((tab) => tab.match(pathname ?? "/"))?.label ?? "Command Center";
  const showBackLink = pathname?.startsWith("/emails");
  const showNav = account !== null && pathname !== "/login";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        {showBackLink && (
          <Link
            href="/"
            className="shrink-0 text-ink-muted transition-colors hover:text-ink active:opacity-60 lg:hidden"
            aria-label="Back to command center"
          >
            ←
          </Link>
        )}
        <span className="flex min-w-0 items-baseline gap-1.5">
          <Link
            href="/"
            className="hidden shrink-0 text-ink-muted transition-colors hover:text-ink active:opacity-60 sm:inline"
          >
            {brandName}
          </Link>
          <span className="hidden shrink-0 text-ink-faint sm:inline" aria-hidden>
            /
          </span>
          <span className="truncate font-medium tracking-tight text-ink sm:hidden">{section}</span>
        </span>
        {showNav && <NavTabs pathname={pathname ?? "/"} />}
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <span
          className="text-xs tabular-nums text-ink-muted"
          suppressHydrationWarning
        >
          {time ?? "--:--:--"}
        </span>
        <ThemeToggle />
        {showNav && (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink active:scale-[0.97]"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
