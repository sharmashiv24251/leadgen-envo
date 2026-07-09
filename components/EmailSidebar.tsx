"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Chip from "@/components/Chip";
import { dateGroupLabel, type Prospect, type ProspectStatus } from "@/lib/data";
import { statusTone } from "@/lib/status";
import { useProspects } from "@/lib/useAccountData";

const STATUS_FILTERS: { value: ProspectStatus; label: string }[] = [
  { value: "DRAFTED", label: "Drafted" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "BOUNCED", label: "Bounced" },
  { value: "RESPONDED", label: "Responded" },
];

function groupByDate(list: Prospect[]): [number, Prospect[]][] {
  const map = new Map<number, Prospect[]>();
  map.set(0, []); // always show "Today" so incoming emails have a home
  for (const prospect of list) {
    if (!map.has(prospect.daysAgo)) map.set(prospect.daysAgo, []);
    map.get(prospect.daysAgo)!.push(prospect);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function parseStatusFilter(raw: string | null): ProspectStatus | null {
  const upper = raw?.toUpperCase();
  return STATUS_FILTERS.find((f) => f.value === upper)?.value ?? null;
}

function StatusFilterBar({ activeStatus }: { activeStatus: ProspectStatus | null }) {
  const pathname = usePathname();

  function filterHref(value: ProspectStatus | null) {
    if (!value) return pathname;
    return `${pathname}?status=${value.toLowerCase()}`;
  }

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
      <Link
        href={filterHref(null)}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeStatus === null
            ? "border-accent/30 bg-accent-dim text-accent"
            : "border-transparent text-ink-muted hover:bg-surface-raised hover:text-ink"
        }`}
      >
        All
      </Link>
      {STATUS_FILTERS.map((f) => {
        const isActive = activeStatus === f.value;
        return (
          <Link
            key={f.value}
            href={filterHref(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-accent/30 bg-accent-dim text-accent"
                : "border-transparent text-ink-muted hover:bg-surface-raised hover:text-ink"
            }`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}

function EmailSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeStatus = parseStatusFilter(searchParams.get("status"));
  const { prospects, loading } = useProspects();

  const filteredProspects = activeStatus
    ? prospects.filter((p) => p.status === activeStatus)
    : prospects;

  const groups = groupByDate(filteredProspects);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  function toggle(daysAgo: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(daysAgo)) next.delete(daysAgo);
      else next.add(daysAgo);
      return next;
    });
  }

  const queryString = activeStatus ? `?status=${activeStatus.toLowerCase()}` : "";

  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-none lg:w-96 lg:border-r lg:border-border">
      <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
        Prospects
        <span className="rounded-full border border-border px-2 py-0.5 text-ink-faint">
          {filteredProspects.length}
        </span>
      </div>

      <StatusFilterBar activeStatus={activeStatus} />

      {loading && (
        <p className="animate-pulse px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
          loading Workenvo data…
        </p>
      )}

      {!loading && groups.map(([daysAgo, group]) => {
        const isCollapsed = collapsed.has(daysAgo);
        return (
          <div key={daysAgo} className="border-b border-border">
            <button
              type="button"
              onClick={() => toggle(daysAgo)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted transition-colors hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                {dateGroupLabel(daysAgo)}
              </span>
              <span className="text-ink-faint">{group.length}</span>
            </button>

            {!isCollapsed && group.length === 0 && (
              <p className="px-4 pb-3 text-xs text-ink-faint">No emails yet</p>
            )}

            {!isCollapsed && group.length > 0 && (
              <ul>
                {group.map((prospect) => {
                  const isSelected = pathname === `/emails/${prospect.id}`;
                  return (
                    <li key={prospect.id} className="border-t border-border">
                      <Link
                        href={`/emails/${prospect.id}${queryString}`}
                        aria-current={isSelected ? "page" : undefined}
                        className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors ${
                          isSelected
                            ? "bg-accent-dim"
                            : "hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink">
                            {prospect.name}
                          </span>
                          <Chip tone={statusTone[prospect.status]}>
                            {prospect.status}
                          </Chip>
                        </div>
                        <span className="truncate text-xs text-ink-muted">
                          {prospect.title} · {prospect.company}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-faint">
                          <span className="truncate">{prospect.subject}</span>
                          {prospect.isDemo && (
                            <>
                              <span aria-hidden>·</span>
                              <span>Demo</span>
                            </>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </aside>
  );
}

export default function EmailSidebar() {
  return (
    <Suspense fallback={<aside className="min-h-0 flex-1 lg:flex-none lg:w-96 lg:border-r lg:border-border" />}>
      <EmailSidebarContent />
    </Suspense>
  );
}
