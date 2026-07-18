"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Chip from "@/components/Chip";
import { ProspectRowSkeleton } from "@/components/Skeleton";
import {
  dateGroupLabel,
  parseStatusFilter,
  STATUS_FILTERS,
  type Prospect,
  type ProspectStatus,
} from "@/lib/data";
import { FUNNEL_COLUMNS, parseStageFilter, type FunnelStage } from "@/lib/funnel";
import { statusTone } from "@/lib/status";
import { useProspectsList } from "@/lib/useAccountData";

function groupByDate(list: Prospect[]): [number, Prospect[]][] {
  const map = new Map<number, Prospect[]>();
  map.set(0, []); // always show "Today" so incoming emails have a home
  for (const prospect of list) {
    if (!map.has(prospect.daysAgo)) map.set(prospect.daysAgo, []);
    map.get(prospect.daysAgo)!.push(prospect);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

const SELECT_CLASSES =
  "min-w-0 flex-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent";

function FilterDropdowns({
  activeStatus,
  activeStage,
}: {
  activeStatus: ProspectStatus | null;
  activeStage: FunnelStage | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function buildHref(status: ProspectStatus | null, stage: FunnelStage | null) {
    const params = new URLSearchParams();
    if (status) params.set("status", status.toLowerCase());
    if (stage) params.set("stage", stage);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex gap-2 border-b border-border px-4 py-3">
      <select
        aria-label="Filter by email status"
        value={activeStatus ?? ""}
        onChange={(e) =>
          router.push(buildHref((e.target.value || null) as ProspectStatus | null, activeStage))
        }
        className={SELECT_CLASSES}
      >
        <option value="">All statuses</option>
        {STATUS_FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by funnel stage"
        value={activeStage ?? ""}
        onChange={(e) =>
          router.push(buildHref(activeStatus, (e.target.value || null) as FunnelStage | null))
        }
        className={SELECT_CLASSES}
      >
        <option value="">All stages</option>
        {FUNNEL_COLUMNS.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent ${className}`}
      aria-hidden
    />
  );
}

// Fires fetchNextPage() when the sentinel scrolls into view within the sidebar's own
// scroll container (not the window) -- root is the aside itself, so this works the same
// whether the sidebar is docked beside the detail pane (desktop) or full-width (mobile).
function useInfiniteScrollTrigger(
  containerRef: React.RefObject<HTMLElement | null>,
  sentinelRef: React.RefObject<HTMLDivElement | null>,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: containerRef.current, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [containerRef, sentinelRef, hasNextPage, isFetchingNextPage, fetchNextPage]);
}

function EmailSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeStatus = parseStatusFilter(searchParams.get("status"));
  const activeStage = parseStageFilter(searchParams.get("stage"));
  const { items, loading, isFetchingNextPage, hasNextPage, fetchNextPage } = useProspectsList({
    status: activeStatus,
    stage: activeStage,
  });

  const groups = groupByDate(items);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const asideRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScrollTrigger(asideRef, sentinelRef, hasNextPage, isFetchingNextPage, fetchNextPage);

  function toggle(daysAgo: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(daysAgo)) next.delete(daysAgo);
      else next.add(daysAgo);
      return next;
    });
  }

  const queryParams = new URLSearchParams();
  if (activeStatus) queryParams.set("status", activeStatus.toLowerCase());
  if (activeStage) queryParams.set("stage", activeStage);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return (
    <aside
      ref={asideRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-none lg:w-96 lg:border-r lg:border-border"
    >
      <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface px-4 py-3 text-sm font-medium text-ink">
        Prospects
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
          {items.length}
          {hasNextPage ? "+" : ""}
        </span>
      </div>

      <FilterDropdowns activeStatus={activeStatus} activeStage={activeStage} />

      {loading && (
        <div className="flex flex-col gap-0.5 px-2 pt-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <ProspectRowSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && groups.map(([daysAgo, group]) => {
        const isCollapsed = collapsed.has(daysAgo);
        return (
          <div key={daysAgo} className="border-b border-border pb-1">
            <button
              type="button"
              onClick={() => toggle(daysAgo)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink active:scale-[0.99]"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                {dateGroupLabel(daysAgo)}
              </span>
              <span>{group.length}</span>
            </button>

            {!isCollapsed && group.length === 0 && (
              <p className="px-4 pb-3 text-sm text-ink-muted">No emails yet</p>
            )}

            {!isCollapsed && group.length > 0 && (
              <ul className="flex flex-col gap-0.5 px-2">
                {group.map((prospect) => {
                  const isSelected = pathname === `/emails/${prospect.id}`;
                  return (
                    <li key={prospect.id}>
                      <Link
                        href={`/emails/${prospect.id}${queryString}`}
                        aria-current={isSelected ? "page" : undefined}
                        className={`flex w-full flex-col gap-2 rounded-lg px-3 py-3 text-left transition-colors active:scale-[0.99] ${
                          isSelected ? "bg-accent-strong" : "hover:bg-surface-raised"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm font-medium ${isSelected ? "text-accent-ink" : "text-ink"}`}
                          >
                            {prospect.name}
                          </span>
                          <Chip tone={statusTone[prospect.status]}>
                            {prospect.status}
                          </Chip>
                        </div>
                        <span
                          className={`truncate text-xs ${isSelected ? "text-accent-ink/85" : "text-ink-muted"}`}
                        >
                          {prospect.title} · {prospect.company}
                        </span>
                        <div
                          className={`flex items-center gap-2 text-xs ${isSelected ? "text-accent-ink/72" : "text-ink-muted"}`}
                        >
                          <span className="truncate">{prospect.subject}</span>
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

      {!loading && items.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-ink-muted">No prospects match this filter</p>
      )}

      {!loading && <div ref={sentinelRef} className="h-1 shrink-0" aria-hidden />}

      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 px-4 py-4 text-xs text-ink-muted">
          <Spinner />
          Loading more…
        </div>
      )}

      {!loading && !hasNextPage && items.length > 0 && (
        <p className="px-4 py-4 text-center text-xs text-ink-faint">No more prospects</p>
      )}
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
